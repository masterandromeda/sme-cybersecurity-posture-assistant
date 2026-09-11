"""
Security Copilot API endpoint — Module #3.

POST /api/v1/copilot/chat
    Gathers latest real security context from the DB,
    calls the AI service, and returns a business-friendly answer.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.copilot_context import gather_context
from app.ai.copilot_ai import answer_question
from app.db.session import get_db
from app.schemas.copilot import CopilotRequest, CopilotResponse

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(
    body: CopilotRequest,
    db: AsyncSession = Depends(get_db),
) -> CopilotResponse:
    """
    Answer a security question using real workspace data.

    Flow:
      1. Gather latest assessment, findings, and trend data from DB.
      2. Serialise into a compact context block.
      3. Call OpenAI (or fallback) with the context + question.
      4. Return the answer — no raw security data is exposed to the frontend.
    """
    # Gather real context
    ctx = await gather_context(db)

    # Convert conversation history for multi-turn support
    history = [{"role": t.role, "content": t.content} for t in body.history]

    # Generate answer
    reply = await answer_question(body.message, ctx, conversation_history=history)

    log.info(
        "Copilot answered (model=%s, ai=%s, latency=%dms, has_data=%s)",
        reply.model_used, reply.used_ai, reply.latency_ms, ctx.has_data,
    )

    return CopilotResponse(
        content=reply.content,
        used_ai=reply.used_ai,
        model_used=reply.model_used,
        latency_ms=reply.latency_ms,
        has_assessment_data=ctx.has_data,
    )
