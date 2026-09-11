import type {
  SecurityScore,
  Finding,
  RemediationItem,
  Assessment,
  Asset,
  Vendor,
  MonitoringAlert,
  PostureDataPoint,
  Workspace,
  Notification,
} from "@/types";

// ──────────────────────────────────────────────
// Workspaces
// ──────────────────────────────────────────────
export const mockWorkspaces: Workspace[] = [
  { id: "ws-1", name: "Acme Corp", industry: "E-commerce", employeeCount: "50-100", plan: "growth" },
  { id: "ws-2", name: "Bright Digital", industry: "Agency", employeeCount: "10-50", plan: "starter" },
  { id: "ws-3", name: "Nova Logistics", industry: "Logistics", employeeCount: "100-250", plan: "enterprise" },
];

// ──────────────────────────────────────────────
// Security Score
// ──────────────────────────────────────────────
export const mockSecurityScore: SecurityScore = {
  current: 82,
  previous: 68,
  change: 14,
  trend: "up",
  lastAssessment: "2025-09-10T09:14:00Z",
  monitoringActive: true,
  grade: "B",
};

// ──────────────────────────────────────────────
// Posture History (multiple ranges)
// ──────────────────────────────────────────────
export const mockPostureHistory: PostureDataPoint[] = [
  { date: "Aug 1", score: 54, findings: 18 },
  { date: "Aug 8", score: 58, findings: 16 },
  { date: "Aug 15", score: 61, findings: 14 },
  { date: "Aug 22", score: 65, findings: 12 },
  { date: "Sep 1", score: 68, findings: 10 },
  { date: "Sep 5", score: 72, findings: 9 },
  { date: "Sep 8", score: 78, findings: 7 },
  { date: "Sep 10", score: 82, findings: 6 },
];

export const mockPostureHistory90: PostureDataPoint[] = [
  { date: "Jun 10", score: 42, findings: 24 },
  { date: "Jun 20", score: 46, findings: 22 },
  { date: "Jul 1", score: 50, findings: 20 },
  { date: "Jul 10", score: 54, findings: 18 },
  { date: "Jul 20", score: 57, findings: 16 },
  { date: "Aug 1", score: 60, findings: 15 },
  { date: "Aug 10", score: 65, findings: 13 },
  { date: "Aug 20", score: 70, findings: 10 },
  { date: "Sep 1", score: 75, findings: 8 },
  { date: "Sep 10", score: 82, findings: 6 },
];

export const mockPostureHistory6m: PostureDataPoint[] = [
  { date: "Mar", score: 38, findings: 28 },
  { date: "Apr", score: 44, findings: 24 },
  { date: "May", score: 50, findings: 20 },
  { date: "Jun", score: 55, findings: 18 },
  { date: "Jul", score: 63, findings: 14 },
  { date: "Aug", score: 72, findings: 10 },
  { date: "Sep", score: 82, findings: 6 },
];

// ──────────────────────────────────────────────
// Findings
// ──────────────────────────────────────────────
export const mockFindings: Finding[] = [
  {
    id: "f-001",
    title: "Administrator accounts are not protected with two-factor login",
    technicalTitle: "Multi-Factor Authentication not enforced on admin accounts",
    whatWeFound: "We detected that your main administrator account does not require a second verification step when logging in — only a password is used.",
    whyItMatters: "Passwords alone can be guessed, stolen, or leaked in data breaches. Without a second factor, anyone with your password can take over your account.",
    businessImpact: "A single compromised admin password could give an attacker complete control over your business systems, customer data, and financial accounts.",
    technicalDetails: "MFA enforcement is not enabled at the identity provider level. Account acme-admin@acmecorp.com last authenticated using password-only flow (no OTP/TOTP/hardware key challenge). No Conditional Access policy requiring MFA for admin roles is currently configured.",
    risk: "high",
    confidence: "high",
    affectedAsset: "acme-admin@acmecorp.com",
    assetType: "cloud_account",
    category: "account_hygiene",
    status: "open",
    discoveredAt: "2025-09-10T09:14:00Z",
    lastSeen: "2025-09-10T09:14:00Z",
    tags: ["mfa", "admin", "identity"],
  },
  {
    id: "f-002",
    title: "Your business email can be impersonated by attackers",
    technicalTitle: "SPF record is missing or misconfigured",
    whatWeFound: "Your domain's email settings are missing a key security record (SPF) that tells the internet which mail servers are allowed to send emails on your behalf.",
    whyItMatters: "Without this record, anyone in the world can send emails pretending to be from your company. Most email servers will not be able to tell the difference.",
    businessImpact: "Attackers could send convincing phishing emails to your customers, suppliers, or staff appearing to come from your official company email address.",
    technicalDetails: "DNS lookup for TXT records on acmecorp.com returned no valid SPF record. No 'v=spf1' TXT record found. DMARC policy is also set to 'p=none' which provides no enforcement.",
    risk: "high",
    confidence: "high",
    affectedAsset: "acmecorp.com",
    assetType: "domain",
    category: "email_security",
    status: "open",
    discoveredAt: "2025-09-10T09:15:00Z",
    lastSeen: "2025-09-10T09:15:00Z",
    tags: ["email", "spf", "spoofing", "phishing"],
  },
  {
    id: "f-003",
    title: "Website security headers are missing, exposing visitors to risk",
    technicalTitle: "Critical HTTP security headers absent (CSP, HSTS, X-Frame-Options)",
    whatWeFound: "Your website is missing several important security headers that instruct browsers how to protect your visitors from common web attacks.",
    whyItMatters: "These headers act as browser-level protection for everyone who visits your site. Without them, visitors are more vulnerable to certain types of attacks.",
    businessImpact: "Visitors to your website could be exposed to malicious scripts, clickjacking attacks, or have their connection downgraded to an insecure channel.",
    technicalDetails: "HTTP response headers analysis: Content-Security-Policy: MISSING. Strict-Transport-Security: MISSING. X-Frame-Options: MISSING. X-Content-Type-Options: MISSING.",
    risk: "medium",
    confidence: "high",
    affectedAsset: "www.acmecorp.com",
    assetType: "domain",
    category: "security_headers",
    status: "open",
    discoveredAt: "2025-09-10T09:16:00Z",
    lastSeen: "2025-09-10T09:16:00Z",
    tags: ["headers", "web", "csp", "hsts"],
  },
  {
    id: "f-004",
    title: "A remote administration port is exposed to the internet",
    technicalTitle: "SSH port 22 open to unrestricted public access",
    whatWeFound: "One of your internet-facing servers has a remote access port open to anyone on the internet. This port was receiving automated attack attempts during our scan.",
    whyItMatters: "Attackers continuously scan the internet looking for open administration ports. An exposed port is a direct entry point into your server.",
    businessImpact: "If an attacker finds weak credentials or an exploitable vulnerability, they could gain full access to your server and everything on it.",
    technicalDetails: "Port 22 (SSH) open on 198.51.100.42. Detected automated brute-force attempts in scan window. Server banner reveals OpenSSH 7.4 which has known CVEs.",
    risk: "high",
    confidence: "high",
    affectedAsset: "198.51.100.42",
    assetType: "ip",
    category: "exposed_services",
    status: "in_progress",
    discoveredAt: "2025-09-10T09:17:00Z",
    lastSeen: "2025-09-10T09:17:00Z",
    cve: "CVE-2023-38408",
    cvss: 7.8,
    tags: ["ssh", "exposed", "server", "brute-force"],
  },
  {
    id: "f-005",
    title: "Your SSL certificate is using an outdated security protocol",
    technicalTitle: "TLS 1.0 and TLS 1.1 still enabled on web server",
    whatWeFound: "Your website supports older, less secure versions of the encryption protocol used to protect data between your site and visitors' browsers.",
    whyItMatters: "TLS 1.0 and 1.1 have known weaknesses. Major browsers are phasing out support. PCI DSS explicitly prohibits their use.",
    businessImpact: "If your business handles online payments, this may put you out of compliance with PCI DSS standards, which could result in fines or loss of payment processing ability.",
    technicalDetails: "TLS scan on acmecorp.com:443 — TLS 1.0: ENABLED (DEPRECATED), TLS 1.1: ENABLED (DEPRECATED), TLS 1.2: ENABLED, TLS 1.3: ENABLED.",
    risk: "medium",
    confidence: "high",
    affectedAsset: "acmecorp.com",
    assetType: "domain",
    category: "ssl_tls",
    status: "open",
    discoveredAt: "2025-09-10T09:18:00Z",
    lastSeen: "2025-09-10T09:18:00Z",
    cve: "CVE-2014-3566",
    cvss: 6.8,
    tags: ["tls", "ssl", "encryption", "pci"],
  },
  {
    id: "f-006",
    title: "A shared login is being used across multiple team members",
    technicalTitle: "Shared credentials detected on cloud platform account",
    whatWeFound: "Multiple people appear to be using the same login credentials for one of your business systems. This makes it impossible to track who made what change.",
    whyItMatters: "Shared passwords are a significant security risk. If that password is compromised, every user of it is affected. There is also no accountability trail.",
    businessImpact: "If something goes wrong — data is deleted, a change is made, or an account is compromised — you will not be able to identify who was responsible.",
    technicalDetails: "Login events on Cloudflare account show simultaneous sessions from 3 distinct IP addresses using same authentication token.",
    risk: "medium",
    confidence: "medium",
    affectedAsset: "Cloudflare Account",
    assetType: "cloud_account",
    category: "account_hygiene",
    status: "open",
    discoveredAt: "2025-09-10T09:19:00Z",
    lastSeen: "2025-09-10T09:19:00Z",
    tags: ["shared-credentials", "access-control", "accountability"],
  },
];

// ──────────────────────────────────────────────
// Remediation Items
// ──────────────────────────────────────────────
export const mockRemediationItems: RemediationItem[] = [
  {
    id: "r-001",
    findingId: "f-001",
    title: "Enable two-factor authentication for administrator accounts",
    businessImpact: "Prevents account takeover even if a password is stolen.",
    whyYouShouldDoThis: "MFA makes it significantly harder for someone to access your accounts using only a stolen or guessed password. Even if an attacker has your password, they cannot log in without the second factor.",
    risk: "high",
    effort: "low",
    estimatedTime: "5–10 minutes",
    expectedRiskReduction: "high",
    priorityScore: 95,
    status: "pending",
    affectedAsset: "acme-admin@acmecorp.com",
    category: "Account Security",
    steps: [
      { step: 1, title: "Open Account Security Settings", description: "Log in to your account provider (Google Workspace, Microsoft 365, etc.) and navigate to your account security settings." },
      { step: 2, title: "Find Multi-Factor Authentication", description: "Look for 'Multi-Factor Authentication', 'Two-Step Verification', or '2FA' in the security menu." },
      { step: 3, title: "Enable MFA", description: "Click 'Enable' or 'Turn On'. Choose a method: authenticator app (recommended), SMS, or hardware key." },
      { step: 4, title: "Complete Verification Setup", description: "Follow the on-screen steps to register your device. For an authenticator app, scan the QR code shown." },
      { step: 5, title: "Verify the Fix", description: "Log out and log back in. You should now be prompted for a second verification step. Return here and mark this as complete." },
    ],
  },
  {
    id: "r-002",
    findingId: "f-002",
    title: "Add an SPF record to protect your email domain",
    businessImpact: "Prevents attackers from impersonating your business in emails.",
    whyYouShouldDoThis: "An SPF record tells the world's email servers which services are allowed to send email on behalf of your domain. Without it, anyone can forge your email address.",
    risk: "high",
    effort: "low",
    estimatedTime: "10–15 minutes",
    expectedRiskReduction: "high",
    priorityScore: 90,
    status: "pending",
    affectedAsset: "acmecorp.com",
    category: "Email Security",
    steps: [
      { step: 1, title: "Log in to Your Domain Registrar", description: "Go to the website where you registered your domain and log in." },
      { step: 2, title: "Find Your DNS Settings", description: "Navigate to the DNS management section for your domain." },
      { step: 3, title: "Add a New TXT Record", description: "Click 'Add Record'. Select 'TXT' as the record type." },
      { step: 4, title: "Enter the SPF Record Value", description: "Set Name to '@'. Value: v=spf1 include:_spf.google.com ~all (adjust for your email provider).", actionUrl: "https://toolbox.googleapps.com/apps/checkmx/" },
      { step: 5, title: "Save and Wait", description: "Save the record. DNS changes can take up to 24 hours but usually happen within 1 hour." },
    ],
  },
  {
    id: "r-003",
    findingId: "f-004",
    title: "Restrict who can access your server's remote port",
    businessImpact: "Removes a direct entry point that attackers are actively probing.",
    whyYouShouldDoThis: "Leaving a remote management port open to the entire internet is like leaving your office's back door unlocked.",
    risk: "high",
    effort: "medium",
    estimatedTime: "20–30 minutes",
    expectedRiskReduction: "high",
    priorityScore: 88,
    status: "in_progress",
    affectedAsset: "198.51.100.42",
    category: "Network Security",
    steps: [
      { step: 1, title: "Identify Your Server's Firewall", description: "Determine whether you are using a cloud provider's security groups (AWS, GCP, Azure) or a local firewall (UFW, iptables)." },
      { step: 2, title: "Find Your Current IP Address", description: "Before making changes, find your office or home IP address by visiting whatismyip.com.", actionUrl: "https://whatismyip.com" },
      { step: 3, title: "Update the Firewall Rule", description: "Find the rule allowing inbound TCP port 22 from '0.0.0.0/0'. Change the source to your specific IP address only." },
      { step: 4, title: "Test Remote Access", description: "Try connecting to the server to confirm you can still access it with the new restriction." },
      { step: 5, title: "Verify Reduced Exposure", description: "Return here and mark complete. Our next scan will verify the port is no longer publicly accessible." },
    ],
  },
  {
    id: "r-004",
    findingId: "f-003",
    title: "Add security headers to your website",
    businessImpact: "Protects all visitors to your website from common browser-based attacks.",
    whyYouShouldDoThis: "Security headers are instructions sent from your server to visitors' browsers. They tell the browser to apply extra security rules.",
    risk: "medium",
    effort: "medium",
    estimatedTime: "30–45 minutes",
    expectedRiskReduction: "medium",
    priorityScore: 72,
    status: "pending",
    affectedAsset: "www.acmecorp.com",
    category: "Web Security",
    steps: [
      { step: 1, title: "Identify Your Web Server or CDN", description: "Determine whether your site runs on Apache, Nginx, Cloudflare, Vercel, or another platform." },
      { step: 2, title: "Add HSTS Header", description: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains" },
      { step: 3, title: "Add X-Frame-Options Header", description: "Add: X-Frame-Options: DENY" },
      { step: 4, title: "Add Content-Security-Policy Header", description: "Start with: Content-Security-Policy: default-src 'self'" },
      { step: 5, title: "Verify with Security Headers Tool", description: "Visit securityheaders.com to verify headers are applied.", actionUrl: "https://securityheaders.com" },
    ],
  },
  {
    id: "r-005",
    findingId: "f-005",
    title: "Disable outdated TLS 1.0 and TLS 1.1 on your website",
    businessImpact: "Brings your website into compliance with payment and data protection standards.",
    whyYouShouldDoThis: "TLS 1.0 and 1.1 are legacy protocols with known security weaknesses. Disabling them ensures all connections use modern encryption.",
    risk: "medium",
    effort: "medium",
    estimatedTime: "15–30 minutes",
    expectedRiskReduction: "medium",
    priorityScore: 65,
    status: "pending",
    affectedAsset: "acmecorp.com",
    category: "Encryption",
    steps: [
      { step: 1, title: "Access Your Web Server Configuration", description: "Log in to your hosting control panel or server." },
      { step: 2, title: "Locate TLS Protocol Settings", description: "Find the SSL/TLS section in your Apache, Nginx, or hosting panel settings." },
      { step: 3, title: "Disable TLS 1.0 and 1.1", description: "Remove TLSv1 and TLSv1.1 from the allowed protocols list. Keep TLSv1.2 and TLSv1.3 enabled." },
      { step: 4, title: "Restart Your Web Server", description: "Apply the configuration change by restarting your web server." },
      { step: 5, title: "Test the Configuration", description: "Visit ssllabs.com/ssltest to confirm TLS 1.0 and 1.1 are disabled.", actionUrl: "https://www.ssllabs.com/ssltest/" },
    ],
  },
  {
    id: "r-006",
    findingId: "f-006",
    title: "Create individual accounts for each team member",
    businessImpact: "Enables accountability and limits damage if a single account is compromised.",
    whyYouShouldDoThis: "Individual accounts mean each person has their own login. If one account is compromised, you can revoke it without affecting others.",
    risk: "medium",
    effort: "medium",
    estimatedTime: "20–30 minutes",
    expectedRiskReduction: "medium",
    priorityScore: 58,
    status: "pending",
    affectedAsset: "Cloudflare Account",
    category: "Access Control",
    steps: [
      { step: 1, title: "Log in to the Platform", description: "Log in to the platform where the shared account is being used." },
      { step: 2, title: "Navigate to User Management", description: "Find the 'Members', 'Users', 'Team', or 'Access' section in account settings." },
      { step: 3, title: "Invite Each Team Member", description: "Add each person using their individual email address with minimum required permissions." },
      { step: 4, title: "Revoke the Shared Credentials", description: "Once each team member has their own account, change the password on the shared account and revoke all active sessions." },
      { step: 5, title: "Enable MFA for All Users", description: "Enable MFA for all the newly created individual accounts." },
    ],
  },
];

// ──────────────────────────────────────────────
// Assessment
// ──────────────────────────────────────────────
export const mockAssessment: Assessment = {
  id: "a-001",
  domain: "acmecorp.com",
  startedAt: "2025-09-10T09:10:00Z",
  completedAt: "2025-09-10T09:14:00Z",
  status: "completed",
  totalChecks: 37,
  findingsCount: { critical: 0, high: 3, medium: 3, low: 0, info: 2 },
  overallScore: 82,
  categories: [
    { category: "exposed_services", label: "Exposed Services", checksRun: 6, findings: 1, score: 72, status: "warning" },
    { category: "domain_security", label: "Domain Security", checksRun: 5, findings: 0, score: 95, status: "pass" },
    { category: "email_security", label: "Email Security", checksRun: 6, findings: 1, score: 45, status: "fail" },
    { category: "ssl_tls", label: "SSL / TLS", checksRun: 8, findings: 1, score: 78, status: "warning" },
    { category: "security_headers", label: "Security Headers", checksRun: 6, findings: 1, score: 30, status: "fail" },
    { category: "patch_hygiene", label: "Patch Hygiene", checksRun: 3, findings: 0, score: 92, status: "pass" },
    { category: "account_hygiene", label: "Account Hygiene", checksRun: 3, findings: 2, score: 55, status: "warning" },
  ],
};

// ──────────────────────────────────────────────
// Assets
// ──────────────────────────────────────────────
export const mockAssets: Asset[] = [
  { id: "asset-1", name: "acmecorp.com", type: "domain", url: "https://acmecorp.com", status: "active", riskLevel: "medium", lastScanned: "2025-09-10T09:14:00Z", findingsCount: 3, tags: ["primary", "web"] },
  { id: "asset-2", name: "www.acmecorp.com", type: "subdomain", url: "https://www.acmecorp.com", status: "active", riskLevel: "medium", lastScanned: "2025-09-10T09:14:00Z", findingsCount: 2, tags: ["web"] },
  { id: "asset-3", name: "198.51.100.42", type: "ip", status: "active", riskLevel: "high", lastScanned: "2025-09-10T09:14:00Z", findingsCount: 1, tags: ["server"] },
  { id: "asset-4", name: "acme-admin@acmecorp.com", type: "email", status: "active", riskLevel: "high", lastScanned: "2025-09-10T09:14:00Z", findingsCount: 1, tags: ["admin", "email"] },
];

// ──────────────────────────────────────────────
// User Accounts (new)
// ──────────────────────────────────────────────
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: "administrator" | "manager" | "staff" | "viewer";
  lastActive: string;
  accessLevel: "high" | "medium" | "low";
  mfaEnabled: boolean;
  status: "active" | "dormant" | "disabled";
  riskFlags: string[];
}

export const mockUserAccounts: UserAccount[] = [
  { id: "u-1", name: "Alex Chen", email: "alex@acmecorp.com", role: "administrator", lastActive: "2025-09-10T08:00:00Z", accessLevel: "high", mfaEnabled: false, status: "active", riskFlags: ["no-mfa", "admin"] },
  { id: "u-2", name: "Sarah Williams", email: "sarah@acmecorp.com", role: "administrator", lastActive: "2025-09-09T14:30:00Z", accessLevel: "high", mfaEnabled: true, status: "active", riskFlags: ["admin"] },
  { id: "u-3", name: "James Patel", email: "james@acmecorp.com", role: "manager", lastActive: "2025-09-08T11:00:00Z", accessLevel: "medium", mfaEnabled: true, status: "active", riskFlags: [] },
  { id: "u-4", name: "Emma Rodriguez", email: "emma@acmecorp.com", role: "staff", lastActive: "2025-04-02T09:00:00Z", accessLevel: "medium", mfaEnabled: false, status: "dormant", riskFlags: ["dormant", "no-mfa"] },
  { id: "u-5", name: "Tom Harrison", email: "tom@acmecorp.com", role: "staff", lastActive: "2025-03-15T10:00:00Z", accessLevel: "low", mfaEnabled: false, status: "dormant", riskFlags: ["dormant"] },
  { id: "u-6", name: "Lisa Chan", email: "lisa@acmecorp.com", role: "viewer", lastActive: "2025-09-07T16:00:00Z", accessLevel: "low", mfaEnabled: false, status: "active", riskFlags: ["no-mfa"] },
  { id: "u-7", name: "Mike Foster", email: "mike@acmecorp.com", role: "manager", lastActive: "2025-09-06T12:00:00Z", accessLevel: "medium", mfaEnabled: true, status: "active", riskFlags: [] },
];

// ──────────────────────────────────────────────
// Vendors
// ──────────────────────────────────────────────
export const mockVendors: Vendor[] = [
  { id: "v-1", name: "Cloudflare", category: "CDN / DNS", accessLevel: "high", riskLevel: "low", lastReviewed: "2025-08-01", hasDataAccess: false, hasSSOIntegration: false, notes: "Manages DNS and CDN for all domains." },
  { id: "v-2", name: "Google Workspace", category: "Productivity", accessLevel: "high", riskLevel: "medium", lastReviewed: "2025-07-15", hasDataAccess: true, hasSSOIntegration: true, notes: "Email, documents, and calendars for all staff." },
  { id: "v-3", name: "Stripe", category: "Payments", accessLevel: "high", riskLevel: "low", lastReviewed: "2025-08-20", hasDataAccess: true, hasSSOIntegration: false, notes: "Handles all customer payment processing." },
  { id: "v-4", name: "Shopify", category: "E-commerce", accessLevel: "high", riskLevel: "low", lastReviewed: "2025-07-01", hasDataAccess: true, hasSSOIntegration: true, notes: "Primary storefront and order management." },
  { id: "v-5", name: "Slack", category: "Communication", accessLevel: "medium", riskLevel: "low", lastReviewed: "2025-06-10", hasDataAccess: false, hasSSOIntegration: true, notes: "Team communication platform." },
  { id: "v-6", name: "HubSpot", category: "CRM", accessLevel: "medium", riskLevel: "medium", lastReviewed: "2025-05-15", hasDataAccess: true, hasSSOIntegration: true, notes: "Customer relationship management. Has customer data." },
  { id: "v-7", name: "GitHub", category: "Development", accessLevel: "high", riskLevel: "medium", lastReviewed: "2025-04-10", hasDataAccess: false, hasSSOIntegration: true, notes: "Source code repository. Review team access permissions." },
];

// ──────────────────────────────────────────────
// Monitoring Alerts + Timeline Events (new)
// ──────────────────────────────────────────────
export const mockAlerts: MonitoringAlert[] = [
  { id: "al-1", title: "New exposed port detected", description: "Port 8080 opened on 198.51.100.42 — service not present in previous assessment", severity: "high", timestamp: "2025-09-10T07:10:00Z", asset: "198.51.100.42", acknowledged: false },
  { id: "al-2", title: "SSL certificate expiring soon", description: "Certificate for acmecorp.com expires in 18 days", severity: "medium", timestamp: "2025-09-09T12:00:00Z", asset: "acmecorp.com", acknowledged: false },
  { id: "al-3", title: "SPF record check failed", description: "SPF DNS record on acmecorp.com returned FAIL for external sender", severity: "high", timestamp: "2025-09-08T14:00:00Z", asset: "acmecorp.com", acknowledged: true },
  { id: "al-4", title: "New login from unusual location", description: "Admin account accessed from IP in Eastern Europe", severity: "critical", timestamp: "2025-09-07T22:45:00Z", asset: "acme-admin@acmecorp.com", acknowledged: false },
];

export interface TimelineEvent {
  id: string;
  date: string;
  label: string;
  type: "assessment" | "finding" | "resolved" | "change" | "alert" | "improvement";
  description: string;
  details?: string;
  scoreBefore?: number;
  scoreAfter?: number;
}

export const mockTimelineEvents: TimelineEvent[] = [
  { id: "te-1", date: "2025-09-10", label: "Assessment completed", type: "assessment", description: "Full scan of acmecorp.com completed. 6 findings discovered.", details: "37 checks run across 7 categories. Score: 82/100.", scoreAfter: 82 },
  { id: "te-2", date: "2025-09-10", label: "New exposure detected", type: "alert", description: "A service not present in the previous assessment is now publicly reachable.", details: "Port 8080 detected open on 198.51.100.42. This was not present in the Aug 22 assessment.", scoreBefore: 82 },
  { id: "te-3", date: "2025-09-09", label: "No new exposure detected", type: "assessment", description: "Scheduled check completed — no new findings since last full assessment." },
  { id: "te-4", date: "2025-09-07", label: "Unusual login detected", type: "alert", description: "Administrator account login from an unusual geographic location was flagged." },
  { id: "te-5", date: "2025-09-05", label: "Security score improved", type: "improvement", description: "Score improved from 78 to 82 after account access changes.", scoreBefore: 78, scoreAfter: 82 },
  { id: "te-6", date: "2025-09-03", label: "Configuration change detected", type: "change", description: "DNS record modification detected on acmecorp.com.", details: "A TXT record was added to the domain. Change appears consistent with expected activity." },
  { id: "te-7", date: "2025-09-01", label: "Assessment completed", type: "assessment", description: "Scheduled monthly assessment completed. 10 findings at the time.", scoreAfter: 68 },
  { id: "te-8", date: "2025-08-28", label: "MFA enabled on admin account", type: "resolved", description: "sarah@acmecorp.com enabled MFA. Risk reduced for this account.", scoreBefore: 64, scoreAfter: 68 },
];

// ──────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────
export const mockNotifications: Notification[] = [
  { id: "n-1", title: "Assessment Complete", body: "Your scan of acmecorp.com is done. 6 findings discovered.", type: "alert", timestamp: "2025-09-10T09:15:00Z", read: false },
  { id: "n-2", title: "New Critical Alert", body: "Unusual login detected on administrator account.", type: "alert", timestamp: "2025-09-07T22:46:00Z", read: false },
  { id: "n-3", title: "New Exposure Detected", body: "Port 8080 is now publicly reachable on 198.51.100.42.", type: "warning", timestamp: "2025-09-10T07:11:00Z", read: false },
  { id: "n-4", title: "Remediation Verified", body: "SSH port restriction on 198.51.100.42 confirmed — risk reduced.", type: "success", timestamp: "2025-09-06T11:00:00Z", read: true },
  { id: "n-5", title: "Score Improved", body: "Your security score improved by 14 points this month.", type: "success", timestamp: "2025-09-05T08:00:00Z", read: true },
  { id: "n-6", title: "Dormant Account Detected", body: "Emma Rodriguez has not logged in for 161 days. Review or remove access.", type: "warning", timestamp: "2025-09-04T08:00:00Z", read: true },
  { id: "n-7", title: "Vendor Review Due", body: "HubSpot access was last reviewed 4 months ago. Review recommended.", type: "info", timestamp: "2025-09-03T09:00:00Z", read: true },
];
