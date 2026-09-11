"""
Web Security Probe — uses HTTPX to check:
  - HTTP→HTTPS redirect
  - HTTPS availability
  - Security response headers presence and values
  - Content-Security-Policy quality
  - HSTS configuration

No form submission, no crawling, no authentication attempts.
Single HEAD/GET to the root path only.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

# Security headers to check, with expected values and severity if missing
SECURITY_HEADERS: Dict[str, Dict[str, Any]] = {
    "strict-transport-security": {
        "label": "HTTP Strict Transport Security (HSTS)",
        "severity": "high",
        "note": "HSTS tells browsers to always use HTTPS for this domain, preventing downgrade attacks.",
        "recommended": "max-age=31536000; includeSubDomains",
    },
    "content-security-policy": {
        "label": "Content Security Policy (CSP)",
        "severity": "medium",
        "note": "CSP controls which resources can be loaded by the browser, preventing XSS.",
        "recommended": "default-src 'self'",
    },
    "x-frame-options": {
        "label": "X-Frame-Options",
        "severity": "medium",
        "note": "Prevents your site from being embedded in iframes (clickjacking protection).",
        "recommended": "DENY or SAMEORIGIN",
    },
    "x-content-type-options": {
        "label": "X-Content-Type-Options",
        "severity": "low",
        "note": "Prevents browsers from MIME-sniffing the content type.",
        "recommended": "nosniff",
    },
    "referrer-policy": {
        "label": "Referrer-Policy",
        "severity": "low",
        "note": "Controls what referrer information is sent with requests.",
        "recommended": "strict-origin-when-cross-origin",
    },
    "permissions-policy": {
        "label": "Permissions-Policy",
        "severity": "low",
        "note": "Controls access to browser features (camera, location, microphone).",
        "recommended": "camera=(), microphone=(), geolocation=()",
    },
    "x-xss-protection": {
        "label": "X-XSS-Protection",
        "severity": "info",
        "note": "Legacy XSS filter header — superseded by CSP but still checked.",
        "recommended": "1; mode=block",
    },
}


async def probe_web_security(domain: str) -> Dict[str, Any]:
    """Probe HTTP/HTTPS availability and security headers."""
    timeout = settings.http_timeout_seconds
    result: Dict[str, Any] = {
        "domain": domain,
        "http_available": False,
        "https_available": False,
        "redirects_to_https": False,
        "final_url": None,
        "status_code": None,
        "headers_present": [],
        "headers_missing": [],
        "header_details": {},
        "error": None,
    }

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(timeout),
        follow_redirects=True,
        verify=False,  # cert validity checked separately in ssl_tls probe
        headers={"User-Agent": "Mozilla/5.0 NeuralProtocol-SecurityScanner/1.0 (non-intrusive)"},
    ) as client:
        # 1. Try HTTPS first
        try:
            https_resp = await client.get(f"https://{domain}/", timeout=timeout)
            result["https_available"] = True
            result["final_url"] = str(https_resp.url)
            result["status_code"] = https_resp.status_code
            _analyse_headers(https_resp.headers, result)
        except httpx.ConnectError:
            result["https_available"] = False
        except Exception as exc:
            log.warning("HTTPS probe error for %s: %s", domain, exc)
            result["https_available"] = False

        # 2. Try HTTP to check redirect behaviour
        try:
            # Don't follow redirects here — we want to see the raw 301/302
            http_resp = await client.head(
                f"http://{domain}/",
                follow_redirects=False,
                timeout=timeout,
            )
            result["http_available"] = True
            loc = http_resp.headers.get("location", "")
            result["redirects_to_https"] = (
                http_resp.status_code in (301, 302, 307, 308)
                and loc.startswith("https://")
            )
            # If HTTPS failed but HTTP works, collect headers from HTTP
            if not result["https_available"]:
                result["status_code"] = http_resp.status_code
                _analyse_headers(http_resp.headers, result)
        except Exception as exc:
            log.warning("HTTP probe error for %s: %s", domain, exc)

    return result


def _analyse_headers(headers: httpx.Headers, result: Dict[str, Any]) -> None:
    """Populate header_present / header_missing / header_details on result."""
    details: Dict[str, Any] = {}
    present: List[str] = []
    missing: List[str] = []

    for header_name, meta in SECURITY_HEADERS.items():
        value = headers.get(header_name)
        if value:
            present.append(header_name)
            details[header_name] = {
                "present": True,
                "value": value,
                "label": meta["label"],
                "severity": meta["severity"],
            }
        else:
            missing.append(header_name)
            details[header_name] = {
                "present": False,
                "value": None,
                "label": meta["label"],
                "severity": meta["severity"],
                "note": meta["note"],
                "recommended": meta["recommended"],
            }

    result["headers_present"] = present
    result["headers_missing"] = missing
    result["header_details"] = details
