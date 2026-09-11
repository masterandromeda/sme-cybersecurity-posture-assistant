"""Pydantic schemas for API request/response serialization."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


# ── Shared ────────────────────────────────────────────────────────────────────

class FindingsCount(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class CategoryResult(BaseModel):
    category: str
    label: str
    checks_run: int
    findings: int
    score: float
    status: str   # "pass" | "warning" | "fail"


# ── Assessment ────────────────────────────────────────────────────────────────

class AssessmentCreate(BaseModel):
    domain: str

    @field_validator("domain")
    @classmethod
    def normalize_domain(cls, v: str) -> str:
        return v.strip().lower().removeprefix("https://").removeprefix("http://").rstrip("/").split("/")[0]


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    domain: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    total_checks: int
    overall_score: float
    findings_count: FindingsCount
    categories: List[CategoryResult]
    error_message: Optional[str] = None


class AssessmentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    domain: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    total_checks: int
    overall_score: float
    findings_count: FindingsCount


# ── Finding ───────────────────────────────────────────────────────────────────

class FindingResponse(BaseModel):
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
    evidence: Dict[str, Any]
    confidence: str
    status: str
    cve: Optional[str] = None
    cvss: Optional[float] = None
    tags: List[str]
    detected_at: datetime
    last_seen: datetime


# ── Report ────────────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    assessment_id: str
    domain: str
    generated_at: datetime
    assessment: AssessmentResponse
    findings: List[FindingResponse]
