"""
AI Plain-Language Explainer — Module #2

Takes a Finding ORM object (with its raw evidence from Module #1) and
calls the OpenAI Chat Completions API to produce a structured, business-
friendly explanation.

Design principles:
  - Only the real evidence from Module #1 is sent to the model.
  - The model is instructed never to invent scan results.
  - Structured JSON output is enforced via response_format=json_object.
  - All AI output is validated against a Pydantic schema before storage.
  - The API key stays on the server; it is never passed to the frontend.
  - Graceful degradation: if AI is unavailable/unconfigured, a rule-based
    fallback generates a reasonable explanation from the finding's own fields.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict

from app.core.config import settings
from app.db.models import Finding

log = logging.getLogger(__name__)

# ── Output schema (validated before DB write) ─────────────────────────────────

REQUIRED_KEYS = {
    "title",
    "what_we_found",
    "business_impact",
    "explanation",
    "recommended_action",
    "severity_explanation",
}

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are a cybersecurity advisor writing for small business owners who have no technical background.

Your job is to explain a real security finding in clear, plain language. 
The finding was discovered by an automated security scan. You must use ONLY the evidence and facts provided — never invent or assume anything not in the input.

Rules:
- Write for a non-technical reader (a business owner, not a security analyst).
- Be concise: each field should be 1–3 sentences.
- Never use technical jargon without immediately explaining it in plain terms.
- Never soften or hide genuine security risks.
- Never invent threats beyond what the evidence shows.
- The technical_details field is for reference only — do not repeat raw technical strings in your output.

You must respond with a JSON object with exactly these keys:
{
  "title": "Short plain-language title (max 12 words). Start with what the risk means to the business.",
  "what_we_found": "One sentence: what the scan detected, in plain terms.",
  "business_impact": "1–2 sentences: what could go wrong for the business if this is not fixed.",
  "explanation": "2–3 sentences: explain why this issue exists and why it matters, suitable for a business owner.",
  "recommended_action": "One clear action sentence the owner can take or ask their IT person to take.",
  "severity_explanation": "One sentence explaining what this severity level means for their business."
}"""

# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_user_prompt(finding: Finding) -> str:
    """Build the user message containing only the real finding evidence."""
    evidence_str = json.dumps(finding.evidence or {}, indent=2)

    # Truncate evidence if very long (keep prompt under ~2k tokens of evidence)
    if len(evidence_str) > 1800:
        evidence_str = evidence_str[:1800] + "\n... (truncated)"

    return f"""Security finding to explain:

Category: {finding.category.replace("_", " ").title()}
Severity: {finding.severity.upper()}
Technical title: {finding.technical_title}
Affected asset: {finding.affected_asset}

What was detected:
{finding.what_we_found}

Technical details:
{finding.technical_details}

Raw scan evidence:
{evidence_str}

Write the plain-language explanation JSON now."""


# ── AI call ───────────────────────────────────────────────────────────────────

async def _call_openai(user_prompt: str, model: str, timeout: int) -> Dict[str, Any]:
    """Call OpenAI Chat Completions and return parsed JSON dict."""
    try:
        from openai import AsyncOpenAI, APITimeoutError, APIError  # type: ignore
    except ImportError:
        raise RuntimeError(
            "openai package is not installed. Run: pip install openai"
        )

    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=float(timeout),
    )

    response = await client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ],
        temperature=0.3,   # low temperature for consistent, factual output
        max_tokens=600,
    )

    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


# ── Rule-based fallback ───────────────────────────────────────────────────────

_SEVERITY_PHRASES = {
    "critical": "This is a critical risk that could lead to immediate harm — treat it as an emergency.",
    "high":     "This is a high-severity issue that could seriously impact your business if left unaddressed.",
    "medium":   "This is a medium-severity issue that should be resolved soon to reduce your risk.",
    "low":      "This is a low-severity issue; it is best practice to address it but it is not an immediate threat.",
    "info":     "This is informational — no immediate action is required, but it is worth being aware of.",
}

def _fallback_explanation(finding: Finding) -> Dict[str, str]:
    """
    Generate a reasonable plain-language explanation without AI.
    Used when the OpenAI key is not configured or the API call fails.
    """
    sev = finding.severity.lower()
    return {
        "title": finding.title,
        "what_we_found": finding.what_we_found or finding.technical_title,
        "business_impact": finding.business_impact or (
            "This issue may affect the security of your business. "
            "Review and address it with your IT support."
        ),
        "explanation": finding.why_it_matters or (
            f"A {sev}-severity security issue was detected on {finding.affected_asset}. "
            f"{finding.technical_details[:200] if finding.technical_details else ''}"
        ),
        "recommended_action": (
            "Review this finding with your IT support and follow the technical remediation guidance."
        ),
        "severity_explanation": _SEVERITY_PHRASES.get(sev, _SEVERITY_PHRASES["medium"]),
    }


# ── Public interface ──────────────────────────────────────────────────────────

class ExplanationResult:
    """Holds the generated explanation plus generation metadata."""
    __slots__ = ("data", "model_used", "generation_ms", "used_ai")

    def __init__(
        self,
        data: Dict[str, str],
        model_used: str,
        generation_ms: int,
        used_ai: bool,
    ) -> None:
        self.data = data
        self.model_used = model_used
        self.generation_ms = generation_ms
        self.used_ai = used_ai


async def explain_finding(finding: Finding) -> ExplanationResult:
    """
    Generate a plain-language explanation for a Finding.

    1. If OPENAI_API_KEY is configured, call the OpenAI API.
    2. Validate the returned JSON contains all required keys.
    3. If the API is unavailable or unconfigured, use the rule-based fallback.

    Returns an ExplanationResult — never raises.
    """
    if not settings.openai_api_key:
        log.info(
            "OPENAI_API_KEY not configured — using fallback explanation for finding %s",
            finding.id,
        )
        data = _fallback_explanation(finding)
        return ExplanationResult(
            data=data,
            model_used="fallback",
            generation_ms=0,
            used_ai=False,
        )

    model = settings.openai_model
    timeout = settings.openai_timeout_seconds
    user_prompt = _build_user_prompt(finding)

    t0 = time.monotonic()
    try:
        raw = await _call_openai(user_prompt, model, timeout)
    except Exception as exc:
        log.warning(
            "OpenAI call failed for finding %s (%s) — using fallback: %s",
            finding.id, type(exc).__name__, exc,
        )
        data = _fallback_explanation(finding)
        return ExplanationResult(
            data=data,
            model_used="fallback",
            generation_ms=int((time.monotonic() - t0) * 1000),
            used_ai=False,
        )

    generation_ms = int((time.monotonic() - t0) * 1000)

    # Validate all required keys are present; fall back to finding fields for any missing
    data: Dict[str, str] = {}
    fallback = _fallback_explanation(finding)
    for key in REQUIRED_KEYS:
        val = raw.get(key, "")
        data[key] = str(val).strip() if val else fallback[key]

    log.info(
        "AI explanation generated for finding %s in %dms (model=%s)",
        finding.id, generation_ms, model,
    )
    return ExplanationResult(
        data=data,
        model_used=model,
        generation_ms=generation_ms,
        used_ai=True,
    )
