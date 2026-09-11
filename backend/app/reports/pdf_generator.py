"""
PDF Report Generator — uses ReportLab to produce a professional
security assessment report PDF.

No external fonts required — uses ReportLab's built-in Helvetica family.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Colour palette ────────────────────────────────────────────────────────────
_BRAND_DARK  = colors.HexColor("#0f172a")
_BRAND_BLUE  = colors.HexColor("#3b82f6")
_BRAND_LIGHT = colors.HexColor("#e2e8f0")

_SEVERITY_COLORS = {
    "critical": colors.HexColor("#ef4444"),
    "high":     colors.HexColor("#f97316"),
    "medium":   colors.HexColor("#eab308"),
    "low":      colors.HexColor("#3b82f6"),
    "info":     colors.HexColor("#94a3b8"),
}

_PAGE_W, _PAGE_H = A4
_MARGIN = 20 * mm


def _styles():
    ss = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "RPTitle",
        parent=ss["Heading1"],
        fontSize=22,
        textColor=_BRAND_DARK,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    h2_style = ParagraphStyle(
        "RPH2",
        parent=ss["Heading2"],
        fontSize=14,
        textColor=_BRAND_DARK,
        spaceBefore=12,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "RPBody",
        parent=ss["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#334155"),
        leading=13,
    )
    label_style = ParagraphStyle(
        "RPLabel",
        parent=ss["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Oblique",
    )
    return title_style, h2_style, body_style, label_style


def _severity_badge_text(severity: str) -> str:
    return severity.upper()


def build_pdf_report(
    assessment: Dict[str, Any],
    findings: List[Dict[str, Any]],
) -> bytes:
    """
    Build and return a PDF report as bytes.

    `assessment` and `findings` are plain dicts (already serialised from ORM objects).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=_MARGIN,
        rightMargin=_MARGIN,
        topMargin=_MARGIN,
        bottomMargin=_MARGIN,
        title="Neural Protocol — Security Assessment Report",
    )

    title_style, h2_style, body_style, label_style = _styles()
    story = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Paragraph("Neural Protocol", ParagraphStyle(
        "brand", fontSize=11, textColor=_BRAND_BLUE, fontName="Helvetica-Bold", spaceAfter=2,
    )))
    story.append(Paragraph("Security Assessment Report", title_style))
    story.append(Paragraph(
        f"Domain: <b>{assessment['domain']}</b>", body_style
    ))
    generated = datetime.now(timezone.utc).strftime("%d %B %Y at %H:%M UTC")
    story.append(Paragraph(f"Generated: {generated}", label_style))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=_BRAND_BLUE))
    story.append(Spacer(1, 4 * mm))

    # ── Executive Summary ─────────────────────────────────────────────────────
    story.append(Paragraph("Executive Summary", h2_style))

    fc = assessment.get("findings_count", {})
    total_findings = sum(fc.values())
    score = assessment.get("overall_score", 0)
    status = assessment.get("status", "unknown")

    summary_data = [
        ["Assessment Status", status.title()],
        ["Overall Score", f"{score} / 100"],
        ["Total Findings", str(total_findings)],
        ["Critical", str(fc.get("critical", 0))],
        ["High",     str(fc.get("high", 0))],
        ["Medium",   str(fc.get("medium", 0))],
        ["Low",      str(fc.get("low", 0))],
        ["Completed", assessment.get("completed_at", "N/A")],
    ]
    summary_table = Table(summary_data, colWidths=[60 * mm, 80 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("TEXTCOLOR",   (0, 0), (-1, -1), _BRAND_DARK),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 6 * mm))

    # ── Category Results ──────────────────────────────────────────────────────
    if assessment.get("categories"):
        story.append(Paragraph("Assessment Categories", h2_style))
        cat_data = [["Category", "Score", "Findings", "Status"]]
        for cat in assessment["categories"]:
            cat_data.append([
                cat.get("label", cat.get("category", "")),
                f"{cat.get('score', 0):.0f} / 100",
                str(cat.get("findings", 0)),
                cat.get("status", "").upper(),
            ])
        cat_table = Table(cat_data, colWidths=[70 * mm, 30 * mm, 30 * mm, 30 * mm])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), _BRAND_DARK),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING",  (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 6 * mm))

    # ── Findings ──────────────────────────────────────────────────────────────
    if findings:
        story.append(Paragraph("Detailed Findings", h2_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=_BRAND_LIGHT))
        story.append(Spacer(1, 3 * mm))

        # Sort: critical first
        _order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        sorted_findings = sorted(findings, key=lambda f: _order.get(f.get("severity", "info"), 5))

        for i, finding in enumerate(sorted_findings, 1):
            severity = finding.get("severity", "info")
            sev_color = _SEVERITY_COLORS.get(severity, colors.grey)

            # Finding header row: number + severity badge + title
            header_data = [[
                Paragraph(f"<b>#{i}</b>", body_style),
                Paragraph(
                    f'<font color="{sev_color.hexval() if hasattr(sev_color, "hexval") else "#94a3b8"}">'
                    f'<b>{severity.upper()}</b></font>',
                    body_style,
                ),
                Paragraph(f"<b>{finding.get('title', '')}</b>", body_style),
            ]]
            header_table = Table(header_data, colWidths=[10 * mm, 22 * mm, 128 * mm])
            header_table.setStyle(TableStyle([
                ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                ("TOPPADDING",   (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
                ("LEFTPADDING",  (0, 0), (-1, -1), 6),
                ("GRID",         (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
            ]))
            story.append(header_table)

            # Detail block
            detail_rows = [
                ["Asset",          finding.get("affected_asset", "")],
                ["Category",       finding.get("category", "").replace("_", " ").title()],
                ["What We Found",  finding.get("what_we_found", "")],
                ["Business Impact",finding.get("business_impact", "")],
                ["Why It Matters", finding.get("why_it_matters", "")],
                ["Technical Details", finding.get("technical_details", "").replace("\n", " | ")],
            ]
            detail_data = [
                [Paragraph(label, label_style), Paragraph(value, body_style)]
                for label, value in detail_rows
                if value
            ]
            if detail_data:
                detail_table = Table(detail_data, colWidths=[38 * mm, 122 * mm])
                detail_table.setStyle(TableStyle([
                    ("FONTSIZE",    (0, 0), (-1, -1), 8),
                    ("TOPPADDING",  (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (0, -1), 6),
                    ("VALIGN",      (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
                    ("LINEBELOW",   (0, -1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ]))
                story.append(detail_table)

            story.append(Spacer(1, 3 * mm))

    # ── Footer note ───────────────────────────────────────────────────────────
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_BRAND_LIGHT))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "This report was generated by Neural Protocol. "
        "All checks are non-intrusive and performed only on assets explicitly submitted for assessment. "
        "Results reflect the state of the target at the time of the scan.",
        label_style,
    ))

    doc.build(story)
    return buffer.getvalue()
