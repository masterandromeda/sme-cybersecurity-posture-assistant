/**
 * Support service — typed API calls for support chat and contact form.
 *
 * All REST calls use relative paths ("/api/v1/...") — proxied by Next.js
 * to the backend, the same as services.ts.
 *
 * WS_BASE is "ws://localhost:8001" because WebSocket connections cannot go
 * through the Next.js HTTP proxy; they must connect directly to the backend.
 */

// WebSocket connections bypass the Next.js proxy — connect directly to the backend.
const WS_BASE = "ws://localhost:8001";

// ── Shared fetch helper (mirrors services.ts) ─────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text;
    try {
      detail = JSON.parse(text)?.detail ?? text;
    } catch {
      /* noop */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: "user" | "agent";
  sender_name: string;
  content: string;
  created_at: string;
}

export interface SupportConversation {
  id: string;
  user_email: string;
  user_name: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  message_count: number;
  messages?: SupportMessage[];
}

export interface ContactFormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
}

export interface ContactSubmission extends ContactFormData {
  id: string;
  status: "new" | "read" | "replied";
  submitted_at: string;
}

export interface WsMessage {
  type: "message" | "history" | "error";
  sender_type?: "user" | "agent";
  sender_name?: string;
  content?: string;
  created_at?: string;
  messages?: WsMessage[];
  detail?: string;
}

// ── REST functions ────────────────────────────────────────────────────────────

/** POST /api/v1/support/conversations — open a new support conversation. */
export function createConversation(data: {
  user_email: string;
  user_name: string;
  subject: string;
  initial_message: string;
}): Promise<SupportConversation> {
  return apiFetch<SupportConversation>("/api/v1/support/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** POST /api/v1/support/conversations/{id}/messages — append a message. */
export function addMessage(
  conversationId: string,
  content: string,
  senderType: "user" | "agent",
  senderName: string
): Promise<SupportMessage> {
  const params = new URLSearchParams({
    sender_type: senderType,
    sender_name: senderName,
  });
  return apiFetch<SupportMessage>(
    `/api/v1/support/conversations/${conversationId}/messages?${params}`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
}

/** GET /api/v1/support/conversations/{id} — fetch a conversation with messages. */
export function getConversation(id: string): Promise<SupportConversation> {
  return apiFetch<SupportConversation>(`/api/v1/support/conversations/${id}`);
}

/** POST /api/v1/contact — submit the public contact form. */
export function submitContact(data: ContactFormData): Promise<ContactSubmission> {
  return apiFetch<ContactSubmission>("/api/v1/contact", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Returns the WebSocket URL for a given conversation (bypasses Next.js proxy). */
export function getWsUrl(conversationId: string): string {
  return `${WS_BASE}/api/v1/support/ws/${conversationId}`;
}

// ── WebSocket wrapper ─────────────────────────────────────────────────────────

export class SupportChatWebSocket {
  private ws: WebSocket | null = null;
  private readonly conversationId: string;
  private readonly handlers: {
    onMessage: (msg: WsMessage) => void;
    onHistory: (msgs: WsMessage[]) => void;
    onOpen: () => void;
    onClose: () => void;
    onError: (e: Event) => void;
  };

  constructor(
    conversationId: string,
    handlers: {
      onMessage: (msg: WsMessage) => void;
      onHistory: (msgs: WsMessage[]) => void;
      onOpen: () => void;
      onClose: () => void;
      onError: (e: Event) => void;
    }
  ) {
    this.conversationId = conversationId;
    this.handlers = handlers;
  }

  connect(): void {
    this.ws = new WebSocket(getWsUrl(this.conversationId));

    this.ws.onopen = () => this.handlers.onOpen();

    this.ws.onmessage = (event: MessageEvent) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data as string) as WsMessage;
      } catch {
        return;
      }
      if (msg.type === "history") {
        this.handlers.onHistory(msg.messages ?? []);
      } else if (msg.type === "message") {
        this.handlers.onMessage(msg);
      }
    };

    this.ws.onclose = () => this.handlers.onClose();
    this.ws.onerror = (e: Event) => this.handlers.onError(e);
  }

  send(content: string, senderType: "user" | "agent", senderName: string): void {
    if (this.ws) {
      this.ws.send(JSON.stringify({ sender_type: senderType, sender_name: senderName, content }));
    }
  }

  disconnect(): void {
    this.ws?.close();
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
