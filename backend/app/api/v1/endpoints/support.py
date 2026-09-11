"""
Support chat endpoints — WebSocket + REST.

REST:
  POST /support/conversations              — create conversation + first message
  GET  /support/conversations              — list conversations (admin; ?status=open|closed|all)
  GET  /support/conversations/{id}         — single conversation with all messages
  POST /support/conversations/{id}/messages — add message (user or agent)
  POST /support/conversations/{id}/close   — mark conversation closed (admin)

WebSocket:
  WS   /support/ws/{conversation_id}       — real-time chat
"""
from __future__ import annotations

import json
import logging
from datetime import timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models_support import SupportConversation, SupportMessage
from app.db.session import AsyncSessionLocal, get_db
from app.schemas.support import (
    ConversationCreate,
    ConversationResponse,
    ConversationWithMessages,
    MessageCreate,
    MessageResponse,
)

log = logging.getLogger(__name__)

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_message(m: SupportMessage) -> MessageResponse:
    """Map ORM SupportMessage → Pydantic MessageResponse."""
    return MessageResponse(
        id=m.id,
        conversation_id=m.conversation_id,
        sender_type=m.sender_type,
        sender_name=m.sender_name,
        content=m.content,
        created_at=m.created_at,
    )


def _map_conversation(c: SupportConversation) -> ConversationResponse:
    """Map ORM SupportConversation → Pydantic ConversationResponse."""
    return ConversationResponse(
        id=c.id,
        user_email=c.user_email,
        user_name=c.user_name,
        subject=c.subject,
        status=c.status,
        created_at=c.created_at,
        message_count=len(c.messages) if c.messages is not None else 0,
    )


def _map_conversation_with_messages(c: SupportConversation) -> ConversationWithMessages:
    """Map ORM SupportConversation → ConversationWithMessages (includes messages list)."""
    msgs = [_map_message(m) for m in sorted(c.messages or [], key=lambda m: m.created_at)]
    return ConversationWithMessages(
        id=c.id,
        user_email=c.user_email,
        user_name=c.user_name,
        subject=c.subject,
        status=c.status,
        created_at=c.created_at,
        message_count=len(msgs),
        messages=msgs,
    )


# ── ConnectionManager ─────────────────────────────────────────────────────────

class ConnectionManager:
    """In-memory registry of active WebSocket connections, keyed by conversation_id."""

    def __init__(self) -> None:
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, conversation_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(conversation_id, []).append(ws)

    def disconnect(self, conversation_id: str, ws: WebSocket) -> None:
        bucket = self._connections.get(conversation_id, [])
        if ws in bucket:
            bucket.remove(ws)
        if not bucket:
            self._connections.pop(conversation_id, None)

    async def broadcast(self, conversation_id: str, payload: dict) -> None:
        """Send JSON payload to every connection on a conversation."""
        dead: List[WebSocket] = []
        for ws in list(self._connections.get(conversation_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(conversation_id, ws)


manager = ConnectionManager()


# ── REST endpoints ────────────────────────────────────────────────────────────

@router.post("/conversations", response_model=ConversationWithMessages, status_code=201)
async def create_conversation(
    body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
) -> ConversationWithMessages:
    """
    Create a new support conversation and store the first message.
    Returns the full conversation including that initial message.
    """
    conversation = SupportConversation(
        user_email=body.user_email,
        user_name=body.user_name,
        subject=body.subject,
        status="open",
    )
    db.add(conversation)
    await db.flush()  # populate conversation.id before we reference it

    first_msg = SupportMessage(
        conversation_id=conversation.id,
        sender_type="user",
        sender_name=body.user_name,
        content=body.initial_message,
    )
    db.add(first_msg)
    await db.commit()
    await db.refresh(conversation)

    return _map_conversation_with_messages(conversation)


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    status: Optional[str] = "all",
    db: AsyncSession = Depends(get_db),
) -> List[ConversationResponse]:
    """
    List all support conversations, newest first.
    Admin endpoint — filter by ?status=open|closed|all (default: all).
    """
    stmt = select(SupportConversation).order_by(SupportConversation.created_at.desc())
    if status in ("open", "closed"):
        stmt = stmt.where(SupportConversation.status == status)
    elif status not in ("all", None):
        raise HTTPException(status_code=422, detail="status must be 'open', 'closed', or 'all'")

    result = await db.execute(stmt)
    conversations = result.scalars().all()
    return [_map_conversation(c) for c in conversations]


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
) -> ConversationWithMessages:
    """Retrieve a single conversation with all its messages."""
    result = await db.execute(
        select(SupportConversation).where(SupportConversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _map_conversation_with_messages(conversation)


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
async def add_message(
    conversation_id: str,
    body: MessageCreate,
    sender_type: str = "user",
    sender_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Add a message to an existing conversation.
    Query params: sender_type=user|agent, sender_name (defaults to conversation user_name).
    Also broadcasts the new message to any active WebSocket connections.
    """
    if sender_type not in ("user", "agent"):
        raise HTTPException(status_code=422, detail="sender_type must be 'user' or 'agent'")

    result = await db.execute(
        select(SupportConversation).where(SupportConversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.status == "closed":
        raise HTTPException(status_code=409, detail="Conversation is closed")

    name = sender_name or (conversation.user_name if sender_type == "user" else "Support Agent")
    msg = SupportMessage(
        conversation_id=conversation_id,
        sender_type=sender_type,
        sender_name=name,
        content=body.content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    mapped = _map_message(msg)

    # Broadcast to any live WebSocket listeners on this conversation
    await manager.broadcast(
        conversation_id,
        {
            "type": "message",
            "sender_type": mapped.sender_type,
            "sender_name": mapped.sender_name,
            "content": mapped.content,
            "created_at": mapped.created_at.astimezone(timezone.utc).isoformat(),
        },
    )

    return mapped


@router.post("/conversations/{conversation_id}/close", response_model=ConversationResponse)
async def close_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
) -> ConversationResponse:
    """Mark a support conversation as closed (admin action)."""
    result = await db.execute(
        select(SupportConversation).where(SupportConversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conversation.status == "closed":
        raise HTTPException(status_code=409, detail="Conversation is already closed")

    conversation.status = "closed"
    await db.commit()
    await db.refresh(conversation)
    return _map_conversation(conversation)


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/{conversation_id}")
async def websocket_chat(
    conversation_id: str,
    websocket: WebSocket,
) -> None:
    """
    Real-time chat WebSocket for a support conversation.

    On connect:
      - Validates the conversation exists.
      - Sends the last 50 messages as a single "history" frame.
      - Registers the socket in the ConnectionManager.

    On message receive (JSON):
      {"sender_type": "user"|"agent", "sender_name": str, "content": str}
      Saves the message to DB and broadcasts to all connections on this conversation.

    On disconnect: gracefully removes the socket from the manager.
    """
    # Validate conversation before accepting
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(SupportConversation).where(SupportConversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            await websocket.close(code=4004, reason="Conversation not found")
            return

        # Fetch last 50 messages for history
        msgs_result = await db.execute(
            select(SupportMessage)
            .where(SupportMessage.conversation_id == conversation_id)
            .order_by(SupportMessage.created_at.desc())
            .limit(50)
        )
        history_msgs = list(reversed(msgs_result.scalars().all()))
        history_payload = [
            {
                "type": "message",
                "sender_type": m.sender_type,
                "sender_name": m.sender_name,
                "content": m.content,
                "created_at": m.created_at.astimezone(timezone.utc).isoformat(),
            }
            for m in history_msgs
        ]

    await manager.connect(conversation_id, websocket)
    log.debug("WS connected: conversation=%s", conversation_id)

    try:
        # Send history as a single frame
        await websocket.send_json({"type": "history", "messages": history_payload})

        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            sender_type = data.get("sender_type", "user")
            if sender_type not in ("user", "agent"):
                await websocket.send_json({"type": "error", "detail": "Invalid sender_type"})
                continue

            sender_name = str(data.get("sender_name", "")).strip() or "Unknown"
            content = str(data.get("content", "")).strip()
            if not content:
                await websocket.send_json({"type": "error", "detail": "Empty content"})
                continue

            # Persist message
            async with AsyncSessionLocal() as db:
                # Refuse messages on closed conversations
                conv_result = await db.execute(
                    select(SupportConversation).where(SupportConversation.id == conversation_id)
                )
                conv = conv_result.scalar_one_or_none()
                if conv and conv.status == "closed":
                    await websocket.send_json({"type": "error", "detail": "Conversation is closed"})
                    continue

                msg = SupportMessage(
                    conversation_id=conversation_id,
                    sender_type=sender_type,
                    sender_name=sender_name,
                    content=content,
                )
                db.add(msg)
                await db.commit()
                await db.refresh(msg)
                created_iso = msg.created_at.astimezone(timezone.utc).isoformat()

            # Broadcast to all sockets on this conversation (including sender)
            await manager.broadcast(
                conversation_id,
                {
                    "type": "message",
                    "sender_type": sender_type,
                    "sender_name": sender_name,
                    "content": content,
                    "created_at": created_iso,
                },
            )

    except WebSocketDisconnect:
        log.debug("WS disconnected: conversation=%s", conversation_id)
    except Exception as exc:
        log.error("WS error on conversation=%s: %s", conversation_id, exc, exc_info=True)
    finally:
        manager.disconnect(conversation_id, websocket)
