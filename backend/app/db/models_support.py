"""SQLAlchemy ORM models for Neural Protocol – support & contact."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── SupportConversation ───────────────────────────────────────────────────────

class SupportConversation(Base):
    __tablename__ = "support_conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    user_name: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("open", "closed", name="support_conversation_status"),
        default="open",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    messages: Mapped[List["SupportMessage"]] = relationship(
        "SupportMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


# ── SupportMessage ────────────────────────────────────────────────────────────

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("support_conversations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    sender_type: Mapped[str] = mapped_column(
        Enum("user", "agent", name="support_sender_type"),
        nullable=False,
    )
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    conversation: Mapped["SupportConversation"] = relationship(
        "SupportConversation", back_populates="messages"
    )


# ── ContactSubmission ─────────────────────────────────────────────────────────

class ContactSubmission(Base):
    __tablename__ = "contact_submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("new", "read", "replied", name="contact_submission_status"),
        default="new",
        nullable=False,
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
