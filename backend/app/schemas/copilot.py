"""Pydantic schemas for Module #3 — Security Copilot."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, field_validator


class ConversationTurn(BaseModel):
    role: str       # "user" | "assistant"
    content: str


class CopilotRequest(BaseModel):
    message: str
    workspace_id: Optional[str] = None   # reserved for future multi-workspace support
    # Last N conversation turns for multi-turn context (optional)
    history: List[ConversationTurn] = []

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message cannot be empty")
        if len(v) > 2000:
            raise ValueError("message too long (max 2000 characters)")
        return v


class CopilotResponse(BaseModel):
    content: str
    used_ai: bool
    model_used: str
    latency_ms: int
    has_assessment_data: bool
