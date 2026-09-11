"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Shield, Loader2, Sparkles, Zap } from "lucide-react";
import { sendCopilotMessage, type CopilotMessage } from "@/lib/services";
import { cn } from "@/lib/utils";

const SUGGESTED = [
  "What should I fix first?",
  "Why is my security score low?",
  "What changed recently?",
  "Explain my email security issues",
  "Which issue has the biggest business impact?",
  "Give me a security checklist",
  "How can I improve my score?",
  "Are any services exposed to the internet?",
];

// ── Markdown renderer — bold + line breaks ────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  // Split on **bold**, newlines, and numbered lists
  const lines = text.split("\n");
  return (
    <span>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <span key={li}>
            {parts.map((part, i) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={i} className="font-semibold text-white">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

// ── Main Copilot component ────────────────────────────────────────────────────
export function SecurityCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your Security Copilot. Ask me anything about your security posture — " +
        "I'll answer in plain language using your real scan results.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg: CopilotMessage = {
      role: "user",
      content: q,
      timestamp: new Date().toISOString(),
    };
    // Optimistically add user message
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Pass the full conversation history (excluding the greeting) for multi-turn context
    const historyForApi = [...messages.slice(1), userMsg]; // skip initial greeting
    const reply = await sendCopilotMessage(q, historyForApi);

    setMessages((prev) => [...prev, reply]);
    setLoading(false);
  }

  const showSuggested = messages.length <= 1 && !loading;

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-xl flex items-center justify-center gap-2 px-4 transition-all",
          open && "hidden"
        )}
        aria-label="Open Security Copilot"
      >
        <Sparkles size={15} />
        <span className="text-sm font-semibold">Ask AI</span>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-6 right-6 z-50 w-[390px] max-h-[560px] flex flex-col bg-[hsl(222,47%,9%)] border border-[hsl(217,33%,18%)] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[hsl(217,33%,14%)] shrink-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Sparkles size={13} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white leading-none">Security Copilot</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Powered by real scan data</div>
              </div>
              {/* Live indicator */}
              <div className="flex items-center gap-1 mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400 font-medium">Live</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                      <Shield size={10} className="text-blue-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[86%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-[hsl(222,47%,13%)] text-slate-300 border border-[hsl(217,33%,17%)] rounded-bl-sm"
                    )}
                  >
                    <MarkdownText text={msg.content} />
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Loader2 size={10} className="text-blue-400 animate-spin" />
                  </div>
                  <div className="bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,17%)] rounded-2xl rounded-bl-sm px-3 py-2.5">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map((d) => (
                        <motion.div
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-slate-500"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                          transition={{ repeat: Infinity, duration: 1.1, delay: d * 0.18 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Suggested questions */}
            <AnimatePresence>
              {showSuggested && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-2 pt-1 border-t border-[hsl(217,33%,14%)] shrink-0 overflow-hidden"
                >
                  <div className="text-[10px] text-slate-600 mb-2 flex items-center gap-1">
                    <Zap size={9} className="text-slate-600" /> Try asking:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED.slice(0, 4).map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1 hover:bg-blue-500/20 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="px-3 py-3 border-t border-[hsl(217,33%,14%)] shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your security..."
                  disabled={loading}
                  className="flex-1 bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,17%)] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 text-white flex items-center justify-center transition-colors shrink-0"
                >
                  {loading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={12} />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
