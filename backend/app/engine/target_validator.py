"""
Target validation — ensures we only scan domains the user is explicitly
authorising and that are safe public internet targets.

Rules enforced:
1. Must be a valid FQDN (no raw IPs accepted via the public API).
2. Must not resolve to RFC-1918 / loopback / link-local / CGNAT / multicast addresses.
3. Blocklist of common internal / infrastructure hostnames.
4. Max domain label length and total length validation.
5. Single-label TLDs are rejected (e.g. "localhost", "server1").
"""
from __future__ import annotations

import ipaddress
import re
import socket
from typing import Optional


# ── Hostname validation regex (RFC 1123 relaxed for IDNs) ────────────────────
_FQDN_RE = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$",
    re.IGNORECASE,
)

# ── Private / reserved address ranges ────────────────────────────────────────
_PRIVATE_NETS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),      # loopback
    ipaddress.ip_network("169.254.0.0/16"),   # link-local
    ipaddress.ip_network("100.64.0.0/10"),    # CGNAT
    ipaddress.ip_network("224.0.0.0/4"),      # multicast
    ipaddress.ip_network("240.0.0.0/4"),      # reserved
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 ULA
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
    ipaddress.ip_network("0.0.0.0/8"),        # "this" network
]

# ── Blocked hostname patterns ─────────────────────────────────────────────────
_BLOCKED_PATTERNS = re.compile(
    r"(^localhost$|^.*\.local$|^.*\.internal$|^.*\.corp$|^.*\.lan$"
    r"|^.*\.home$|^.*\.localdomain$|^metadata\.google\.internal$"
    r"|^169\.254\.|^ip-\d+-\d+-\d+-\d+|^ec2-internal|\.ec2\.internal$)",
    re.IGNORECASE,
)

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_DOMAIN_LENGTH = 253
MAX_LABEL_LENGTH = 63


class TargetValidationError(ValueError):
    """Raised when a submitted target fails validation."""


def validate_domain(domain: str) -> str:
    """
    Validate and normalise a domain name submitted for scanning.

    Returns the cleaned domain string on success.
    Raises TargetValidationError with a user-friendly message on failure.
    """
    # 1. Basic sanitisation
    domain = domain.strip().lower()
    # Strip scheme / path if accidentally included
    domain = re.sub(r"^https?://", "", domain)
    domain = domain.split("/")[0].split("?")[0].split("#")[0]
    # Strip port
    if ":" in domain:
        domain = domain.rsplit(":", 1)[0]

    # 2. Length checks
    if len(domain) > MAX_DOMAIN_LENGTH:
        raise TargetValidationError("Domain name is too long (max 253 characters).")
    if not domain:
        raise TargetValidationError("Domain name cannot be empty.")

    # 3. Structure validation
    if not _FQDN_RE.match(domain):
        raise TargetValidationError(
            f"'{domain}' is not a valid public domain name. "
            "Please enter a fully qualified domain (e.g. your-business.com)."
        )

    # Reject single-label names (e.g. "intranet", "server1")
    if "." not in domain:
        raise TargetValidationError("Single-label names are not supported. Enter a full domain (e.g. company.com).")

    # 4. Blocked pattern check (before DNS)
    if _BLOCKED_PATTERNS.search(domain):
        raise TargetValidationError(
            f"'{domain}' appears to be an internal/private hostname and cannot be scanned."
        )

    # 5. DNS resolution + private-range check
    _check_resolves_to_public(domain)

    return domain


def _check_resolves_to_public(domain: str) -> None:
    """
    Resolve the domain and verify every returned address is a public IP.
    Raises TargetValidationError if any address is private/reserved.
    Raises TargetValidationError if the domain does not resolve at all.
    """
    try:
        results = socket.getaddrinfo(domain, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror:
        raise TargetValidationError(
            f"'{domain}' could not be resolved. "
            "Please verify the domain name is correct and publicly accessible."
        )

    if not results:
        raise TargetValidationError(f"'{domain}' returned no DNS records.")

    for info in results:
        addr_str = info[4][0]
        try:
            addr = ipaddress.ip_address(addr_str)
        except ValueError:
            continue  # shouldn't happen, but be safe

        for net in _PRIVATE_NETS:
            if addr in net:
                raise TargetValidationError(
                    f"'{domain}' resolves to a private/internal address ({addr_str}) "
                    "and cannot be scanned via this service."
                )


def safe_target_host(domain: str) -> Optional[str]:
    """
    Lightweight check used inside the scan engine to double-check a target
    before opening a network connection.  Returns the domain if safe, None if not.
    """
    try:
        validate_domain(domain)
        return domain
    except TargetValidationError:
        return None
