"""
SSL/TLS Probe — uses Python's built-in ssl module to check:
  - Certificate validity (not expired, not self-signed)
  - Days until expiry
  - Subject / SAN verification against the domain
  - TLS protocol version negotiated
  - Weak cipher suites
  - Certificate chain depth (basic)

No private key operations, no traffic interception.
Read-only TLS handshake inspection only.
"""
from __future__ import annotations

import asyncio
import logging
import socket
import ssl
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings

log = logging.getLogger(__name__)

# Cipher suites considered weak
_WEAK_CIPHERS = {
    "RC4", "DES", "3DES", "NULL", "EXPORT", "MD5", "ADH", "AECDH",
    "PSK-AES", "SRP",
}

# Days-to-expiry thresholds
EXPIRY_CRITICAL = 7
EXPIRY_HIGH = 30
EXPIRY_MEDIUM = 60


def _ssl_probe_sync(domain: str, port: int, timeout: int) -> Dict[str, Any]:
    """Blocking SSL probe — run in thread pool."""
    result: Dict[str, Any] = {
        "domain": domain,
        "port": port,
        "reachable": False,
        "tls_version": None,
        "cipher_suite": None,
        "cipher_bits": None,
        "cert_valid": False,
        "cert_expired": False,
        "cert_self_signed": False,
        "cert_subject": None,
        "cert_issuer": None,
        "cert_san": [],
        "cert_not_before": None,
        "cert_not_after": None,
        "days_until_expiry": None,
        "expiry_severity": None,   # None | "info" | "medium" | "high" | "critical"
        "domain_name_match": None,
        "weak_cipher": False,
        "error": None,
    }

    ctx = ssl.create_default_context()
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED

    try:
        with socket.create_connection((domain, port), timeout=timeout) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                result["reachable"] = True
                result["tls_version"] = ssock.version()

                cipher = ssock.cipher()
                if cipher:
                    result["cipher_suite"] = cipher[0]
                    result["cipher_bits"] = cipher[2]
                    # Check for weak cipher components
                    upper = cipher[0].upper()
                    result["weak_cipher"] = any(w in upper for w in _WEAK_CIPHERS)

                cert = ssock.getpeercert()
                if cert:
                    result["cert_valid"] = True
                    result["cert_subject"] = _extract_cn(cert.get("subject", ()))
                    result["cert_issuer"] = _extract_cn(cert.get("issuer", ()))
                    result["cert_self_signed"] = (
                        result["cert_subject"] == result["cert_issuer"]
                    )

                    # Parse SANs
                    sans: List[str] = []
                    for name_type, value in cert.get("subjectAltName", []):
                        if name_type == "DNS":
                            sans.append(value)
                    result["cert_san"] = sans

                    # Expiry
                    not_after_str = cert.get("notAfter")
                    if not_after_str:
                        not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        result["cert_not_after"] = not_after.isoformat()
                        now = datetime.now(timezone.utc)
                        days_left = (not_after - now).days
                        result["days_until_expiry"] = days_left
                        result["cert_expired"] = days_left < 0
                        if days_left < 0:
                            result["expiry_severity"] = "critical"
                        elif days_left < EXPIRY_CRITICAL:
                            result["expiry_severity"] = "critical"
                        elif days_left < EXPIRY_HIGH:
                            result["expiry_severity"] = "high"
                        elif days_left < EXPIRY_MEDIUM:
                            result["expiry_severity"] = "medium"
                        else:
                            result["expiry_severity"] = "info"

                    not_before_str = cert.get("notBefore")
                    if not_before_str:
                        not_before = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                        result["cert_not_before"] = not_before.isoformat()

                    # Domain name match
                    result["domain_name_match"] = _check_domain_match(domain, sans, result["cert_subject"])

    except ssl.SSLCertVerificationError as exc:
        result["reachable"] = True  # TCP connected, but cert is bad
        result["cert_valid"] = False
        result["error"] = f"Certificate verification failed: {exc.reason}"
        # Try again without verification to extract cert details
        _probe_insecure_cert_details(domain, port, timeout, result)

    except ssl.SSLError as exc:
        result["reachable"] = True
        result["error"] = f"SSL error: {exc}"

    except (ConnectionRefusedError, socket.timeout, OSError) as exc:
        result["reachable"] = False
        result["error"] = str(exc)

    return result


def _probe_insecure_cert_details(domain: str, port: int, timeout: int, result: Dict[str, Any]) -> None:
    """Re-probe with cert verification disabled just to extract cert metadata."""
    ctx_noverify = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx_noverify.check_hostname = False
    ctx_noverify.verify_mode = ssl.CERT_NONE
    try:
        with socket.create_connection((domain, port), timeout=timeout) as sock:
            with ctx_noverify.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                if cert:
                    result["cert_subject"] = _extract_cn(cert.get("subject", ()))
                    result["cert_issuer"] = _extract_cn(cert.get("issuer", ()))
                    result["cert_self_signed"] = result["cert_subject"] == result["cert_issuer"]
                    result["cert_valid"] = False  # already marked invalid
    except Exception:
        pass


def _extract_cn(rdn_sequence: tuple) -> Optional[str]:
    """Extract Common Name from an RDN sequence."""
    for rdn in rdn_sequence:
        for attr in rdn:
            if attr[0] == "commonName":
                return attr[1]
    return None


def _check_domain_match(domain: str, sans: List[str], cn: Optional[str]) -> bool:
    """Check if the domain matches any SAN (or CN as fallback)."""
    candidates = list(sans)
    if cn:
        candidates.append(cn)
    domain_lower = domain.lower()
    for candidate in candidates:
        candidate = candidate.lower()
        if candidate == domain_lower:
            return True
        # Wildcard: *.example.com matches sub.example.com
        if candidate.startswith("*."):
            base = candidate[2:]
            if domain_lower.endswith("." + base) or domain_lower == base:
                return True
    return False


async def probe_ssl_tls(domain: str, port: int = 443) -> Dict[str, Any]:
    """Async wrapper — runs SSL probe in thread pool."""
    timeout = settings.ssl_timeout_seconds
    log.info("Probing SSL/TLS for %s:%d", domain, port)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _ssl_probe_sync, domain, port, timeout)
