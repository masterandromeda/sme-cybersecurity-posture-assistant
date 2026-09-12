# Changelog

All notable changes to Neural Protocol are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [1.0.0] - 2025-01-01

### Added

#### Frontend
- Full Next.js 14 App Router application with TypeScript
- Auth system with route guard, `AuthContext`, demo credentials
- Persistent collapsible sidebar with Neural Protocol branding and workspace switcher
- Top navigation with global search (debounced) and notifications panel
- **Dashboard** — Security Command Center with animated score ring, real backend data, live assessment panel
- **AnimatedScoreRing** — SVG arc animation, count-up counter, delta badge, status labels (VERIFIED / DEMO DATA / CALCULATING)
- **Assessments** — Real-time scanning with polling, step-by-step progress ticker, findings display, PDF + JSON download
- **Findings** — Plain-language findings from real backend with mock fallback; dual card components for both data shapes
- **Remediation Center** — Priority scoring (Risk × Impact ÷ Effort), step-by-step fix guides, progress tracker
- **Monitoring** — Alert timeline, exposure monitoring
- **Accounts & Vendors** — Asset management, vendor risk tracking
- **Posture** — Score history, posture trends
- **Readiness** — Compliance readiness tracker
- **Help & Support** — Live WebSocket chat, Email (mailto), Documentation tab, FAQ tab
- **Documentation** — 10 full-content sections, search, quick navigation
- **Pricing** — 3-tier plans (Free / Professional / Business) with working CTAs
- **Contact** — Real form → FastAPI → PostgreSQL + async email notification
- **Support Admin** — Agent inbox to read and reply to conversations
- **Legal pages** — Privacy Policy, Terms of Service, Security, Cookie Policy
- **Site Footer** — All links functional, Neural Protocol branding
- `DataBadge` component — always distinguishes REAL DATA vs DEMO DATA

#### Backend
- FastAPI application on port 8001 (configurable)
- Assessment engine — Nmap port scan, HTTPX security headers, dnspython email records, Python ssl certificate check
- Finding engine — raw probe evidence → structured plain-language findings
- AI Module #2 — OpenAI finding explainer with rule-based fallback
- AI Module #3 — Security Copilot grounded in real assessment data
- Support chat system — WebSocket real-time + REST endpoints + PostgreSQL persistence
- Contact form — store submission + async SMTP email notification
- PDF report generation (ReportLab A4)
- JSON report export
- `GET /api/v1/assessments` list endpoint (used by dashboard on mount)
- New DB models: `SupportConversation`, `SupportMessage`, `ContactSubmission`
- SMTP configuration via environment variables (graceful no-op if unconfigured)

#### Infrastructure
- Next.js proxy rewrites — all `/api/v1/*` and `/health` proxied to backend (no CORS)
- `.env.example` updated with SMTP variables
- `.gitignore` updated — excludes Python venv, `__pycache__`, `.db`, scratch files
- `LICENSE` (MIT)
- `CONTRIBUTING.md`
- GitHub Actions CI workflow
- Issue and PR templates
- Professional `README.md` with badges, architecture, full API reference

---

## [0.1.0] - Initial scaffold

- Next.js project bootstrapped with `create-next-app`
