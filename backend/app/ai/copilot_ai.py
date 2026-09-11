"""
Security Copilot AI service — Module #3

Receives the user's question plus the gathered workspace context,
calls the OpenAI Chat Completions API (non-streaming), and returns
a structured business-friendly answer.

Design rules:
  - System prompt locks the model to the SME business-owner persona.
  - Only data from the context block is used — model cannot invent findings.
  - Graceful fallback when no API key is configured.
  - No security data is ever returned to the frontend directly;
    only the AI-generated prose answer is returned.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from app.core.config import settings
from app.ai.copilot_context import WorkspaceContext, context_to_prompt_block

log = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are the Security Copilot for Neural Protocol, a cybersecurity assistant \
designed for small and medium-sized business owners who have no technical background.

Your role:
- Answer questions about the business's security posture in clear, plain English.
- Use ONLY the security data provided in the context block. Never invent findings, \
scores, assets, vendors, or scan results.
- If information is not in the context, say clearly: \
"The system hasn't assessed that area yet — run a full assessment to find out."
- Never use unexplained technical jargon. Always define terms in plain language.
- Be direct, concise, and actionable.
- Never be alarmist without evidence. Never downplay genuine risks.

Answer format (adapt to the question, but follow this structure when relevant):
1. Direct answer to the question (1–2 sentences).
2. What this means for the business (concrete, non-technical impact).
3. How serious it is (use plain language: not urgent / should be addressed soon / urgent / critical).
4. What to do next (clear numbered steps when giving actions).

Use **bold** for key terms and action items.
Keep total response under 300 words unless a detailed step-by-step is explicitly requested.
"""

# ── Fallback answers (no API key / API down) ──────────────────────────────────

def _fallback_answer(question: str, ctx: WorkspaceContext) -> str:
    """
    Rule-based answer using real context data when AI is unavailable.
    Much better than the old hard-coded strings — it uses real scores and counts.
    """
    q = question.lower()

    if not ctx.has_data:
        return (
            "No assessment data is available yet. "
            "Run a security assessment from the Assessments page to get real results about your domain."
        )

    a = ctx.latest_assessment
    assert a is not None
    score = a["overall_score"]
    domain = a["domain"]
    fc = a["findings_count"]
    total = sum(fc.values())
    critical = fc.get("critical", 0)
    high = fc.get("high", 0)

    # Find highest severity finding
    top_finding = ctx.findings[0] if ctx.findings else None

    if any(k in q for k in ("fix first", "priority", "start", "most important", "biggest")):
        if top_finding:
            return (
                f"Your highest priority right now is: **{top_finding['title']}** "
                f"(severity: {top_finding['severity'].upper()}).\n\n"
                f"{top_finding['business_impact']}\n\n"
                f"Address this before the other {total - 1} open findings."
            )
        return f"No open findings on {domain} — your security looks good from our last scan."

    if any(k in q for k in ("score", "low", "grade", "why", "improve")):
        parts = [f"Your current security score is **{score}/100** for **{domain}**."]
        if critical > 0 or high > 0:
            parts.append(
                f"The main factors pulling it down are: "
                f"{critical} critical and {high} high-severity findings that are still open."
            )
        if ctx.findings:
            cats = {f["category"] for f in ctx.findings}
            parts.append(
                f"Focus areas: {', '.join(c.replace('_', ' ').title() for c in cats)}."
            )
        return " ".join(parts)

    if any(k in q for k in ("finding", "issue", "problem", "vulnerability")):
        if ctx.findings:
            lines = [f"There are **{total} open findings** on {domain}:"]
            for f in ctx.findings[:5]:
                lines.append(f"• **{f['severity'].upper()}** — {f['title']}")
            if total > 5:
                lines.append(f"...and {total - 5} more. View them on the Findings page.")
            return "\n".join(lines)
        return f"No open findings on {domain} from the last assessment."

    if any(k in q for k in ("email", "spf", "dmarc", "dkim", "phishing", "spoof")):
        email_findings = [f for f in ctx.findings if "email" in f["category"]]
        if email_findings:
            return (
                f"Your email security has **{len(email_findings)} issue(s)**:\n"
                + "\n".join(f"• {f['title']}" for f in email_findings)
            )
        return f"No email security issues found on {domain} in the latest scan."

    if any(k in q for k in ("ssl", "tls", "certificate", "https")):
        ssl_findings = [f for f in ctx.findings if "ssl" in f["category"]]
        if ssl_findings:
            return (
                f"SSL/TLS issues on {domain}:\n"
                + "\n".join(f"• {f['title']}" for f in ssl_findings)
            )
        return f"No SSL/TLS issues found on {domain} in the latest scan."

    # Generic fallback
    return (
        f"Your security score is **{score}/100** for **{domain}** "
        f"with {total} open findings ({critical} critical, {high} high). "
        f"Ask me about specific areas like email security, SSL, exposed services, or what to fix first."
    )


# ── AI call ───────────────────────────────────────────────────────────────────

async def _call_openai(system: str, user: str, model: str, timeout: int) -> str:
    """Call OpenAI and return the assistant reply text."""
    from openai import AsyncOpenAI  # type: ignore

    client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=float(timeout))
    resp = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system",  "content": system},
            {"role": "user",    "content": user},
        ],
        temperature=0.4,
        max_tokens=500,
    )
    return (resp.choices[0].message.content or "").strip()


# ── Public interface ──────────────────────────────────────────────────────────

@dataclass
class CopilotReply:
    content: str
    used_ai: bool
    model_used: str
    latency_ms: int


async def answer_question(
    question: str,
    ctx: WorkspaceContext,
    conversation_history: list | None = None,
) -> CopilotReply:
    """
    Generate a security copilot answer using real workspace context.

    `conversation_history` is a list of {"role": ..., "content": ...} dicts
    for multi-turn context (last N turns only, to keep token usage bounded).
    """
    context_block = context_to_prompt_block(ctx)

    # Build the user message: context + question
    user_msg = f"""Current security data for this workspace:

{context_block}

---

User question: {question}"""

    # ── AI path ───────────────────────────────────────────────────────────────
    if settings.openai_api_key:
        model = settings.openai_model
        timeout = settings.openai_timeout_seconds

        # Build messages with optional conversation history (last 6 turns)
        messages: list = [{"role": "system", "content": _SYSTEM_PROMPT}]
        if conversation_history:
            for turn in conversation_history[-6:]:
                messages.append({"role": turn["role"], "content": turn["content"]})

        # Append the current user message (with context) only as the last user turn
        messages.append({"role": "user", "content": user_msg})

        t0 = time.monotonic()
        try:
            from openai import AsyncOpenAI  # type: ignore
            client = AsyncOpenAI(api_key=settings.openai_api_key, timeout=float(timeout))
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.4,
                max_tokens=500,
            )
            content = (resp.choices[0].message.content or "").strip()
            latency = int((time.monotonic() - t0) * 1000)
            log.info("Copilot AI answered in %dms (model=%s)", latency, model)
            return CopilotReply(content=content, used_ai=True, model_used=model, latency_ms=latency)

        except Exception as exc:
            log.warning("OpenAI copilot call failed (%s) — using fallback", exc)

    # ── Fallback path ─────────────────────────────────────────────────────────
    t0 = time.monotonic()
    content = _fallback_answer(question, ctx)
    latency = int((time.monotonic() - t0) * 1000)
    return CopilotReply(
        content=content, used_ai=False, model_used="fallback", latency_ms=latency
    )
