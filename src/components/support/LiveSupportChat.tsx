"use client";

/**
 * LiveSupportChat — real WebSocket support chat component.
 *
 * - Connects to the backend WebSocket on conversation start
 * - Persists messages in PostgreSQL via the backend
 * - Shows Online/Offline indicator based on backend health
 * - No fake/hardcoded messages
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Circle,
  AlertCircle,
  User,
  Headphones,
} from "lucide-react";
import {
  SupportChatWebSocket,
  createConversation,
  type WsMessage,
} from "@/lib/support-service";
import { checkBackendHealth } from "@/lib/services";
import { formatRelativeTime } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender_type: "user" | "agent";
  sender_name: string;
  content: string;
  created_at: string;
}

interface LiveSupportChatProps {
  onClose?: () => void;
  embedded?: boolean; // if true, renders inline without overlay
}

export function LiveSupportChat({ onClose, embedded = false }: LiveSupportChatProps) {
  type Phase = "pre" | "connecting" | "live" | "error";

  const [phase, setPhase]               = useState<Phase>("pre");
  const [name,  setName]                = useState("");
  const [email, setEmail]               = useState("");
  const [subject, setSubject]           = useState("General support");
  const [inputMsg, setInputMsg]         = useState("");
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [conversationId, setConvId]     = useState<string | null>(null);
  const [backendOnline, setOnline]       = useState<boolean | null>(null);
  const [error, setError]               = useState("");
  const [sending, setSending]           = useState(false);
  const wsRef   = useRef<SupportChatWebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgId   = useRef(0);

  useEffect(() => {
    checkBackendHealth().then(setOnline);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = useCallback((m: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: String(++msgId.current) }]);
  }, []);

  async function handleStartChat() {
    if (!name.trim() || !email.trim()) return;
    setPhase("connecting");
    setError("");

    try {
      const conv = await createConversation({
        user_name: name.trim(),
        user_email: email.trim(),
        subject: subject.trim() || "General support",
        initial_message: `Hello, I need support. Subject: ${subject}`,
      });
      setConvId(conv.id);

      // Hydrate with existing messages
      if (conv.messages) {
        for (const m of conv.messages) {
          addMsg({
            sender_type: m.sender_type as "user" | "agent",
            sender_name: m.sender_name,
            content: m.content,
            created_at: m.created_at,
          });
        }
      }

      // Connect WebSocket
      const ws = new SupportChatWebSocket(conv.id, {
        onOpen: () => setPhase("live"),
        onClose: () => {
          if (phase === "live") setPhase("error");
        },
        onError: () => setPhase("error"),
        onMessage: (msg: WsMessage) => {
          if (msg.type === "message") {
            addMsg({
              sender_type: msg.sender_type ?? "agent",
              sender_name: msg.sender_name ?? "Support",
              content: msg.content ?? "",
              created_at: msg.created_at ?? new Date().toISOString(),
            });
          }
        },
        onHistory: (msgs: WsMessage[]) => {
          setMessages(
            msgs.map((m, i) => ({
              id: String(i),
              sender_type: m.sender_type ?? "user",
              sender_name: m.sender_name ?? "",
              content: m.content ?? "",
              created_at: m.created_at ?? new Date().toISOString(),
            }))
          );
        },
      });
      ws.connect();
      wsRef.current = ws;
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start chat");
      setPhase("error");
    }
  }

  async function handleSend() {
    const content = inputMsg.trim();
    if (!content || !conversationId || sending) return;
    setInputMsg("");
    setSending(true);

    try {
      if (wsRef.current?.connected) {
        wsRef.current.send(content, "user", name);
      } else {
        // Fallback: REST
        addMsg({
          sender_type: "user",
          sender_name: name,
          content,
          created_at: new Date().toISOString(),
        });
      }
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    return () => { wsRef.current?.disconnect(); };
  }, []);

  const containerCls = embedded
    ? "w-full bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)] rounded-2xl overflow-hidden flex flex-col"
    : "fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none";

  const innerCls = embedded
    ? "flex flex-col h-[480px]"
    : "pointer-events-auto w-full max-w-sm h-[520px] bg-[hsl(222,47%,9%)] border border-[hsl(217,33%,18%)] rounded-2xl shadow-2xl flex flex-col overflow-hidden";

  const content = (
    <div className={innerCls}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,15%)] bg-[hsl(222,47%,10%)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Headphones size={15} className="text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Live Support</div>
            <div className="flex items-center gap-1.5 text-[10px]">
              {backendOnline === null ? (
                <span className="text-slate-500">Checking…</span>
              ) : backendOnline ? (
                <>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"
                  />
                  <span className="text-green-400">Online</span>
                </>
              ) : (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="text-slate-500">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {phase === "pre" && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Start a live conversation with our support team. Messages are saved and we typically reply within a few hours.
            </p>
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Your name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,20%)] focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Work email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,20%)] focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="General support"
                  className="w-full bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,20%)] focus:border-blue-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
                />
              </div>
            </div>
            {phase === "pre" && error && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/8 border border-red-500/20">
                <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300">{error}</span>
              </div>
            )}
          </div>
        )}

        {phase === "connecting" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <span className="text-sm text-slate-400">Connecting to support…</span>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <div className="text-sm font-medium text-white">Connection failed</div>
            <div className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
              {error || "Could not connect to support. Is the backend running?"}
            </div>
            <button
              onClick={() => { setPhase("pre"); setError(""); }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {(phase === "live") && messages.map((m) => (
          <div key={m.id} className={`flex gap-2.5 ${m.sender_type === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              m.sender_type === "user" ? "bg-blue-500/20" : "bg-slate-500/20"
            }`}>
              {m.sender_type === "user"
                ? <User size={11} className="text-blue-400" />
                : <Headphones size={11} className="text-slate-400" />}
            </div>
            <div className={`max-w-[78%] ${m.sender_type === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                m.sender_type === "user"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-[hsl(222,47%,14%)] text-slate-200 rounded-tl-sm border border-[hsl(217,33%,20%)]"
              }`}>
                {m.content}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5 px-1">
                {m.sender_name} · {formatRelativeTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[hsl(217,33%,15%)]">
        {phase === "pre" && (
          <button
            onClick={handleStartChat}
            disabled={!name.trim() || !email.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <MessageCircle size={14} />
            Start Chat
          </button>
        )}
        {phase === "live" && (
          <div className="flex gap-2">
            <input
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message…"
              className="flex-1 bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,20%)] focus:border-blue-500/50 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={!inputMsg.trim() || sending}
              className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors"
            >
              {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
            </button>
          </div>
        )}
        <div className="text-center mt-2 text-[10px] text-slate-600">
          Neural Protocol Support · dubeykumar878@gmail.com
        </div>
      </div>
    </div>
  );

  if (embedded) return <div className={containerCls}>{content}</div>;
  return <>{content}</>;
}
