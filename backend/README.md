# Neural Protocol Backend

## Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -e ".[dev]"

# Copy environment file
copy .env.example .env       # Windows
# cp .env.example .env       # Linux / macOS
```

## Run

```bash
python run.py
# or
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Requirements

- **Nmap**: Must be installed on the host system separately from the Python package.
  - Windows: https://nmap.org/download.html — add to PATH
  - Linux: `sudo apt install nmap`
  - macOS: `brew install nmap`
  - On Windows, `python-nmap` uses `nmap.exe` on PATH automatically.

- **PostgreSQL** (production): Change `DATABASE_URL` in `.env`.
  Development uses SQLite by default — no external DB needed.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/assessments` | Start a new assessment |
| GET | `/api/v1/assessments/{id}` | Get assessment status |
| GET | `/api/v1/assessments/{id}/findings` | Get findings |
| GET | `/api/v1/assessments/{id}/report/json` | JSON report |
| GET | `/api/v1/assessments/{id}/report/pdf` | PDF download |
| GET | `/health` | Health check |

## Architecture

```
app/
├── main.py                   FastAPI app + CORS + lifespan
├── core/
│   └── config.py             Pydantic-settings config
├── db/
│   ├── session.py            SQLAlchemy async engine + session
│   └── models.py             ORM models (Assessment, Finding)
├── schemas/
│   └── assessment.py         Pydantic request/response schemas
├── engine/
│   ├── target_validator.py   Domain safety validation (blocks private IPs)
│   ├── runner.py             Assessment orchestrator
│   ├── finding_engine.py     Raw evidence → structured findings
│   └── probes/
│       ├── exposed_services.py   Nmap port scan
│       ├── web_security.py       HTTPX headers + HTTPS check
│       ├── dns_email.py          dnspython SPF/DMARC/DKIM/DNSSEC
│       └── ssl_tls.py            Python ssl certificate check
├── reports/
│   └── pdf_generator.py      ReportLab PDF generation
└── api/
    └── v1/
        ├── router.py
        └── endpoints/
            └── assessments.py    All assessment routes
```
