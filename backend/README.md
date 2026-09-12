# Neural Protocol — Backend

FastAPI backend for the Neural Protocol SME Cybersecurity Posture Assistant.

---

## Stack

| Tool | Purpose |
|------|---------|
| **FastAPI** | Web framework + WebSocket support |
| **SQLAlchemy** (async) | ORM — SQLite dev / PostgreSQL prod |
| **Nmap** | Safe TCP port scan |
| **HTTPX** | HTTP header inspection |
| **dnspython** | SPF, DKIM, DMARC, DNSSEC |
| **Python ssl** | Certificate validity + cipher check |
| **OpenAI** | AI plain-language findings + Copilot |
| **ReportLab** | PDF report generation |

---

## Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Linux / macOS)
source .venv/bin/activate

# Install all dependencies
pip install -e ".[dev]"

# Copy and edit environment file
copy .env.example .env        # Windows
# cp .env.example .env        # Linux / macOS
```

---

## Run

```bash
python run.py
# Server starts on: http://localhost:8001
# Swagger UI:       http://localhost:8001/docs
# ReDoc:            http://localhost:8001/redoc
```

---

## Environment Variables

See [`.env.example`](.env.example) for all variables with descriptions.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | SQLite | DB connection string |
| `API_SECRET_KEY` | Yes | `change-me` | App secret |
| `CORS_ORIGINS` | No | `localhost:3000` | Allowed frontend origins |
| `OPENAI_API_KEY` | No | _(empty)_ | Enables AI features |
| `SMTP_HOST` | No | _(empty)_ | Email sending host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | _(empty)_ | SMTP username |
| `SMTP_PASSWORD` | No | _(empty)_ | SMTP password |
| `NOTIFICATION_EMAIL` | No | `dubeykumar878@gmail.com` | Receives contact form alerts |

---

## System Requirements

### Nmap (required for port scanning)

| OS | Install |
|----|---------|
| Windows | [nmap.org/download.html](https://nmap.org/download.html) — add to PATH |
| Ubuntu/Debian | `sudo apt install nmap` |
| macOS | `brew install nmap` |

Without Nmap, the `exposed_services` probe is skipped gracefully.

---

## API Endpoints

### Assessments

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/assessments` | Start assessment (returns `202 Accepted`) |
| `GET` | `/api/v1/assessments` | List assessments (`?limit=N`) |
| `GET` | `/api/v1/assessments/{id}` | Poll assessment status |
| `GET` | `/api/v1/assessments/{id}/findings` | Get all findings |
| `GET` | `/api/v1/assessments/{id}/report/json` | Full JSON report |
| `GET` | `/api/v1/assessments/{id}/report/pdf` | PDF download |

### Findings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/findings/{id}` | Get single finding detail |
| `POST` | `/api/v1/findings/{id}/explain` | AI-generate plain-language explanation |

### Security Copilot

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/copilot/chat` | Send message (multi-turn, real DB context) |

### Support Chat

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/support/conversations` | Create conversation + first message |
| `GET` | `/api/v1/support/conversations` | List all (`?status=open\|closed\|all`) |
| `GET` | `/api/v1/support/conversations/{id}` | Get with messages |
| `POST` | `/api/v1/support/conversations/{id}/messages` | Add message |
| `POST` | `/api/v1/support/conversations/{id}/close` | Close conversation |
| `WS` | `/api/v1/support/ws/{id}` | Real-time WebSocket |

### Contact

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/contact` | Submit contact form |
| `GET` | `/api/v1/contact` | List submissions (admin) |
| `PUT` | `/api/v1/contact/{id}/status` | Update status |

---

## Architecture

```
app/
├── main.py                   # FastAPI app, CORS, lifespan (init_db)
├── core/
│   └── config.py             # Pydantic-settings — reads .env
├── db/
│   ├── session.py            # Async engine, get_db, init_db
│   ├── models.py             # Assessment, Finding, FindingExplanation
│   └── models_support.py     # SupportConversation, SupportMessage, ContactSubmission
├── schemas/
│   ├── assessment.py         # Request/response Pydantic models
│   ├── findings.py           # Finding detail + explanation
│   ├── support.py            # Support chat + contact schemas
│   ├── contact.py            # Re-exports from support.py
│   └── copilot.py            # Copilot request/response
├── engine/
│   ├── target_validator.py   # Blocks private IPs, loopback, CGNAT
│   ├── runner.py             # Orchestrates all probes concurrently
│   ├── finding_engine.py     # Probe evidence → RawFinding objects
│   └── probes/
│       ├── exposed_services.py  # Nmap safe TCP scan (25 common ports)
│       ├── web_security.py      # HTTPX: HTTPS redirect + 7 security headers
│       ├── dns_email.py         # dnspython: SPF, DMARC, DKIM, DNSSEC, MX
│       └── ssl_tls.py           # Python ssl: cert validity, expiry, cipher
├── ai/
│   ├── explainer.py          # OpenAI finding explainer + rule-based fallback
│   ├── copilot_context.py    # Fetches real DB context for copilot
│   └── copilot_ai.py         # OpenAI copilot response + fallback
├── reports/
│   └── pdf_generator.py      # ReportLab A4 PDF with findings
└── api/v1/
    ├── router.py             # Assembles all endpoint routers
    └── endpoints/
        ├── assessments.py    # POST/GET assessments, findings, reports
        ├── findings.py       # GET finding + POST explain
        ├── copilot.py        # POST /copilot/chat
        ├── support.py        # WebSocket + REST support chat
        └── contact.py        # Contact form + admin
```

---

## Security Rules

- **Only scan domains explicitly submitted by authenticated users**
- **Block all private IPs**, loopback, internal hostnames, CGNAT (`target_validator.py`)
- **Hard timeouts** on every probe — no hanging connections
- **No exploitation** — all probes are read-only
- **API keys are backend-only** — never forwarded to frontend
