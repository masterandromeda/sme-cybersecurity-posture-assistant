"""
Assessment Runner — orchestrates all probes for a single domain,
stores results in the database, and computes a posture score.

Score computation:
  - Start at 100
  - Deduct per finding based on severity:
      critical: -25, high: -15, medium: -7, low: -3, info: 0
  - Per-category score: weighted by findings in that category
  - Minimum score: 0
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Assessment, Finding
from app.engine.finding_engine import RawFinding, generate_findings
from app.engine.probes.dns_email import probe_dns_email
from app.engine.probes.exposed_services import probe_exposed_services
from app.engine.probes.ssl_tls import probe_ssl_tls
from app.engine.probes.web_security import probe_web_security
from app.engine.target_validator import TargetValidationError, validate_domain

log = logging.getLogger(__name__)

# Severity deduction weights
_SEVERITY_DEDUCTION = {
    "critical": 25,
    "high": 15,
    "medium": 7,
    "low": 3,
    "info": 0,
}

# Category metadata
_CATEGORY_META = {
    "exposed_services": "Exposed Services",
    "web_security":     "Web Security",       # internal label
    "security_headers": "Security Headers",
    "email_security":   "Email Security",
    "domain_security":  "Domain Security",
    "ssl_tls":          "SSL / TLS",
    "patch_hygiene":    "Patch Hygiene",
    "account_hygiene":  "Account Hygiene",
}

# Checks run per category (approximate — reflects what this module probes)
_CATEGORY_CHECKS = {
    "exposed_services": 1,
    "security_headers": 8,
    "email_security":   4,
    "domain_security":  2,
    "ssl_tls":          5,
    "patch_hygiene":    0,   # not implemented in this module
    "account_hygiene":  0,   # not implemented in this module
}


def _compute_score(findings: List[RawFinding]) -> float:
    score = 100.0
    for f in findings:
        score -= _SEVERITY_DEDUCTION.get(f.severity, 0)
    return max(0.0, round(score, 1))


def _category_results(findings: List[RawFinding]) -> List[Dict[str, Any]]:
    categories = {}
    for f in findings:
        cat = f.category
        if cat not in categories:
            categories[cat] = {"findings": [], "checks": _CATEGORY_CHECKS.get(cat, 1)}
        categories[cat]["findings"].append(f)

    # Ensure all probed categories are present even with zero findings
    for cat, checks in _CATEGORY_CHECKS.items():
        if checks > 0 and cat not in categories:
            categories[cat] = {"findings": [], "checks": checks}

    results = []
    for cat, data in categories.items():
        cat_findings = data["findings"]
        checks = data["checks"]
        if not cat_findings:
            cat_score = 100.0
            status = "pass"
        else:
            severities = [f.severity for f in cat_findings]
            if "critical" in severities or "high" in severities:
                status = "fail"
            else:
                status = "warning"
            deduction = sum(_SEVERITY_DEDUCTION.get(s, 0) for s in severities)
            cat_score = max(0.0, round(100.0 - deduction, 1))

        results.append({
            "category": cat,
            "label": _CATEGORY_META.get(cat, cat.replace("_", " ").title()),
            "checks_run": checks,
            "findings": len(cat_findings),
            "score": cat_score,
            "status": status,
        })
    return sorted(results, key=lambda r: r["score"])


async def run_assessment(assessment_id: str, domain: str, db: AsyncSession) -> None:
    """
    Main assessment coroutine.  Updates the Assessment row in the database
    as it progresses.  Designed to be run as a background task.
    """
    log.info("Starting assessment %s for domain '%s'", assessment_id, domain)

    async def _update_status(status: str, **kwargs: Any) -> None:
        from sqlalchemy import update
        stmt = (
            update(Assessment)
            .where(Assessment.id == assessment_id)
            .values(status=status, **kwargs)
        )
        await db.execute(stmt)
        await db.commit()

    # ── 1. Validate target ────────────────────────────────────────────────────
    try:
        domain = validate_domain(domain)
    except TargetValidationError as exc:
        log.warning("Target validation failed for %s: %s", domain, exc)
        await _update_status("failed", error_message=str(exc))
        return

    await _update_status("running")

    # ── 2. Run all probes concurrently ────────────────────────────────────────
    try:
        services_task   = probe_exposed_services(domain)
        web_task        = probe_web_security(domain)
        dns_task        = probe_dns_email(domain)
        ssl_task        = probe_ssl_tls(domain)

        services_ev, web_ev, dns_ev, ssl_ev = await asyncio.gather(
            services_task, web_task, dns_task, ssl_task,
            return_exceptions=True,
        )
    except Exception as exc:
        log.error("Probe execution error for %s: %s", domain, exc, exc_info=True)
        await _update_status("failed", error_message=f"Probe error: {exc}")
        return

    # Replace exception results with empty dicts + log
    def _safe(result: Any, name: str) -> Dict[str, Any]:
        if isinstance(result, Exception):
            log.error("Probe '%s' failed: %s", name, result)
            return {}
        return result

    services_ev = _safe(services_ev, "exposed_services")
    web_ev      = _safe(web_ev,      "web_security")
    dns_ev      = _safe(dns_ev,      "dns_email")
    ssl_ev      = _safe(ssl_ev,      "ssl_tls")

    # ── 3. Generate findings ─────────────────────────────────────────────────
    raw_findings = generate_findings(domain, services_ev, web_ev, dns_ev, ssl_ev)

    # ── 4. Persist findings ──────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    db_findings = [
        Finding(
            assessment_id=assessment_id,
            category=f.category,
            severity=f.severity,
            title=f.title,
            technical_title=f.technical_title,
            business_impact=f.business_impact,
            what_we_found=f.what_we_found,
            why_it_matters=f.why_it_matters,
            technical_details=f.technical_details,
            affected_asset=f.affected_asset,
            asset_type=f.asset_type,
            evidence=f.evidence,
            confidence=f.confidence,
            tags=f.tags,
            cve=f.cve,
            cvss=f.cvss,
            detected_at=now,
            last_seen=now,
        )
        for f in raw_findings
    ]
    db.add_all(db_findings)

    # ── 5. Compute and store summary ─────────────────────────────────────────
    findings_count = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in raw_findings:
        findings_count[f.severity] = findings_count.get(f.severity, 0) + 1

    total_checks = sum(_CATEGORY_CHECKS.values())
    overall_score = _compute_score(raw_findings)
    categories = _category_results(raw_findings)

    from sqlalchemy import update as sqlupdate
    stmt = (
        sqlupdate(Assessment)
        .where(Assessment.id == assessment_id)
        .values(
            status="completed",
            completed_at=now,
            total_checks=total_checks,
            overall_score=overall_score,
            findings_count=findings_count,
            categories=categories,
        )
    )
    await db.execute(stmt)
    await db.commit()
    log.info(
        "Assessment %s completed — %d findings, score %.1f",
        assessment_id, len(raw_findings), overall_score,
    )
