"use client";

/**
 * Support Admin — view and reply to support conversations.
 * Protected page — agents use this to respond to users.
 * Real data from the backend via REST + WebSocket.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  User,
  Headphones,
  Send,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { SupportConversation, SupportMessage } from "@/lib/support-service";
import { getConversation, addMessage } from "@/lib/support-service";

function statusBadge(status: string) {
  return status === "open"
    ? "text-green-400 bg-green-500/10 border-green-500/20"
    : "text-slate-500 bg-slate-500/10 border-slate-600/20";
}

export default function SupportAdminPage() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [selectedConv, setSelectedConv]   = useState<SupportConversation | null>(null);
  const [reply, setReply]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchList() {
    try {
      const res = await fetch("/api/v1/support/conversations?status=all");
      if (res.ok) {
        const data: SupportConversation[] = await res.json();
        setConversations(data);
      }
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchList(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    getConversation(selectedId).then(setSelectedConv).catch(() => {});
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages]);

  async function handleReply() {
    if (!selectedId || !reply.trim() || sending) return;
    setSending(true);
    try {
      const msg = await addMessage(selectedId, reply.trim(), "agent", "Support Agent");
      setReply("");
      // Refresh conversation
      const updated = await getConversation(selectedId);
      setSelectedConv(updated);
    } catch { /* show error */ }
    finally { setSending(false); }
  }

  async function handleClose(id: string) {
    try {
      await fetch(`/api/v1/support/conversations/${id}/close`, { method: "POST" });
      await fetchList();
      if (selectedId === id) {
        const updated = await getConversation(id);
        setSelectedConv(updated);
      }
    } catch { /* silent */ }
  }

  return (
    <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Support Inbox</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {conversations.filter((c) => c.status === "open").length} open conversations
          </p>
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchList(); }}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(217,33%,20%)] text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading conversations…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 200px)" }}>
          {/* Conversation list */}
          <div className="lg:col-span-1 overflow-y-auto space-y-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                No conversations yet
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedId === c.id
                      ? "border-blue-500/40 bg-blue-500/8"
                      : "border-[hsl(217,33%,17%)] bg-[hsl(222,47%,10%)] hover:border-[hsl(217,33%,22%)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{c.user_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{c.user_email}</div>
                      <div className="text-xs text-slate-400 mt-1 truncate">{c.subject}</div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${statusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-600">
                    <MessageSquare size={10} />
                    {c.message_count} messages
                    <Clock size={10} />
                    {formatRelativeTime(c.created_at)}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Conversation detail */}
          <div className="lg:col-span-2 flex flex-col bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)] rounded-2xl overflow-hidden">
            {!selectedConv ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                <div className="text-center">
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                  Select a conversation
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,15%)]">
                  <div>
                    <div className="text-sm font-semibold text-white">{selectedConv.user_name}</div>
                    <div className="text-[11px] text-slate-500">{selectedConv.subject}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${statusBadge(selectedConv.status)}`}>
                      {selectedConv.status}
                    </span>
                    {selectedConv.status === "open" && (
                      <button
                        onClick={() => handleClose(selectedConv.id)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-white px-2 py-1 rounded-lg border border-[hsl(217,33%,18%)] hover:border-[hsl(217,33%,25%)] transition-colors"
                      >
                        <XCircle size={11} />
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {(selectedConv.messages ?? []).map((m, i) => (
                    <div key={m.id ?? i} className={`flex gap-2.5 ${m.sender_type === "agent" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        m.sender_type === "agent" ? "bg-blue-500/20" : "bg-slate-500/20"
                      }`}>
                        {m.sender_type === "agent"
                          ? <Headphones size={11} className="text-blue-400" />
                          : <User size={11} className="text-slate-400" />}
                      </div>
                      <div className={`max-w-[78%] flex flex-col ${m.sender_type === "agent" ? "items-end" : ""}`}>
                        <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          m.sender_type === "agent"
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

                {/* Reply box */}
                {selectedConv.status === "open" ? (
                  <div className="p-3 border-t border-[hsl(217,33%,15%)] flex gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                      placeholder="Type a reply…"
                      className="flex-1 bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,20%)] focus:border-blue-500/50 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition-colors"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!reply.trim() || sending}
                      className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center transition-colors"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} className="text-white" />}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-t border-[hsl(217,33%,15%)] text-center text-xs text-slate-500">
                    This conversation is closed.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
