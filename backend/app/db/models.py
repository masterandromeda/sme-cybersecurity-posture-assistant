"""SQLAlchemy ORM models for Neural Protocol."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Assessment ────────────────────────────────────────────────────────────────

class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    domain: Mapped[str] = mapped_column(String(253), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        Enum("queued", "running", "completed", "failed", name="assessment_status"),
        default="queued",
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Summary counters (denormalised for fast reads)
    total_checks: Mapped[int] = mapped_column(Integer, default=0)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)

    # JSON blob of FindingsCount  {"critical":0,"high":0,"medium":0,"low":0,"info":0}
    findings_count: Mapped[dict] = mapped_column(
        JSON, default=lambda: {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    )

    # JSON list of AssessmentCategoryResult objects
    categories: Mapped[list] = mapped_column(JSON, default=list)

    findings: Mapped[list["Finding"]] = relationship(
        "Finding", back_populates="assessment", cascade="all, delete-orphan", lazy="selectin"
    )


# ── Finding ───────────────────────────────────────────────────────────────────

class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    assessment_id: Mapped[str] = mapped_column(
        String, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Categorisation ────
    category: Mapped[str] = mapped_column(String(50), nullable=False)   # AssessmentCategory
    severity: Mapped[str] = mapped_column(String(20), nullable=False)   # RiskLevel

    # ── Plain-language fields (pre-computed or AI-enriched later) ────
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    technical_title: Mapped[str] = mapped_column(String(200), nullable=False)
    business_impact: Mapped[str] = mapped_column(Text, nullable=False, default="")
    what_we_found: Mapped[str] = mapped_column(Text, nullable=False, default="")
    why_it_matters: Mapped[str] = mapped_column(Text, nullable=False, default="")
    technical_details: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # ── Asset ─────────────────────────────────────────────────────────
    affected_asset: Mapped[str] = mapped_column(String(253), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(30), nullable=False)

    # ── Evidence / metadata ───────────────────────────────────────────
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)    # raw probe output
    confidence: Mapped[str] = mapped_column(String(10), default="high")
    status: Mapped[str] = mapped_column(String(20), default="open")
    cve: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cvss: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)

    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="findings")
    explanation: Mapped[Optional["FindingExplanation"]] = relationship(
        "FindingExplanation", back_populates="finding",
        cascade="all, delete-orphan", uselist=False, lazy="selectin",
    )


# ── FindingExplanation ────────────────────────────────────────────────────────

class FindingExplanation(Base):
    """AI-generated plain-language explanation for a single Finding.

    One-to-one with Finding (finding_id is both FK and PK).
    Stored separately so Module #1 output is never mutated.
    """
    __tablename__ = "finding_explanations"

    finding_id: Mapped[str] = mapped_column(
        String, ForeignKey("findings.id", ondelete="CASCADE"),
        primary_key=True, nullable=False,
    )

    # AI-generated fields
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    what_we_found: Mapped[str] = mapped_column(Text, nullable=False)
    business_impact: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[str] = mapped_column(Text, nullable=False)
    severity_explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Metadata
    model_used: Mapped[str] = mapped_column(String(50), nullable=False, default="gpt-4o-mini")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    generation_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # latency

    finding: Mapped["Finding"] = relationship("Finding", back_populates="explanation")
