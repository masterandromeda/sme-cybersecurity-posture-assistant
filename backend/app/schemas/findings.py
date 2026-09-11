"""Pydantic schemas for Module #2 — Plain Language Findings."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExplanationResponse(BaseModel):
    """Returned by POST /findings/{id}/explain and embedded in FindingDetailResponse."""
    model_config = ConfigDict(from_attributes=True)

    finding_id: str
    title: str
    what_we_found: str
    business_impact: str
    explanation: str
    recommended_action: str
    severity_explanation: str
    model_used: str
    generated_at: datetime
    generation_ms: Optional[int] = None


class FindingDetailResponse(BaseModel):
    """Single finding with its AI explanation (if available)."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    assessment_id: str
    category: str
    severity: str
    title: str
    technical_title: str
    business_impact: str
    what_we_found: str
    why_it_matters: str
    technical_details: str
    affected_asset: str
    asset_type: str
    confidence: str
    status: str
    tags: list
    detected_at: datetime
    last_seen: datetime
    # AI explanation — None if not yet generated
    explanation: Optional[ExplanationResponse] = None
