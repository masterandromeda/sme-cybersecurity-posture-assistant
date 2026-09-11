"""Pydantic v2 schemas for the support conversation system."""
from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


# ── ConversationCreate ────────────────────────────────────────────────────────

class ConversationCreate(BaseModel):
    user_email: str
    user_name: str
    subject: str
    initial_message: str

    @field_validator("user_email", "user_name", "subject", "initial_message")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()


# ── ConversationResponse ──────────────────────────────────────────────────────

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_email: str
    user_name: str
    subject: str
    status: str
    created_at: datetime
    message_count: int = 0


# ── MessageCreate ─────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_length(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message content must not be empty")
        if len(v) > 4000:
            raise ValueError("Message content must not exceed 4000 characters")
        return v


# ── MessageResponse ───────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    sender_type: str
    sender_name: str
    content: str
    created_at: datetime


# ── ConversationWithMessages ──────────────────────────────────────────────────

class ConversationWithMessages(ConversationResponse):
    messages: List[MessageResponse] = []


# ── ContactCreate ─────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str
    email: str
    company: str
    subject: str
    message: str

    @field_validator("name", "company", "subject", "message")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty")
        return v.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Email must not be empty")
        v = v.strip()
        # Basic format check – @ present and at least one dot after @
        at_idx = v.find("@")
        if at_idx < 1:
            raise ValueError("Invalid email address")
        domain_part = v[at_idx + 1:]
        if "." not in domain_part or domain_part.startswith(".") or domain_part.endswith("."):
            raise ValueError("Invalid email address")
        return v


# ── ContactResponse ───────────────────────────────────────────────────────────

class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    company: str
    subject: str
    status: str
    submitted_at: datetime
