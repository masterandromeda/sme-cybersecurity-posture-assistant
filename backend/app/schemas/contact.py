"""Pydantic v2 schemas for contact form submissions.

ContactCreate and ContactResponse are re-exported from app.schemas.support
so that routers can import from either location.
"""
from __future__ import annotations

from app.schemas.support import ContactCreate, ContactResponse

__all__ = ["ContactCreate", "ContactResponse"]
