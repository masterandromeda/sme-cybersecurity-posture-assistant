/**
 * Auth service — mock implementation.
 * Replace the internals with real API calls (POST /auth/login, /auth/register, etc.)
 * when the FastAPI backend is ready. The interface contract stays the same.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  workspace: string;
  avatarInitials: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

// ── In-memory session (not persisted — cleared on page refresh) ────────────
// For a real app: store a JWT in an httpOnly cookie via the backend.
let _currentUser: AuthUser | null = null;

const MOCK_USERS: Array<{ email: string; password: string; user: AuthUser }> = [
  {
    email: "alex@acmecorp.com",
    password: "demo1234",
    user: {
      id: "u-1",
      name: "Alex Chen",
      email: "alex@acmecorp.com",
      role: "admin",
      workspace: "Acme Corp",
      avatarInitials: "AC",
    },
  },
  {
    email: "demo@neuralprotocol.io",
    password: "demo1234",
    user: {
      id: "u-demo",
      name: "Demo User",
      email: "demo@neuralprotocol.io",
      role: "admin",
      workspace: "Demo Workspace",
      avatarInitials: "DU",
    },
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function signIn(email: string, password: string): Promise<AuthResult> {
  await delay(900 + Math.random() * 400);
  const match = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!match) {
    return { success: false, error: "The email or password you entered is incorrect." };
  }
  _currentUser = match.user;
  return { success: true, user: match.user };
}

export async function signUp(
  name: string,
  email: string,
  _password: string,
  _company: string
): Promise<AuthResult> {
  await delay(1100 + Math.random() * 400);
  // In a real app: POST /auth/register
  const user: AuthUser = {
    id: `u-${Date.now()}`,
    name,
    email,
    role: "admin",
    workspace: _company || "My Company",
    avatarInitials: name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
  _currentUser = user;
  return { success: true, user };
}

export async function forgotPassword(email: string): Promise<AuthResult> {
  await delay(800);
  if (!email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  // In a real app: POST /auth/forgot-password
  return { success: true };
}

export async function signOut(): Promise<void> {
  await delay(300);
  _currentUser = null;
}

export function getCurrentUser(): AuthUser | null {
  return _currentUser;
}

export function isAuthenticated(): boolean {
  return _currentUser !== null;
}
