"""
DNS & Email Security Probe — uses dnspython to inspect:
  - SPF record (TXT _spf or root domain)
  - DMARC record (TXT _dmarc.<domain>)
  - DKIM selector discovery (common selector names)
  - DNSSEC delegation check (DS/DNSKEY records)
  - MX record presence
  - Subdomain enumeration is intentionally NOT performed.

All lookups are read-only DNS queries — no network connections to mail servers.
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Dict, List, Optional

import dns.resolver
import dns.exception

from app.core.config import settings

log = logging.getLogger(__name__)

# Common DKIM selectors to check (passive probe — no brute force)
_DKIM_SELECTORS = [
    "default", "google", "mail", "email", "smtp", "k1", "k2",
    "selector1", "selector2", "dkim", "mx", "s1", "s2",
]

_SPF_RE = re.compile(r"^v=spf1\s", re.IGNORECASE)
_DMARC_RE = re.compile(r"^v=DMARC1\s*;", re.IGNORECASE)


def _resolve_txt(name: str, timeout: int) -> List[str]:
    """Return all TXT string values for a DNS name, or empty list."""
    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout
    try:
        answers = resolver.resolve(name, "TXT")
        results = []
        for rdata in answers:
            for string in rdata.strings:
                results.append(string.decode("utf-8", errors="replace"))
        return results
    except (dns.exception.DNSException, Exception):
        return []


def _resolve_mx(domain: str, timeout: int) -> List[str]:
    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout
    try:
        answers = resolver.resolve(domain, "MX")
        return [str(r.exchange).rstrip(".") for r in answers]
    except Exception:
        return []


def _has_dnssec(domain: str, timeout: int) -> bool:
    """Check for DS record in the parent zone (simplistic delegation check)."""
    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout
    try:
        resolver.resolve(domain, "DS")
        return True
    except Exception:
        return False


def _find_dkim(domain: str, timeout: int) -> Optional[Dict[str, Any]]:
    """
    Check common DKIM selectors.  Returns first match found or None.
    This is a passive check only — we probe a short list of common selector names.
    """
    for selector in _DKIM_SELECTORS:
        name = f"{selector}._domainkey.{domain}"
        txts = _resolve_txt(name, timeout)
        for txt in txts:
            if "v=DKIM1" in txt or "k=rsa" in txt or "p=" in txt:
                return {
                    "selector": selector,
                    "record": txt[:300],   # truncate for storage
                    "has_public_key": "p=" in txt and "p=;" not in txt,
                }
    return None


def _probe_dns_email_sync(domain: str, timeout: int) -> Dict[str, Any]:
    """Synchronous DNS/email probe — run in a thread pool."""
    result: Dict[str, Any] = {
        "domain": domain,
        "spf": None,
        "spf_present": False,
        "spf_valid": False,
        "spf_all_policy": None,
        "dmarc": None,
        "dmarc_present": False,
        "dmarc_policy": None,
        "dmarc_pct": None,
        "dkim_found": None,
        "mx_records": [],
        "has_mx": False,
        "dnssec_enabled": False,
    }

    # ── SPF ───────────────────────────────────────────────────────────────
    root_txts = _resolve_txt(domain, timeout)
    for txt in root_txts:
        if _SPF_RE.match(txt):
            result["spf_present"] = True
            result["spf"] = txt
            # Extract -all / ~all / +all / ?all directive
            match = re.search(r"([+-~?])all", txt, re.IGNORECASE)
            if match:
                result["spf_all_policy"] = match.group(0).lower()
            result["spf_valid"] = bool(match and match.group(1) in ("-", "~"))
            break

    # ── DMARC ─────────────────────────────────────────────────────────────
    dmarc_txts = _resolve_txt(f"_dmarc.{domain}", timeout)
    for txt in dmarc_txts:
        if _DMARC_RE.match(txt):
            result["dmarc_present"] = True
            result["dmarc"] = txt
            # Extract p= tag
            p_match = re.search(r"p=(\w+)", txt, re.IGNORECASE)
            if p_match:
                result["dmarc_policy"] = p_match.group(1).lower()
            # Extract pct= tag
            pct_match = re.search(r"pct=(\d+)", txt, re.IGNORECASE)
            if pct_match:
                result["dmarc_pct"] = int(pct_match.group(1))
            break

    # ── DKIM ──────────────────────────────────────────────────────────────
    result["dkim_found"] = _find_dkim(domain, timeout)

    # ── MX ────────────────────────────────────────────────────────────────
    mx = _resolve_mx(domain, timeout)
    result["mx_records"] = mx
    result["has_mx"] = len(mx) > 0

    # ── DNSSEC ────────────────────────────────────────────────────────────
    result["dnssec_enabled"] = _has_dnssec(domain, timeout)

    return result


async def probe_dns_email(domain: str) -> Dict[str, Any]:
    """Async wrapper — runs DNS probes in a thread pool."""
    timeout = settings.dns_timeout_seconds
    log.info("Probing DNS/email security for %s", domain)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _probe_dns_email_sync, domain, timeout)
