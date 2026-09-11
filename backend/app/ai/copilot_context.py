"""
Security Copilot Context Gatherer

Fetches the latest real security data from the database so the AI
has accurate, grounded context before answering the user's question.

Only the data that is actually relevant to the question is included
in the prompt — we don't dump the entire database into every call.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Assessment, Finding, FindingExplanation

log = logging.getLogger(__name__)


@dataclass
class WorkspaceContext:
    """All security context needed to answer a copilot question."""

    # Latest completed assessment (if any)
    latest_assessment: Optional[Dict[str, Any]] = None

    # Open findings from the latest assessment, sorted by severity
    findings: List[Dict[str, Any]] = field(default_factory=list)

    # Count of findings with AI explanations already generated
    explained_count: int = 0

    # Previous assessment for trend comparison
    previous_assessment: Optional[Dict[str, Any]] = None

    # Whether any assessment data is available
    has_data: bool = False


# Severity ordering for sorting
_SEV_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


async def gather_context(db: AsyncSession) -> WorkspaceContext:
    """
    Pull the latest security data from the database.
    Returns a WorkspaceContext ready to be serialised into a prompt.
    """
    ctx = WorkspaceContext()

    # ── Latest completed assessment ───────────────────────────────────────────
    result = await db.execute(
        select(Assessment)
        .where(Assessment.status == "completed")
        .order_by(desc(Assessment.completed_at))
        .limit(2)
    )
    assessments = result.scalars().all()

    if not assessments:
        return ctx  # no data yet

    ctx.has_data = True
    latest = assessments[0]

    ctx.latest_assessment = {
        "id":            latest.id,
        "domain":        latest.domain,
        "completed_at":  latest.completed_at.isoformat() if latest.completed_at else None,
        "overall_score": round(latest.overall_score, 1),
        "total_checks":  latest.total_checks,
        "findings_count": latest.findings_count or {},
        "categories":    latest.categories or [],
    }

    if len(assessments) > 1:
        prev = assessments[1]
        ctx.previous_assessment = {
            "domain":        prev.domain,
            "completed_at":  prev.completed_at.isoformat() if prev.completed_at else None,
            "overall_score": round(prev.overall_score, 1),
            "findings_count": prev.findings_count or {},
        }

    # ── Findings (latest assessment, open only, sorted by severity) ───────────
    findings_result = await db.execute(
        select(Finding)
        .where(
            Finding.assessment_id == latest.id,
            Finding.status == "open",
        )
        .order_by(Finding.severity)
        .limit(30)   # cap at 30 to keep prompt manageable
    )
    raw_findings = findings_result.scalars().all()

    # Sort by severity order
    raw_findings_sorted = sorted(
        raw_findings, key=lambda f: _SEV_ORDER.get(f.severity, 99)
    )

    explained = 0
    for f in raw_findings_sorted:
        finding_dict: Dict[str, Any] = {
            "id":               f.id,
            "title":            f.title,
            "technical_title":  f.technical_title,
            "severity":         f.severity,
            "category":         f.category,
            "affected_asset":   f.affected_asset,
            "what_we_found":    f.what_we_found,
            "business_impact":  f.business_impact,
            "why_it_matters":   f.why_it_matters,
        }
        # Attach AI explanation if already generated
        if f.explanation:
            finding_dict["ai_explanation"] = {
                "title":              f.explanation.title,
                "recommended_action": f.explanation.recommended_action,
                "severity_explanation": f.explanation.severity_explanation,
            }
            explained += 1
        ctx.findings.append(finding_dict)

    ctx.explained_count = explained
    return ctx


def context_to_prompt_block(ctx: WorkspaceContext) -> str:
    """
    Serialise the WorkspaceContext into a compact, readable text block
    suitable for inclusion in an OpenAI system/user message.
    """
    if not ctx.has_data:
        return (
            "SECURITY DATA: No completed assessments found in the system yet. "
            "The user has not run a domain assessment."
        )

    lines: List[str] = []
    a = ctx.latest_assessment
    assert a is not None

    lines.append("=== CURRENT SECURITY STATUS ===")
    lines.append(f"Domain assessed: {a['domain']}")
    lines.append(f"Assessment completed: {a['completed_at']}")
    lines.append(f"Overall security score: {a['overall_score']} / 100")
    lines.append(f"Total checks run: {a['total_checks']}")

    fc = a["findings_count"]
    lines.append(
        f"Open findings: "
        f"{fc.get('critical', 0)} critical, "
        f"{fc.get('high', 0)} high, "
        f"{fc.get('medium', 0)} medium, "
        f"{fc.get('low', 0)} low"
    )

    # Category scores
    if a["categories"]:
        lines.append("\nCategory scores:")
        for cat in a["categories"]:
            lines.append(
                f"  - {cat.get('label', cat['category'])}: "
                f"{cat.get('score', 0):.0f}/100 "
                f"({cat.get('findings', 0)} finding(s), status: {cat.get('status', 'unknown')})"
            )

    # Score trend
    if ctx.previous_assessment:
        prev = ctx.previous_assessment
        delta = round(a["overall_score"] - prev["overall_score"], 1)
        trend = "improved" if delta > 0 else ("declined" if delta < 0 else "unchanged")
        lines.append(f"\nScore trend: {trend} by {abs(delta)} points since last assessment")
        prev_fc = prev["findings_count"]
        curr_total = sum(fc.values())
        prev_total = sum(prev_fc.values())
        lines.append(f"Findings change: {curr_total} open (was {prev_total})")

    # Findings detail
    if ctx.findings:
        lines.append(f"\n=== OPEN FINDINGS ({len(ctx.findings)}) ===")
        for i, f in enumerate(ctx.findings, 1):
            lines.append(
                f"\n[{i}] Severity: {f['severity'].upper()} | Category: {f['category']} | Asset: {f['affected_asset']}"
            )
            lines.append(f"    Title: {f['title']}")
            lines.append(f"    What was found: {f['what_we_found']}")
            lines.append(f"    Business impact: {f['business_impact']}")
            if "ai_explanation" in f:
                exp = f["ai_explanation"]
                lines.append(f"    Recommended action: {exp['recommended_action']}")
    else:
        lines.append("\nNo open findings from the latest assessment.")

    return "\n".join(lines)
