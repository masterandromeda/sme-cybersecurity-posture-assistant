<div align="center">

<img src="public/logo.png" alt="Neural Protocol" width="64" height="64" />

# Neural Protocol

### AI-powered SME Cybersecurity Posture Assistant

**Security intelligence for growing businesses.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-yellow?logo=python&logoColor=white)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

[Live Demo](#) · [Documentation](/docs) · [Report Bug](https://github.com/masterandromeda/sme-cybersecurity-posture-assistant/issues) · [Request Feature](https://github.com/masterandromeda/sme-cybersecurity-posture-assistant/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Neural Protocol solves a critical gap: **small businesses depend on email, websites, payments, and cloud services but rarely have a dedicated security team.** Existing tools produce raw technical findings that require an analyst to interpret.

Neural Protocol transforms technical security data into:

> **Understand → Prioritise → Fix → Monitor → Improve → Prove**

A business owner can understand their full security posture, see what needs fixing first, follow step-by-step remediation guides, and generate compliance-ready reports — **without any cybersecurity expertise.**

---

## Features

### 🔍 Real Security Assessment Engine
- Safe, non-intrusive domain scanning (no exploitation)
- **7 probe categories**: Exposed Services, Domain Security, Email Security, SSL/TLS, Security Headers, Patch Hygiene, Account Hygiene
- 30+ automated checks per scan
- Real-time progress with step-by-step live ticker
- PDF + JSON report export

### 📊 Animated Security Score
- 0–100 posture score with animated SVG ring
- Grade system (A–F) with colour-coded thresholds
- Score history chart (Recharts)
- Before/after delta after each assessment

### 🗣️ Plain-Language Findings
- Every technical finding transformed into business language
- "What we found", "Why it matters", "Business impact"
- Collapsible technical details for advanced users
- AI-enriched explanations via OpenAI (with rule-based fallback)

### 🛠️ Prioritised Remediation
- Fix-first queue ranked by: `Risk Reduction × Business Impact ÷ Effort`
- Step-by-step guided fix panels
- Progress tracker (Step N of M)
- Verified on next scan — never claims a fix unless confirmed

### 🤖 AI Security Copilot
- Multi-turn conversation grounded in **real assessment data**
- Context-aware answers (score, findings, domain)
- Graceful fallback when OpenAI is unconfigured

### 💬 Live Support Chat
- Real-time WebSocket chat (FastAPI + PostgreSQL)
- Message history persisted in database
- Support admin inbox at `/support-admin`
- Online/Offline indicator

### 📧 Contact & Support
- Contact form → PostgreSQL → email notification via SMTP
- Help & Support page with Live Chat, Email, Documentation, FAQ tabs
- Full documentation browser with search

### 💰 Pricing & Marketing
- 3-tier pricing (Free / Professional / Business)
- Working CTAs (mailto links for paid plans)
- Premium site footer with all links functional

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **UI Components** | shadcn/ui, Lucide React, Framer Motion |
| **Charts** | Recharts |
| **Backend** | FastAPI, Python 3.11+ |
| **Database** | SQLAlchemy async, SQLite (dev) / PostgreSQL (prod) |
| **Real-time** | FastAPI WebSockets |
| **Security Scanning** | Nmap, HTTPX, dnspython, Python ssl |
| **AI** | OpenAI API (gpt-4o-mini), rule-based fallback |
| **Reports** | ReportLab (PDF), JSON |

---

## Project Structure

```
sme-cybersecurity-posture-assistant/
│
├── 📁 backend/                          # FastAPI backend
│   ├── run.py                           # Entry point (port 8001)
│   ├── pyproject.toml                   # Python dependencies
│   ├── .env.example                     # Environment variable template
│   └── app/
│       ├── main.py                      # FastAPI app + CORS + lifespan
│       ├── core/
│       │   └── config.py                # Pydantic-settings (env vars)
│       ├── db/
│       │   ├── session.py               # Async SQLAlchemy engine + get_db
│       │   ├── models.py                # Assessment, Finding, FindingExplanation
│       │   └── models_support.py        # SupportConversation, SupportMessage, ContactSubmission
│       ├── schemas/
│       │   ├── assessment.py            # Assessment request/response schemas
│       │   ├── findings.py              # Finding detail + explanation schemas
│       │   ├── support.py               # Support chat schemas
│       │   ├── contact.py               # Contact form schemas
│       │   └── copilot.py               # Copilot request/response schemas
│       ├── engine/
│       │   ├── target_validator.py      # Blocks private IPs / internal hosts
│       │   ├── runner.py                # Assessment orchestrator
│       │   ├── finding_engine.py        # Raw evidence → structured findings
│       │   └── probes/
│       │       ├── exposed_services.py  # Nmap safe TCP scan
│       │       ├── web_security.py      # HTTPX: HTTPS + security headers
│       │       ├── dns_email.py         # SPF, DKIM, DMARC, DNSSEC
│       │       └── ssl_tls.py           # Certificate validity + cipher check
│       ├── ai/
│       │   ├── explainer.py             # Module #2: OpenAI finding explainer
│       │   ├── copilot_context.py       # DB context gatherer for copilot
│       │   └── copilot_ai.py            # Module #3: OpenAI copilot + fallback
│       ├── reports/
│       │   └── pdf_generator.py         # ReportLab A4 PDF report
│       └── api/v1/
│           ├── router.py                # Registers all routers
│           └── endpoints/
│               ├── assessments.py       # POST/GET assessments + reports
│               ├── findings.py          # GET finding + POST explain
│               ├── copilot.py           # POST /copilot/chat
│               ├── support.py           # WebSocket + REST support chat
│               └── contact.py           # Contact form + admin
│
├── 📁 src/                              # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx                   # Root layout + AuthProvider
│   │   ├── page.tsx                     # Root redirect → /dashboard
│   │   ├── globals.css                  # Design tokens + dark theme
│   │   ├── login/page.tsx               # Full-screen auth (Three.js bg)
│   │   └── (app)/                       # Auth-guarded app shell
│   │       ├── layout.tsx               # Sidebar + TopNav + Footer + Copilot
│   │       ├── dashboard/page.tsx       # Security Command Center
│   │       ├── assessments/page.tsx     # Real-time assessment engine
│   │       ├── findings/page.tsx        # Plain-language findings
│   │       ├── remediation/page.tsx     # Prioritised remediation
│   │       ├── monitoring/page.tsx      # Continuous monitoring
│   │       ├── accounts/page.tsx        # Assets + vendor risk
│   │       ├── posture/page.tsx         # Score history + posture
│   │       ├── readiness/page.tsx       # Compliance readiness
│   │       ├── help/page.tsx            # Help + Live Chat + Docs + FAQ
│   │       ├── docs/page.tsx            # Full documentation
│   │       ├── pricing/page.tsx         # Pricing plans
│   │       ├── contact/page.tsx         # Contact form
│   │       ├── support-admin/page.tsx   # Support inbox (agents)
│   │       ├── settings/page.tsx        # Account settings
│   │       ├── privacy/page.tsx         # Privacy policy
│   │       ├── terms/page.tsx           # Terms of service
│   │       ├── security/page.tsx        # Security disclosure
│   │       └── cookies/page.tsx         # Cookie policy
│   ├── components/
│   │   ├── auth/
│   │   │   └── NeuralBackground.tsx     # Three.js star/constellation scene
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx              # Collapsible sidebar + workspace switcher
│   │   │   └── TopNav.tsx               # Search + notifications
│   │   ├── copilot/
│   │   │   └── SecurityCopilot.tsx      # AI copilot panel (real backend)
│   │   ├── support/
│   │   │   └── LiveSupportChat.tsx      # WebSocket live chat widget
│   │   ├── marketing/
│   │   │   ├── Documentation.tsx        # Searchable docs (10 sections)
│   │   │   ├── Pricing.tsx              # 3-tier pricing plans
│   │   │   ├── ContactSection.tsx       # Contact form (real backend)
│   │   │   └── SiteFooter.tsx           # Premium site footer
│   │   └── ui/
│   │       ├── AnimatedScoreRing.tsx    # Animated SVG score ring
│   │       ├── ScoreRing.tsx            # Static score ring
│   │       ├── card.tsx                 # Card components
│   │       └── badges.tsx               # RiskBadge, StatusBadge
│   ├── contexts/
│   │   └── AuthContext.tsx              # useAuth hook + session
│   ├── lib/
│   │   ├── services.ts                  # API service layer (assessment + copilot)
│   │   ├── support-service.ts           # Support chat + contact API
│   │   ├── mock-data.ts                 # Mock data (fallback when backend offline)
│   │   ├── auth.ts                      # Mock auth (swap for real auth later)
│   │   └── utils.ts                     # cn(), formatDate, scoreColor, riskColor
│   └── types/
│       └── index.ts                     # All domain TypeScript types
│
├── next.config.ts                       # Next.js + proxy rewrites → backend:8001
├── tailwind.config.ts                   # Tailwind design tokens
├── tsconfig.json                        # TypeScript config
└── package.json                         # Frontend dependencies
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.11+
- **Nmap** (for port scanning): [Download](https://nmap.org/download.html)

### 1. Clone

```bash
git clone https://github.com/masterandromeda/sme-cybersecurity-posture-assistant.git
cd sme-cybersecurity-posture-assistant
```

### 2. Frontend

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 3. Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux / macOS)
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment file
copy .env.example .env      # Windows
# cp .env.example .env      # Linux / macOS

# Start server (port 8001)
python run.py
# → http://localhost:8001/docs
```

### 4. Login

Open **http://localhost:3000** and use the demo credentials:

| Email | Password |
|-------|----------|
| `demo@neuralprotocol.io` | `demo1234` |
| `alex@acmecorp.com` | `demo1234` |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
# Database (SQLite for dev, PostgreSQL for prod)
DATABASE_URL=sqlite+aiosqlite:///./neural_protocol.db
# DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/neural_protocol

# API
API_SECRET_KEY=change-me-in-production

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# OpenAI — optional, rule-based fallback used if not set
OPENAI_API_KEY=sk-...

# SMTP — optional, contact form saves to DB regardless
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password
NOTIFICATION_EMAIL=dubeykumar878@gmail.com
```

---

## API Reference

Full interactive docs available at **http://localhost:8001/docs** (Swagger UI).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Backend health check |
| `POST` | `/api/v1/assessments` | Start a new assessment |
| `GET` | `/api/v1/assessments` | List recent assessments |
| `GET` | `/api/v1/assessments/{id}` | Get assessment status |
| `GET` | `/api/v1/assessments/{id}/findings` | Get all findings |
| `GET` | `/api/v1/assessments/{id}/report/json` | Full JSON report |
| `GET` | `/api/v1/assessments/{id}/report/pdf` | PDF report download |
| `POST` | `/api/v1/findings/{id}/explain` | AI explain a finding |
| `POST` | `/api/v1/copilot/chat` | Security Copilot message |
| `POST` | `/api/v1/support/conversations` | Start support chat |
| `GET` | `/api/v1/support/conversations` | List conversations (admin) |
| `POST` | `/api/v1/support/conversations/{id}/messages` | Send message |
| `WS` | `/api/v1/support/ws/{id}` | Real-time WebSocket chat |
| `POST` | `/api/v1/contact` | Submit contact form |

---

## Architecture

```
Browser
  │
  ├── Next.js (port 3000)
  │     ├── /api/v1/*  ──proxy──►  FastAPI (port 8001)
  │     └── /health    ──proxy──►  FastAPI (port 8001)
  │
  └── WebSocket  ws://localhost:8001/api/v1/support/ws/{id}
                         │
                    FastAPI (port 8001)
                         │
                    SQLAlchemy Async
                         │
                    SQLite (dev) / PostgreSQL (prod)
```

**Security scanning is always backend-only.** The frontend never calls Nmap, dnspython, or ssl directly. All probe results flow through the FastAPI engine, are persisted to the database, and served as structured JSON.

**API keys are always backend-only.** `OPENAI_API_KEY` is read from environment variables on the server and never exposed to the frontend.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```bash
# 1. Fork the repo
# 2. Create your feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes
# 4. Run the build
npm run build        # frontend
python -m pytest     # backend (if tests exist)

# 5. Commit with a conventional commit message
git commit -m "feat: add your feature"

# 6. Push and open a PR
git push origin feature/your-feature-name
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by [masterandromeda](https://github.com/masterandromeda)

**Neural Protocol** · Security intelligence for growing businesses

</div>
