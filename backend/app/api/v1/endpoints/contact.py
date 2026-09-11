"""
Contact form endpoints.

POST /contact               — submit contact form, store in DB, send email notification
GET  /contact               — list all submissions (admin)
PUT  /contact/{id}/status   — update status: new | read | replied
"""
from __future__ import annotations

import asyncio
import logging
import smtplib
from datetime import timezone
from email.mime.text import MIMEText
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models_support import ContactSubmission
from app.db.session import get_db
from app.schemas.support import ContactCreate, ContactResponse

log = logging.getLogger(__name__)

router = APIRouter()

# Valid status values for the PUT endpoint
_VALID_STATUSES = {"new", "read", "replied"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _map_contact(c: ContactSubmission) -> ContactResponse:
    """Map ORM ContactSubmission → Pydantic ContactResponse."""
    return ContactResponse(
        id=c.id,
        name=c.name,
        email=c.email,
        company=c.company,
        subject=c.subject,
        status=c.status,
        submitted_at=c.submitted_at,
    )


def _build_email_body(submission: ContactSubmission) -> str:
    """Build a plain-text email body from a contact submission."""
    ts = submission.submitted_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"New contact form submission — Neural Protocol\n"
        f"{'=' * 50}\n\n"
        f"Name:      {submission.name}\n"
        f"Email:     {submission.email}\n"
        f"Company:   {submission.company}\n"
        f"Subject:   {submission.subject}\n"
        f"Submitted: {ts}\n\n"
        f"Message:\n{submission.message}\n"
    )


def _send_email_sync(submission: ContactSubmission) -> None:
    """
    Send a plain-text notification email via SMTP (synchronous).
    Raises on failure — caller wraps in try/except.
    """
    smtp_host: str = getattr(settings, "smtp_host", "")
    smtp_port: int = int(getattr(settings, "smtp_port", 587))
    smtp_user: str = getattr(settings, "smtp_user", "")
    smtp_password: str = getattr(settings, "smtp_password", "")
    smtp_from: str = getattr(settings, "smtp_from_email", smtp_user)
    notify_to: str = getattr(settings, "notification_email", "")

    if not smtp_host:
        log.warning(
            "SMTP not configured (smtp_host is empty) — skipping email notification "
            "for contact submission id=%s",
            submission.id,
        )
        return

    msg = MIMEText(_build_email_body(submission), "plain", "utf-8")
    msg["Subject"] = f"[Neural Protocol] New contact: {submission.subject}"
    msg["From"] = smtp_from or smtp_user
    msg["To"] = notify_to

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
        smtp.ehlo()
        if smtp.has_extn("STARTTLS"):
            smtp.starttls()
            smtp.ehlo()
        if smtp_user and smtp_password:
            smtp.login(smtp_user, smtp_password)
        smtp.sendmail(msg["From"], [notify_to], msg.as_string())


async def _send_notification_email(submission: ContactSubmission) -> None:
    """
    Async wrapper — runs the blocking SMTP call in a thread pool.
    Never raises: email failure is logged and swallowed so the API response
    is never broken by email infrastructure issues.
    """
    try:
        await asyncio.to_thread(_send_email_sync, submission)
        log.info("Email notification sent for contact submission id=%s", submission.id)
    except Exception as exc:
        log.warning(
            "Failed to send email notification for contact submission id=%s: %s",
            submission.id,
            exc,
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=ContactResponse, status_code=201)
async def submit_contact(
    body: ContactCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    """
    Submit a contact form.
    Stores the submission in the database and sends an email notification
    (non-blocking — email failure never breaks the response).
    """
    ip: Optional[str] = request.client.host if request.client else None

    submission = ContactSubmission(
        name=body.name,
        email=body.email,
        company=body.company,
        subject=body.subject,
        message=body.message,
        status="new",
        ip_address=ip,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    # Fire-and-forget email — never awaited on the critical path
    asyncio.create_task(_send_notification_email(submission))

    return _map_contact(submission)


@router.get("", response_model=List[ContactResponse])
async def list_contacts(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> List[ContactResponse]:
    """
    List all contact form submissions, newest first.
    Admin endpoint — optionally filter by ?status=new|read|replied.
    """
    stmt = select(ContactSubmission).order_by(ContactSubmission.submitted_at.desc())
    if status is not None:
        if status not in _VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}",
            )
        stmt = stmt.where(ContactSubmission.status == status)

    result = await db.execute(stmt)
    submissions = result.scalars().all()
    return [_map_contact(s) for s in submissions]


@router.put("/{submission_id}/status", response_model=ContactResponse)
async def update_contact_status(
    submission_id: str,
    new_status: str,
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    """
    Update the status of a contact submission.
    Query param: new_status=new|read|replied
    Admin endpoint.
    """
    if new_status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"new_status must be one of: {', '.join(sorted(_VALID_STATUSES))}",
        )

    result = await db.execute(
        select(ContactSubmission).where(ContactSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Contact submission not found")

    submission.status = new_status
    await db.commit()
    await db.refresh(submission)
    return _map_contact(submission)
