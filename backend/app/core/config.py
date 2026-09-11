"""Application settings loaded from environment / .env file."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = "sqlite+aiosqlite:///./neural_protocol.db"

    # API
    api_secret_key: str = "change-me"

    # OpenAI — used by Module #2 (Plain Language Findings) on the backend only.
    # Never forwarded to the frontend.
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"   # override to gpt-4o for higher quality
    openai_timeout_seconds: int = 30

    # CORS — kept as plain str so pydantic-settings never JSON-parses it.
    # Use the cors_origins_list property everywhere instead.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins as a list, split on commas."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # Scan limits
    max_concurrent_scans: int = 3
    nmap_timeout_seconds: int = 60
    http_timeout_seconds: int = 15
    ssl_timeout_seconds: int = 10
    dns_timeout_seconds: int = 8

    # Rate limiting
    rate_limit_assessments_per_hour: int = 10

    # ── Email / SMTP (for contact form + support notifications) ───────────────
    # Leave smtp_host empty to disable email sending (graceful fallback).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""          # defaults to smtp_user if empty
    notification_email: str = "dubeykumar878@gmail.com"  # where notifications go


settings = Settings()
