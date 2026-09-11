"""
Finding Engine — translates raw probe evidence into structured security findings.

Each probe returns a Dict of evidence. This module converts that into
Finding records with:
  - category / severity / confidence
  - plain-language title, business impact, what_we_found, why_it_matters
  - technical_details (collapsible in the UI)
  - tags
  - affected_asset

The engine is intentionally conservative: it only raises findings that
have direct, unambiguous evidence from the probe data.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

log = logging.getLogger(__name__)


@dataclass
class RawFinding:
    """Intermediate finding before DB insertion."""
    category: str
    severity: str                     # critical / high / medium / low / info
    title: str                        # plain-language title
    technical_title: str
    business_impact: str
    what_we_found: str
    why_it_matters: str
    technical_details: str
    affected_asset: str
    asset_type: str                   # domain / ip / email
    evidence: Dict[str, Any]
    confidence: str = "high"
    tags: List[str] = field(default_factory=list)
    cve: str | None = None
    cvss: float | None = None


# ── Exposed Services findings ─────────────────────────────────────────────────

def findings_from_exposed_services(evidence: Dict[str, Any], domain: str) -> List[RawFinding]:
    findings: List[RawFinding] = []

    if not evidence.get("scan_completed"):
        return findings

    for port_info in evidence.get("risky_ports", []):
        port = port_info["port"]
        service = port_info["service"]
        risk = port_info["risk"]
        note = port_info["note"]

        # Compose plain-language title based on risk level
        if risk == "critical":
            plain_title = f"Dangerous service '{service}' openly accessible from the internet"
        elif risk == "high":
            plain_title = f"High-risk service '{service}' exposed on port {port}"
        else:
            plain_title = f"Service '{service}' visible on port {port}"

        findings.append(RawFinding(
            category="exposed_services",
            severity=risk,
            title=plain_title,
            technical_title=f"Open port {port}/tcp — {service}",
            business_impact=(
                f"This service ({service}) on port {port} is reachable by anyone on the internet. "
                f"{note} Attackers regularly scan for these ports and attempt to exploit them."
            ),
            what_we_found=(
                f"Port {port} ({service}) is open and responding on your server."
            ),
            why_it_matters=(
                "Internet-facing services are the most common entry point for attackers. "
                "Each unnecessary exposed service increases your attack surface."
            ),
            technical_details=(
                f"Port: {port}/tcp\n"
                f"Service: {service}\n"
                f"Product: {port_info.get('product', 'unknown')}\n"
                f"Version: {port_info.get('version', 'unknown')}\n"
                f"Risk note: {note}"
            ),
            affected_asset=domain,
            asset_type="domain",
            evidence=port_info,
            confidence="high",
            tags=["exposed-service", service.lower().replace(" ", "-"), f"port-{port}"],
        ))

    return findings


# ── Web Security findings ─────────────────────────────────────────────────────

def findings_from_web_security(evidence: Dict[str, Any], domain: str) -> List[RawFinding]:
    findings: List[RawFinding] = []

    # HTTP → HTTPS redirect missing
    if evidence.get("http_available") and not evidence.get("redirects_to_https"):
        findings.append(RawFinding(
            category="security_headers",
            severity="high",
            title="Your website does not force HTTPS — unencrypted connections are allowed",
            technical_title="Missing HTTP → HTTPS redirect",
            business_impact=(
                "Visitors who type your domain into a browser without 'https://' "
                "will get an unencrypted connection. Any data they submit — passwords, "
                "contact forms, payment details — can be intercepted."
            ),
            what_we_found="Your website responds on HTTP without redirecting to HTTPS.",
            why_it_matters=(
                "HTTPS encrypts traffic between the browser and your server. "
                "Without forced HTTPS, sensitive information can be intercepted by anyone "
                "on the same network (coffee shops, shared offices, etc.)."
            ),
            technical_details=(
                f"HTTP responded with status: {evidence.get('status_code')}\n"
                "Expected: 301/302 redirect to https://"
            ),
            affected_asset=f"http://{domain}",
            asset_type="domain",
            evidence={"http_status": evidence.get("status_code"), "location": evidence.get("final_url")},
            tags=["https", "transport-security", "redirect"],
        ))

    # Missing security headers
    header_meta = {
        "strict-transport-security": ("high", "HSTS not configured — browsers may connect over HTTP"),
        "content-security-policy":   ("medium", "Content Security Policy (CSP) missing"),
        "x-frame-options":           ("medium", "X-Frame-Options missing — clickjacking risk"),
        "x-content-type-options":    ("low", "X-Content-Type-Options missing"),
        "referrer-policy":           ("low", "Referrer-Policy not configured"),
        "permissions-policy":        ("low", "Permissions-Policy not configured"),
    }

    for header, (severity, tech_title) in header_meta.items():
        detail = evidence.get("header_details", {}).get(header, {})
        if not detail.get("present"):
            label = detail.get("label", header)
            note = detail.get("note", "")
            recommended = detail.get("recommended", "")
            findings.append(RawFinding(
                category="security_headers",
                severity=severity,
                title=f"Your website is missing the '{label}' security setting",
                technical_title=tech_title,
                business_impact=(
                    f"The {label} header is missing from your website's responses. {note}"
                ),
                what_we_found=f"The HTTP response header '{header}' was not present.",
                why_it_matters=(
                    f"Security headers instruct browsers on how to handle your website's content safely. "
                    f"{note}"
                ),
                technical_details=(
                    f"Header: {header}\n"
                    f"Present: No\n"
                    f"Recommended value: {recommended}"
                ),
                affected_asset=f"https://{domain}",
                asset_type="domain",
                evidence={"header": header, "present": False, "recommended": recommended},
                confidence="high",
                tags=["security-headers", header, "web-security"],
            ))

    return findings


# ── DNS / Email findings ──────────────────────────────────────────────────────

def findings_from_dns_email(evidence: Dict[str, Any], domain: str) -> List[RawFinding]:
    findings: List[RawFinding] = []

    # Missing SPF
    if not evidence.get("spf_present"):
        findings.append(RawFinding(
            category="email_security",
            severity="high",
            title="Your business email can be spoofed — SPF record is missing",
            technical_title="SPF record not found",
            business_impact=(
                "Anyone on the internet can send emails that appear to come from your company's domain. "
                "This enables phishing attacks against your customers, suppliers, and partners."
            ),
            what_we_found="No SPF (Sender Policy Framework) DNS record was found for your domain.",
            why_it_matters=(
                "SPF is a DNS record that tells email servers which mail servers are allowed to send "
                "email on behalf of your domain. Without it, your domain identity is completely unprotected."
            ),
            technical_details=f"DNS TXT query for '{domain}' returned no SPF record (v=spf1...).",
            affected_asset=domain,
            asset_type="email",
            evidence={"spf_present": False, "domain": domain},
            tags=["email-security", "spf", "spoofing"],
        ))
    elif evidence.get("spf_all_policy") in ("+all", "?all", None):
        # SPF present but too permissive
        policy = evidence.get("spf_all_policy", "unknown")
        findings.append(RawFinding(
            category="email_security",
            severity="medium",
            title="Your email SPF record is too permissive — spoofing is still possible",
            technical_title=f"SPF record uses weak policy ({policy})",
            business_impact=(
                "Your SPF record exists but uses a policy that does not actively block "
                "spoofed emails. Attackers may still be able to send emails pretending to be your business."
            ),
            what_we_found=f"SPF record found but uses a permissive policy: {policy}",
            why_it_matters=(
                "The SPF ~all (softfail) or +all (pass) policy does not tell receiving mail servers "
                "to reject spoofed emails. Use '-all' (fail) to block them."
            ),
            technical_details=f"SPF record: {evidence.get('spf', '')}\nPolicy directive: {policy}",
            affected_asset=domain,
            asset_type="email",
            evidence=evidence,
            confidence="high",
            tags=["email-security", "spf", "spoofing", "misconfiguration"],
        ))

    # Missing DMARC
    if not evidence.get("dmarc_present"):
        findings.append(RawFinding(
            category="email_security",
            severity="high",
            title="DMARC policy is missing — spoofed emails are not being blocked",
            technical_title="DMARC record not found",
            business_impact=(
                "Without DMARC, even if SPF/DKIM records exist, receiving mail servers won't "
                "take consistent action against spoofed emails. This leaves your customers "
                "vulnerable to phishing emails appearing to come from you."
            ),
            what_we_found="No DMARC record found at _dmarc." + domain,
            why_it_matters=(
                "DMARC builds on SPF and DKIM to tell receiving mail servers what to do with "
                "emails that fail authentication: quarantine them or reject them outright."
            ),
            technical_details=f"DNS TXT query for '_dmarc.{domain}' returned no DMARC record.",
            affected_asset=domain,
            asset_type="email",
            evidence={"dmarc_present": False},
            tags=["email-security", "dmarc", "spoofing"],
        ))
    elif evidence.get("dmarc_policy") == "none":
        findings.append(RawFinding(
            category="email_security",
            severity="medium",
            title="DMARC policy is set to monitoring only — spoofed emails are not blocked",
            technical_title="DMARC policy=none (monitoring only)",
            business_impact=(
                "Your DMARC record is set to 'p=none', which means email servers only report "
                "violations but do not reject or quarantine spoofed emails. Attackers can still "
                "send phishing emails that appear to come from your domain."
            ),
            what_we_found=f"DMARC record found but uses p=none policy: {evidence.get('dmarc', '')}",
            why_it_matters=(
                "DMARC p=none is a monitoring-only mode. To protect your brand and customers "
                "you should move to p=quarantine or p=reject."
            ),
            technical_details=f"DMARC record: {evidence.get('dmarc', '')}\nPolicy: none",
            affected_asset=domain,
            asset_type="email",
            evidence=evidence,
            tags=["email-security", "dmarc", "misconfiguration"],
        ))

    # DNSSEC not enabled
    if not evidence.get("dnssec_enabled"):
        findings.append(RawFinding(
            category="domain_security",
            severity="low",
            title="DNSSEC is not enabled for your domain",
            technical_title="DNSSEC not configured (no DS record)",
            business_impact=(
                "Without DNSSEC, attackers can potentially redirect your domain's traffic "
                "through DNS cache poisoning attacks (sending visitors to a fake version of your site)."
            ),
            what_we_found="No DNSSEC delegation (DS record) found in the parent DNS zone.",
            why_it_matters=(
                "DNSSEC adds cryptographic signatures to DNS records, preventing them from being "
                "tampered with by attackers. It is especially important for domains handling payments or logins."
            ),
            technical_details=f"DS record query for '{domain}' returned NXDOMAIN or NOERROR with empty response.",
            affected_asset=domain,
            asset_type="domain",
            evidence={"dnssec_enabled": False},
            confidence="high",
            tags=["domain-security", "dnssec", "dns"],
        ))

    return findings


# ── SSL/TLS findings ──────────────────────────────────────────────────────────

def findings_from_ssl_tls(evidence: Dict[str, Any], domain: str) -> List[RawFinding]:
    findings: List[RawFinding] = []

    # HTTPS not reachable at all
    if not evidence.get("reachable"):
        findings.append(RawFinding(
            category="ssl_tls",
            severity="critical",
            title="Your website does not support HTTPS — no encryption in use",
            technical_title="HTTPS not available (port 443 unreachable)",
            business_impact=(
                "All data exchanged between your visitors and your website is transmitted "
                "in plaintext and can be read by any attacker on the network path."
            ),
            what_we_found="Port 443 (HTTPS) is not open or not responding on your server.",
            why_it_matters=(
                "HTTPS is a baseline security requirement. Browsers now show 'Not Secure' warnings "
                "for HTTP-only sites. Search engines may also penalise non-HTTPS sites."
            ),
            technical_details=f"Connection error on {domain}:443 — {evidence.get('error', 'no response')}",
            affected_asset=f"https://{domain}",
            asset_type="domain",
            evidence=evidence,
            tags=["ssl", "tls", "https", "encryption"],
        ))
        return findings

    # Certificate invalid / verification failed
    if not evidence.get("cert_valid"):
        findings.append(RawFinding(
            category="ssl_tls",
            severity="critical",
            title="Your website's security certificate is invalid or untrusted",
            technical_title="SSL certificate verification failed",
            business_impact=(
                "Browsers will show a security warning to all visitors, causing them to "
                "distrust your site. Payment processors and partners may refuse to connect."
            ),
            what_we_found=f"SSL certificate validation failed: {evidence.get('error', 'unknown error')}",
            why_it_matters=(
                "An invalid certificate means the encrypted connection cannot be trusted. "
                "Visitors may be connecting to a different server without knowing it."
            ),
            technical_details=(
                f"Error: {evidence.get('error')}\n"
                f"Subject: {evidence.get('cert_subject')}\n"
                f"Issuer: {evidence.get('cert_issuer')}"
            ),
            affected_asset=f"https://{domain}",
            asset_type="domain",
            evidence=evidence,
            tags=["ssl", "certificate", "invalid"],
        ))

    # Certificate expiry
    expiry_severity = evidence.get("expiry_severity")
    days = evidence.get("days_until_expiry")
    if expiry_severity in ("critical", "high", "medium"):
        if evidence.get("cert_expired"):
            title = "Your website's SSL certificate has expired"
            impact = "Your website is showing security errors to all visitors. Browsers block access to sites with expired certificates."
            found = "The SSL certificate has expired (days remaining: negative)."
        else:
            title = f"Your SSL certificate expires in {days} day{'s' if days != 1 else ''}"
            impact = (
                f"If not renewed within {days} days, your website will start showing "
                "security certificate errors to all visitors."
            )
            found = f"SSL certificate expires in {days} days (on {evidence.get('cert_not_after', 'unknown')})."

        findings.append(RawFinding(
            category="ssl_tls",
            severity=expiry_severity,
            title=title,
            technical_title=f"SSL certificate expires in {days} days",
            business_impact=impact,
            what_we_found=found,
            why_it_matters=(
                "Expired SSL certificates immediately break HTTPS for all visitors. "
                "Most certificate providers send renewal reminders, but these are often missed."
            ),
            technical_details=(
                f"Not Before: {evidence.get('cert_not_before')}\n"
                f"Not After:  {evidence.get('cert_not_after')}\n"
                f"Days until expiry: {days}\n"
                f"Subject: {evidence.get('cert_subject')}\n"
                f"Issuer: {evidence.get('cert_issuer')}"
            ),
            affected_asset=f"https://{domain}",
            asset_type="domain",
            evidence={"days_until_expiry": days, "not_after": evidence.get("cert_not_after")},
            tags=["ssl", "certificate", "expiry"],
        ))

    # Self-signed certificate
    if evidence.get("cert_self_signed") and evidence.get("cert_valid") is False:
        findings.append(RawFinding(
            category="ssl_tls",
            severity="high",
            title="Your website is using a self-signed certificate — visitors will see a security warning",
            technical_title="Self-signed SSL certificate detected",
            business_impact=(
                "Self-signed certificates are not trusted by browsers. Every visitor will "
                "see a large security warning and most will leave your site immediately."
            ),
            what_we_found=(
                f"The certificate issuer matches the subject: {evidence.get('cert_subject')}. "
                "This indicates a self-signed certificate."
            ),
            why_it_matters=(
                "Trusted SSL certificates must be issued by a recognised Certificate Authority (CA). "
                "Free options like Let's Encrypt make proper certificates easy to obtain."
            ),
            technical_details=(
                f"Subject: {evidence.get('cert_subject')}\n"
                f"Issuer: {evidence.get('cert_issuer')}\n"
                "Certificate is self-signed (issuer == subject)"
            ),
            affected_asset=f"https://{domain}",
            asset_type="domain",
            evidence=evidence,
            tags=["ssl", "certificate", "self-signed"],
        ))

    # Weak cipher suite
    if evidence.get("weak_cipher"):
        findings.append(RawFinding(
            category="ssl_tls",
            severity="high",
            title="Your server is using an outdated, weak encryption cipher",
            technical_title=f"Weak cipher suite negotiated: {evidence.get('cipher_suite')}",
            business_impact=(
                "Weak cipher suites can be broken by attackers with sufficient resources, "
                "potentially exposing communications to decryption."
            ),
            what_we_found=f"TLS negotiated weak cipher: {evidence.get('cipher_suite')}",
            why_it_matters=(
                "Modern TLS should use strong AEAD cipher suites (AES-GCM, ChaCha20-Poly1305). "
                "Weak ciphers like RC4, DES, and 3DES have known vulnerabilities."
            ),
            technical_details=(
                f"Cipher: {evidence.get('cipher_suite')}\n"
                f"Key bits: {evidence.get('cipher_bits')}\n"
                f"TLS version: {evidence.get('tls_version')}"
            ),
            affected_asset=f"https://{domain}",
            asset_type="domain",
            evidence=evidence,
            tags=["ssl", "tls", "weak-cipher", "encryption"],
        ))

    # Domain name mismatch
    if evidence.get("domain_name_match") is False and evidence.get("cert_valid"):
        findings.append(RawFinding(
            category="ssl_tls",
            severity="high",
            title="SSL certificate does not match your domain name",
            technical_title="SSL certificate domain name mismatch",
            business_impact=(
                "Browsers will show a security warning because the certificate installed on "
                "your server was issued for a different domain name."
            ),
            what_we_found=(
                f"Certificate subject/SANs do not match '{domain}'. "
                f"SANs: {', '.join(evidence.get('cert_san', [])) or 'none'}"
            ),
            why_it_matters=(
                "A domain mismatch means either the wrong certificate is installed, or "
                "the connection is being intercepted."
            ),
            technical_details=(
                f"Domain being scanned: {domain}\n"
                f"Certificate subject: {evidence.get('cert_subject')}\n"
                f"Certificate SANs: {json.dumps(evidence.get('cert_san', []))}"
            ),
            affected_asset=f"https://{domain}",
            asset_type="domain",
            evidence=evidence,
            tags=["ssl", "certificate", "mismatch"],
        ))

    return findings


# ── Master function ───────────────────────────────────────────────────────────

def generate_findings(
    domain: str,
    services_evidence: Dict[str, Any],
    web_evidence: Dict[str, Any],
    dns_evidence: Dict[str, Any],
    ssl_evidence: Dict[str, Any],
) -> List[RawFinding]:
    """Generate all findings from all probe results."""
    all_findings: List[RawFinding] = []
    all_findings.extend(findings_from_exposed_services(services_evidence, domain))
    all_findings.extend(findings_from_web_security(web_evidence, domain))
    all_findings.extend(findings_from_dns_email(dns_evidence, domain))
    all_findings.extend(findings_from_ssl_tls(ssl_evidence, domain))
    log.info("Generated %d findings for domain '%s'", len(all_findings), domain)
    return all_findings
