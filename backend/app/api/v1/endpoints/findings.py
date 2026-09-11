"""
Findings API endpoints — Module #2: Plain Language Findings.

GET  /api/v1/findings/{finding_id}
    Return the finding with its AI explanation if one has been generated.

POST /api/v1/findings/{finding_id}/explain
    Generate (or regenerate) an AI plain-language explanation for the finding.
    Stores the result in finding_explanations and returns it.
    Idempotent: calling it twice replaces the previous explanation.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.explainer import explain_finding
from app.db.models import Finding, FindingExplanation
from app.db.session import get_db
from app.schemas.findings import ExplanationResponse, FindingDetailResponse

log = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_explanation(exp: FindingExplanation) -> ExplanationResponse:
    return ExplanationResponse(
        finding_id=exp.finding_id,
        title=exp.title,
        what_we_found=exp.what_we_found,
        business_impact=exp.business_impact,
        explanation=exp.explanation,
        recommended_action=exp.recommended_action,
        severity_explanation=exp.severity_explanation,
        model_used=exp.model_used,
        generated_at=exp.generated_at,
        generation_ms=exp.generation_ms,
    )


def _map_finding(f: Finding) -> FindingDetailResponse:
    return FindingDetailResponse(
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
        confidence=f.confidence,
        status=f.status,
        tags=f.tags or [],
        detected_at=f.detected_at,
        last_seen=f.last_seen,
        explanation=_map_explanation(f.explanation) if f.explanation else None,
    )


async def _get_finding_or_404(finding_id: str, db: AsyncSession) -> Finding:
    result = await db.execute(
        select(Finding).where(Finding.id == finding_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{finding_id}", response_model=FindingDetailResponse)
async def get_finding(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
) -> FindingDetailResponse:
    """Return a single finding with its AI explanation (if already generated)."""
    finding = await _get_finding_or_404(finding_id, db)
    return _map_finding(finding)


@router.post("/{finding_id}/explain", response_model=ExplanationResponse)
async def explain_finding_endpoint(
    finding_id: str,
    db: AsyncSession = Depends(get_db),
) -> ExplanationResponse:
    """
    Generate (or regenerate) an AI plain-language explanation for a finding.

    - Uses real evidence from Module #1 as grounding context.
    - The AI is instructed never to invent facts not present in the evidence.
    - Works with or without OpenAI configured (falls back to rule-based output).
    - Idempotent: re-calling replaces the previous explanation.
    """
    finding = await _get_finding_or_404(finding_id, db)

    # Generate explanation
    result = await explain_finding(finding)

    # Upsert into finding_explanations
    existing = await db.execute(
        select(FindingExplanation).where(FindingExplanation.finding_id == finding_id)
    )
    exp_row = existing.scalar_one_or_none()

    if exp_row is None:
        exp_row = FindingExplanation(finding_id=finding_id)
        db.add(exp_row)

    exp_row.title               = result.data["title"]
    exp_row.what_we_found       = result.data["what_we_found"]
    exp_row.business_impact     = result.data["business_impact"]
    exp_row.explanation         = result.data["explanation"]
    exp_row.recommended_action  = result.data["recommended_action"]
    exp_row.severity_explanation = result.data["severity_explanation"]
    exp_row.model_used          = result.model_used
    exp_row.generation_ms       = result.generation_ms

    await db.commit()
    await db.refresh(exp_row)

    log.info(
        "Explanation stored for finding %s (model=%s, ai=%s)",
        finding_id, result.model_used, result.used_ai,
    )
    return _map_explanation(exp_row)
