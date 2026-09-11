"use client";

/**
 * ContactSection — "Talk to Us" contact form.
 * Submits to POST /api/v1/contact (stored in PostgreSQL + email notification).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { submitContact, type ContactFormData } from "@/lib/support-service";

const SUBJECTS = [
  "General enquiry",
  "Sales / pricing",
  "Technical question",
  "Enterprise / custom plan",
  "Partnership",
  "Security concern",
  "Other",
];

export function ContactSection() {
  const [form, setForm] = useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
    subject: "General enquiry",
    message: "",
  });
  const [phase, setPhase] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof ContactFormData, boolean>>>({});

  const field = (key: keyof ContactFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
  });

  const errors: Partial<Record<keyof ContactFormData, string>> = {};
  if (!form.name.trim())     errors.name    = "Name is required";
  if (!form.email.trim())    errors.email   = "Email is required";
  else if (!form.email.includes("@")) errors.email = "Enter a valid email";
  if (!form.company.trim())  errors.company = "Company / subject is required";
  if (!form.message.trim())  errors.message = "Message is required";
  else if (form.message.trim().length < 10) errors.message = "Message must be at least 10 characters";

  const valid = Object.keys(errors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || phase === "submitting") return;
    setTouched({ name: true, email: true, company: true, subject: true, message: true });
    if (!valid) return;

    setPhase("submitting");
    setErrorMsg("");

    try {
      await submitContact(form);
      setPhase("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  if (phase === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-16 gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-green-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-white">Message received!</div>
          <div className="text-sm text-slate-400 mt-1 max-w-xs">
            We&apos;ll get back to you at <span className="text-white">{form.email}</span> within 24 hours.
          </div>
        </div>
        <button
          onClick={() => { setForm({ name: "", email: "", company: "", subject: "General enquiry", message: "" }); setPhase("idle"); setTouched({}); }}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2"
        >
          Send another message
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left: info */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <MessageSquare size={17} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Talk to Us</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Have a question, want a demo, or need help choosing the right plan?
            Send us a message — a real person will reply.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: "Email", value: "dubeykumar878@gmail.com", href: "mailto:dubeykumar878@gmail.com" },
            { label: "Sales", value: "Talk to us about plans and pricing", href: "mailto:dubeykumar878@gmail.com?subject=Neural Protocol - Sales" },
            { label: "Support", value: "Use the live chat on the Help tab", href: null },
          ].map((item) => (
            <div key={item.label} className="flex gap-3 p-3 rounded-xl bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)]">
              <div className="text-[11px] font-semibold text-slate-500 w-14 shrink-0 pt-0.5">{item.label}</div>
              {item.href ? (
                <a href={item.href} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  {item.value}
                </a>
              ) : (
                <span className="text-xs text-slate-400">{item.value}</span>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs text-slate-600 leading-relaxed">
          Neural Protocol is built for business owners who want real security without the complexity.
          We typically respond to all enquiries within 24 hours.
        </div>
      </div>

      {/* Right: form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Your Name *</label>
          <input
            {...field("name")}
            placeholder="Alex Johnson"
            className={`w-full bg-[hsl(222,47%,11%)] border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors
              ${touched.name && errors.name ? "border-red-500/50 focus:border-red-500/70" : "border-[hsl(217,33%,20%)] focus:border-blue-500/50"}`}
          />
          {touched.name && errors.name && (
            <p className="text-[11px] text-red-400 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Work Email *</label>
          <input
            {...field("email")}
            type="email"
            placeholder="you@company.com"
            className={`w-full bg-[hsl(222,47%,11%)] border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors
              ${touched.email && errors.email ? "border-red-500/50 focus:border-red-500/70" : "border-[hsl(217,33%,20%)] focus:border-blue-500/50"}`}
          />
          {touched.email && errors.email && (
            <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Company */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Company *</label>
          <input
            {...field("company")}
            placeholder="Acme Corp"
            className={`w-full bg-[hsl(222,47%,11%)] border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors
              ${touched.company && errors.company ? "border-red-500/50 focus:border-red-500/70" : "border-[hsl(217,33%,20%)] focus:border-blue-500/50"}`}
          />
          {touched.company && errors.company && (
            <p className="text-[11px] text-red-400 mt-1">{errors.company}</p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Subject</label>
          <select
            {...field("subject")}
            className="w-full bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,20%)] focus:border-blue-500/50 rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors appearance-none"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s} className="bg-[hsl(222,47%,11%)]">{s}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1.5">Message *</label>
          <textarea
            {...field("message")}
            rows={4}
            placeholder="Tell us how we can help…"
            className={`w-full bg-[hsl(222,47%,11%)] border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors resize-none
              ${touched.message && errors.message ? "border-red-500/50 focus:border-red-500/70" : "border-[hsl(217,33%,20%)] focus:border-blue-500/50"}`}
          />
          {touched.message && errors.message && (
            <p className="text-[11px] text-red-400 mt-1">{errors.message}</p>
          )}
        </div>

        <AnimatePresence>
          {phase === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-3 rounded-xl bg-red-500/8 border border-red-500/20"
            >
              <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
              <span className="text-xs text-red-300">{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={phase === "submitting"}
          onClick={() => setTouched({ name: true, email: true, company: true, subject: true, message: true })}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {phase === "submitting"
            ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
            : <><Send size={15} /> Talk to Us</>}
        </button>

        <p className="text-[11px] text-slate-600 text-center">
          We reply to all messages. No automated responses.
        </p>
      </form>
    </div>
  );
}
