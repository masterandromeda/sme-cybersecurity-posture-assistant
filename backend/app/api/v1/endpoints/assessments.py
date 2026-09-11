"""
Assessment API endpoints.

POST /assessments             — create + queue a new assessment
GET  /assessments/{id}        — get assessment status + summary
GET  /assessments/{id}/findings  — get findings for an assessment
GET  /assessments/{id}/report/json  — full JSON report
GET  /assessments/{id}/report/pdf   — PDF report download
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Assessment, Finding
from app.db.session import AsyncSessionLocal, get_db
from app.engine.target_validator import TargetValidationError, validate_domain
from app.reports.pdf_generator import build_pdf_report
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentListItem,
    AssessmentResponse,
    CategoryResult,
    FindingResponse,
    FindingsCount,
    ReportResponse,
)

log = logging.getLogger(__name__)

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_assessment(a: Assessment) -> AssessmentResponse:
    """Map ORM model → Pydantic response."""
    fc_raw = a.findings_count or {}
    fc = FindingsCount(
        critical=fc_raw.get("critical", 0),
        high=fc_raw.get("high", 0),
        medium=fc_raw.get("medium", 0),
        low=fc_raw.get("low", 0),
        info=fc_raw.get("info", 0),
    )
    cats = [
        CategoryResult(
            category=c["category"],
            label=c.get("label", c["category"]),
            checks_run=c.get("checks_run", 0),
            findings=c.get("findings", 0),
            score=c.get("score", 100),
            status=c.get("status", "pass"),
        )
        for c in (a.categories or [])
    ]
    return AssessmentResponse(
        id=a.id,
        domain=a.domain,
        status=a.status,
        started_at=a.started_at,
        completed_at=a.completed_at,
        total_checks=a.total_checks,
        overall_score=a.overall_score,
        findings_count=fc,
        categories=cats,
        error_message=a.error_message,
    )


def _map_finding(f: Finding) -> FindingResponse:
    return FindingResponse(
        id=f.id,
        assessment_id=f.assessment_id,
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
        evidence=f.evidence or {},
        confidence=f.confidence,
        status=f.status,
        cve=f.cve,
        cvss=f.cvss,
        tags=f.tags or [],
        detected_at=f.detected_at,
        last_seen=f.last_seen,
    )


# ── Background runner (uses its own DB session so it outlives the request) ────

async def _run_assessment_background(assessment_id: str, domain: str) -> None:
    """Run the full assessment in the background with its own DB session."""
    from app.engine.runner import run_assessment
    async with AsyncSessionLocal() as session:
        try:
            await run_assessment(assessment_id, domain, session)
        except Exception as exc:
            log.error("Background assessment %s failed: %s", assessment_id, exc, exc_info=True)
            from sqlalchemy import update
            stmt = (
                update(Assessment)
                .where(Assessment.id == assessment_id)
                .values(status="failed", error_message=str(exc))
            )
            await session.execute(stmt)
            await session.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[AssessmentResponse])
async def list_assessments(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
) -> List[AssessmentResponse]:
    """
    List recent assessments, newest first.
    Used by the dashboard to load the most recent scan on mount.
    """
    result = await db.execute(
        select(Assessment)
        .order_by(Assessment.started_at.desc())
        .limit(limit)
    )
    assessments = result.scalars().all()
    return [_map_assessment(a) for a in assessments]


@router.post("", status_code=202, response_model=AssessmentResponse)
async def create_assessment(
    body: AssessmentCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> AssessmentResponse:
    """
    Create and queue a new security assessment.
    The domain is validated immediately; the actual scan runs in the background.
    Returns 202 Accepted with the assessment object (status: queued).
    """
    try:
        domain = validate_domain(body.domain)
    except TargetValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    assessment_id = str(uuid.uuid4())
    assessment = Assessment(
        id=assessment_id,
        domain=domain,
        status="queued",
        started_at=datetime.now(timezone.utc),
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)

    background_tasks.add_task(_run_assessment_background, assessment_id, domain)

    return _map_assessment(assessment)


@router.get("/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
) -> AssessmentResponse:
    """Get assessment status and summary."""
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return _map_assessment(assessment)


@router.get("/{assessment_id}/findings", response_model=List[FindingResponse])
async def get_findings(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
) -> List[FindingResponse]:
    """Get all findings for a completed assessment."""
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Assessment not found")

    findings_result = await db.execute(
        select(Finding)
        .where(Finding.assessment_id == assessment_id)
        .order_by(Finding.severity)
    )
    findings = findings_result.scalars().all()
    return [_map_finding(f) for f in findings]


@router.get("/{assessment_id}/report/json", response_model=ReportResponse)
async def get_json_report(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
) -> ReportResponse:
    """Return a full JSON report of the assessment and all findings."""
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.status != "completed":
        raise HTTPException(status_code=409, detail="Assessment is not yet completed")

    findings_result = await db.execute(
        select(Finding).where(Finding.assessment_id == assessment_id)
    )
    findings = findings_result.scalars().all()

    return ReportResponse(
        assessment_id=assessment_id,
        domain=assessment.domain,
        generated_at=datetime.now(timezone.utc),
        assessment=_map_assessment(assessment),
        findings=[_map_finding(f) for f in findings],
    )


@router.get("/{assessment_id}/report/pdf")
async def get_pdf_report(
    assessment_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate and return a PDF report for download."""
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.status != "completed":
        raise HTTPException(status_code=409, detail="Assessment is not yet completed")

    findings_result = await db.execute(
        select(Finding).where(Finding.assessment_id == assessment_id)
    )
    findings = findings_result.scalars().all()

    # Build dicts for the PDF generator
    assessment_dict = {
        "domain": assessment.domain,
        "status": assessment.status,
        "overall_score": assessment.overall_score,
        "findings_count": assessment.findings_count or {},
        "categories": assessment.categories or [],
        "completed_at": assessment.completed_at.strftime("%d %B %Y %H:%M UTC") if assessment.completed_at else "N/A",
    }
    findings_dicts = [
        {
            "title": f.title,
            "severity": f.severity,
            "category": f.category,
            "affected_asset": f.affected_asset,
            "what_we_found": f.what_we_found,
            "business_impact": f.business_impact,
            "why_it_matters": f.why_it_matters,
            "technical_details": f.technical_details,
        }
        for f in findings
    ]

    pdf_bytes = build_pdf_report(assessment_dict, findings_dicts)
    filename = f"neural-protocol-report-{assessment.domain}-{assessment_id[:8]}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
