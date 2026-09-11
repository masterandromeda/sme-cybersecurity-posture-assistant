"""
Exposed Services Probe — uses python-nmap to safely discover open TCP ports
and identify running services on the target domain.

Scan policy (non-destructive):
  - SYN scan (-sS) or connect scan (-sT) depending on privileges
  - Only the IANA common ports list (not full range)
  - No version-intensive probes (-sV light only)
  - Hard timeout enforced
  - No exploitation, no banner grabbing beyond nmap's passive detection
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

log = logging.getLogger(__name__)

# Common ports relevant to SME security posture
# (reduced from full 65535 range to minimise scan time and intrusiveness)
SCAN_PORTS = (
    "21,22,23,25,53,80,110,143,443,445,465,587,993,995,"
    "1433,1521,3306,3389,5432,5900,6379,8080,8443,8888,27017"
)

# Ports that are considered noteworthy / risky when exposed
RISKY_PORTS: Dict[int, Dict[str, str]] = {
    21:    {"service": "FTP",           "risk": "high",   "note": "Unencrypted file transfer; credentials sent in plaintext"},
    22:    {"service": "SSH",           "risk": "medium", "note": "Remote shell access — should be restricted by IP allowlist"},
    23:    {"service": "Telnet",        "risk": "critical","note": "Completely unencrypted remote access protocol"},
    25:    {"service": "SMTP",          "risk": "medium", "note": "Open SMTP relay can enable spam and phishing abuse"},
    445:   {"service": "SMB",           "risk": "high",   "note": "Windows file sharing — frequently exploited; should not be internet-facing"},
    1433:  {"service": "MSSQL",         "risk": "high",   "note": "Database port exposed to internet"},
    1521:  {"service": "Oracle DB",     "risk": "high",   "note": "Database port exposed to internet"},
    3306:  {"service": "MySQL",         "risk": "high",   "note": "Database port exposed to internet"},
    3389:  {"service": "RDP",           "risk": "high",   "note": "Windows Remote Desktop — frequently brute-forced"},
    5432:  {"service": "PostgreSQL",    "risk": "high",   "note": "Database port exposed to internet"},
    5900:  {"service": "VNC",           "risk": "high",   "note": "Remote desktop control — often poorly secured"},
    6379:  {"service": "Redis",         "risk": "critical","note": "Redis is commonly misconfigured with no authentication"},
    8080:  {"service": "HTTP-alt",      "risk": "low",    "note": "Alternate HTTP port — may expose admin interfaces"},
    27017: {"service": "MongoDB",       "risk": "critical","note": "MongoDB often exposed with no authentication"},
}


def _run_nmap_sync(host: str, ports: str, timeout: int) -> Optional[Dict[str, Any]]:
    """
    Blocking nmap wrapper — run in a thread pool to avoid blocking the event loop.
    Returns raw nmap scan result dict or None on error.
    """
    try:
        import nmap  # type: ignore
    except ImportError:
        log.warning("python-nmap not installed; skipping port scan")
        return None

    scanner = nmap.PortScanner()
    try:
        # -sT = TCP connect (no root required), --open = only show open ports
        # -T3 = normal timing (not aggressive), --host-timeout limits total scan
        args = f"-sT -T3 --open -p {ports} --host-timeout {timeout}s"
        scanner.scan(hosts=host, arguments=args)
        return scanner[host] if host in scanner.all_hosts() else {}
    except Exception as exc:
        log.warning("nmap scan error for %s: %s", host, exc)
        return None


async def probe_exposed_services(domain: str) -> Dict[str, Any]:
    """
    Async wrapper around the nmap probe.
    Returns a structured evidence dict.
    """
    timeout = settings.nmap_timeout_seconds
    log.info("Probing exposed services on %s (ports: %s)", domain, SCAN_PORTS)

    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _run_nmap_sync, domain, SCAN_PORTS, timeout)

    open_ports: List[Dict[str, Any]] = []
    risky_ports_found: List[Dict[str, Any]] = []

    if raw and "tcp" in raw:
        for port_num, port_data in raw["tcp"].items():
            if port_data.get("state") != "open":
                continue
            entry = {
                "port": port_num,
                "protocol": "tcp",
                "state": port_data.get("state", "open"),
                "service": port_data.get("name", "unknown"),
                "product": port_data.get("product", ""),
                "version": port_data.get("version", ""),
            }
            open_ports.append(entry)

            if port_num in RISKY_PORTS:
                risk_info = RISKY_PORTS[port_num]
                risky_ports_found.append({
                    **entry,
                    "risk": risk_info["risk"],
                    "note": risk_info["note"],
                })

    return {
        "scan_completed": raw is not None,
        "host": domain,
        "open_ports": open_ports,
        "risky_ports": risky_ports_found,
        "total_open": len(open_ports),
        "total_risky": len(risky_ports_found),
    }
