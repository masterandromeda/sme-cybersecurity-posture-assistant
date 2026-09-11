// Core domain types for Neural Protocol

export type RiskLevel = "critical" | "high" | "medium" | "low" | "info";
export type FindingStatus = "open" | "in_progress" | "resolved" | "accepted";
export type RemediationStatus = "pending" | "in_progress" | "completed" | "skipped";
export type AssetType = "domain" | "subdomain" | "email" | "cloud_account" | "vendor" | "ip";

// ──────────────────────────────────────────────
// Security Score
// ──────────────────────────────────────────────
export interface SecurityScore {
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down" | "stable";
  lastAssessment: string;
  monitoringActive: boolean;
  grade: "A" | "B" | "C" | "D" | "F";
}

// ──────────────────────────────────────────────
// Finding
// ──────────────────────────────────────────────
export interface Finding {
  id: string;
  // Plain-language title (what the business owner sees first)
  title: string;
  // Technical title (for advanced users)
  technicalTitle: string;
  // Business impact explanation
  businessImpact: string;
  // What we found (plain language)
  whatWeFound: string;
  // Why it matters
  whyItMatters: string;
  // Technical details (collapsible)
  technicalDetails: string;
  risk: RiskLevel;
  confidence: "high" | "medium" | "low";
  affectedAsset: string;
  assetType: AssetType;
  category: AssessmentCategory;
  status: FindingStatus;
  discoveredAt: string;
  lastSeen: string;
  cve?: string;
  cvss?: number;
  tags: string[];
}

// ──────────────────────────────────────────────
// Remediation
// ──────────────────────────────────────────────
export interface RemediationStep {
  step: number;
  title: string;
  description: string;
  actionUrl?: string;
}

export interface RemediationItem {
  id: string;
  findingId: string;
  title: string;
  businessImpact: string;
  whyYouShouldDoThis: string;
  risk: RiskLevel;
  effort: "low" | "medium" | "high";
  estimatedTime: string;
  expectedRiskReduction: "high" | "medium" | "low";
  priorityScore: number;
  status: RemediationStatus;
  steps: RemediationStep[];
  affectedAsset: string;
  category: string;
}

// ──────────────────────────────────────────────
// Assessment
// ──────────────────────────────────────────────
export type AssessmentCategory =
  | "exposed_services"
  | "domain_security"
  | "email_security"
  | "ssl_tls"
  | "security_headers"
  | "patch_hygiene"
  | "account_hygiene";

export interface AssessmentCategoryResult {
  category: AssessmentCategory;
  label: string;
  checksRun: number;
  findings: number;
  score: number;
  status: "pass" | "warning" | "fail";
}

export interface Assessment {
  id: string;
  domain: string;
  startedAt: string;
  completedAt: string | null;
  status: "queued" | "running" | "completed" | "failed";
  totalChecks: number;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  categories: AssessmentCategoryResult[];
  overallScore: number;
}

// ──────────────────────────────────────────────
// Asset / Vendor
// ──────────────────────────────────────────────
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url?: string;
  status: "active" | "inactive" | "unknown";
  riskLevel: RiskLevel;
  lastScanned: string;
  findingsCount: number;
  tags: string[];
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  accessLevel: "high" | "medium" | "low";
  riskLevel: RiskLevel;
  lastReviewed: string;
  hasDataAccess: boolean;
  hasSSOIntegration: boolean;
  notes: string;
}

// ──────────────────────────────────────────────
// Monitoring
// ──────────────────────────────────────────────
export interface MonitoringAlert {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
  timestamp: string;
  asset: string;
  acknowledged: boolean;
}

// ──────────────────────────────────────────────
// Posture / Score History
// ──────────────────────────────────────────────
export interface PostureDataPoint {
  date: string;
  score: number;
  findings: number;
}

// ──────────────────────────────────────────────
// Workspace / Business
// ──────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  industry: string;
  employeeCount: string;
  plan: "starter" | "growth" | "enterprise";
}

// ──────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: "alert" | "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
}
