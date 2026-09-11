/**
 * Service layer — API-ready abstractions.
 *
 * Assessment functions now call the real FastAPI backend.
 * All other functions still use mock data — they will be wired up
 * in subsequent modules (#2 AI Findings, #3 Remediation, etc.)
 *
 * Backend base URL is read from NEXT_PUBLIC_API_URL env var.
 * Falls back to http://localhost:8000 for local development.
 */
import type {
  SecurityScore, Finding, RemediationItem, Assessment,
  Asset, Vendor, MonitoringAlert, PostureDataPoint,
  Workspace, Notification,
} from "@/types";
import * as mock from "@/lib/mock-data";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// All API calls use relative paths — they are proxied by Next.js to the backend.
// This eliminates CORS entirely and works in both dev and production.
// See next.config.ts for the proxy rewrites.
const API_BASE = "";

// ── Generic fetch helper ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try { detail = JSON.parse(text)?.detail ?? text; } catch { /* noop */ }
    throw new ApiError(res.status, detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Assessment API types (mirror backend Pydantic schemas) ────────────────────

export interface ApiFindingsCount {
  critical: number; high: number; medium: number; low: number; info: number;
}

export interface ApiCategoryResult {
  category: string; label: string; checks_run: number;
  findings: number; score: number; status: string;
}

export interface ApiAssessment {
  id: string;
  domain: string;
  status: "queued" | "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  total_checks: number;
  overall_score: number;
  findings_count: ApiFindingsCount;
  categories: ApiCategoryResult[];
  error_message?: string | null;
}

export interface ApiFinding {
  id: string;
  assessment_id: string;
  category: string;
  severity: string;
  title: string;
  technical_title: string;
  business_impact: string;
  what_we_found: string;
  why_it_matters: string;
  technical_details: string;
  affected_asset: string;
  asset_type: string;
  evidence: Record<string, unknown>;
  confidence: string;
  status: string;
  cve?: string | null;
  cvss?: number | null;
  tags: string[];
  detected_at: string;
  last_seen: string;
}

export interface ApiReportResponse {
  assessment_id: string;
  domain: string;
  generated_at: string;
  assessment: ApiAssessment;
  findings: ApiFinding[];
}

// ── Real Assessment API calls ─────────────────────────────────────────────────

/** POST /api/v1/assessments — start a new assessment. Returns immediately with status=queued. */
export async function startRealAssessment(domain: string): Promise<ApiAssessment> {
  return apiFetch<ApiAssessment>("/api/v1/assessments", {
    method: "POST",
    body: JSON.stringify({ domain }),
  });
}

/** GET /api/v1/assessments/{id} — poll for assessment status. */
export async function getRealAssessment(id: string): Promise<ApiAssessment> {
  return apiFetch<ApiAssessment>(`/api/v1/assessments/${id}`);
}

/** GET /api/v1/assessments/{id}/findings */
export async function getRealFindings(assessmentId: string): Promise<ApiFinding[]> {
  return apiFetch<ApiFinding[]>(`/api/v1/assessments/${assessmentId}/findings`);
}

/** GET /api/v1/assessments/{id}/report/json */
export async function getJsonReport(assessmentId: string): Promise<ApiReportResponse> {
  return apiFetch<ApiReportResponse>(`/api/v1/assessments/${assessmentId}/report/json`);
}

/** GET /api/v1/assessments/{id}/report/pdf — returns the download URL (called client-side) */
export function getPdfReportUrl(assessmentId: string): string {
  return `${API_BASE}/api/v1/assessments/${assessmentId}/report/pdf`;
}

// ── Backend availability check ────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Mock-backed services (unchanged — wired up in later modules) ──────────────

export async function getSecurityScore(): Promise<SecurityScore> {
  await delay(300);
  return mock.mockSecurityScore;
}

export async function getFindings(): Promise<Finding[]> {
  await delay(400);
  return mock.mockFindings;
}

export async function getFinding(id: string): Promise<Finding | undefined> {
  await delay(200);
  return mock.mockFindings.find((f) => f.id === id);
}

export async function getRemediations(): Promise<RemediationItem[]> {
  await delay(350);
  return mock.mockRemediationItems;
}

export async function getAssessments(): Promise<Assessment[]> {
  await delay(400);
  return [mock.mockAssessment];
}

export async function getLatestAssessment(): Promise<Assessment> {
  await delay(300);
  return mock.mockAssessment;
}

/** Legacy mock stub — superseded by startRealAssessment */
export async function startAssessment(domain: string): Promise<{ jobId: string }> {
  await delay(600);
  console.info("[service] mock startAssessment", { domain });
  return { jobId: `job-${Date.now()}` };
}

export async function getAssets(): Promise<Asset[]> {
  await delay(300);
  return mock.mockAssets;
}

export async function getVendors(): Promise<Vendor[]> {
  await delay(300);
  return mock.mockVendors;
}

export async function getAlerts(): Promise<MonitoringAlert[]> {
  await delay(350);
  return mock.mockAlerts;
}

export async function getPostureHistory(): Promise<PostureDataPoint[]> {
  await delay(300);
  return mock.mockPostureHistory;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  await delay(200);
  return mock.mockWorkspaces;
}

export async function getNotifications(): Promise<Notification[]> {
  await delay(200);
  return mock.mockNotifications;
}

// ── Security Copilot ──────────────────────────────────────────────────────────

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface CopilotApiResponse {
  content: string;
  used_ai: boolean;
  model_used: string;
  latency_ms: number;
  has_assessment_data: boolean;
}

/**
 * Send a message to the real Security Copilot backend.
 * Passes conversation history for multi-turn context.
 * Falls back to a simple error message if the backend is unreachable.
 */
export async function sendCopilotMessage(
  question: string,
  history: CopilotMessage[] = [],
): Promise<CopilotMessage> {
  // Convert CopilotMessage[] history to the shape the backend expects
  const historyPayload = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const data = await apiFetch<CopilotApiResponse>("/api/v1/copilot/chat", {
      method: "POST",
      body: JSON.stringify({
        message: question,
        history: historyPayload,
      }),
    });
    return {
      role: "assistant",
      content: data.content,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // If backend is offline, return a graceful message instead of crashing
    const isOffline = err instanceof ApiError ? err.status === 0 : true;
    const content = isOffline
      ? "The Security Copilot backend is not reachable right now. Start the backend with `cd backend && python run.py` and try again."
      : `Something went wrong: ${err instanceof Error ? err.message : "unknown error"}`;
    return {
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Global Search ─────────────────────────────────────────────────────────────

export interface SearchResult {
  type: "finding" | "asset" | "vendor" | "remediation" | "user";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  risk?: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  await delay(250);
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  mock.mockFindings.forEach((f) => {
    if (f.title.toLowerCase().includes(q) || f.technicalTitle.toLowerCase().includes(q) || f.tags.some((t) => t.includes(q))) {
      results.push({ type: "finding", id: f.id, title: f.title, subtitle: f.affectedAsset, href: "/findings", risk: f.risk });
    }
  });
  mock.mockAssets.forEach((a) => {
    if (a.name.toLowerCase().includes(q) || a.type.includes(q)) {
      results.push({ type: "asset", id: a.id, title: a.name, subtitle: a.type.replace("_", " "), href: "/accounts", risk: a.riskLevel });
    }
  });
  mock.mockVendors.forEach((v) => {
    if (v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)) {
      results.push({ type: "vendor", id: v.id, title: v.name, subtitle: v.category, href: "/accounts", risk: v.riskLevel });
    }
  });
  mock.mockRemediationItems.forEach((r) => {
    if (r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) {
      results.push({ type: "remediation", id: r.id, title: r.title, subtitle: r.category, href: "/remediation", risk: r.risk });
    }
  });

  return results.slice(0, 12);
}
