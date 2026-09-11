"use client";

import { Shield, Lock, Eye, AlertTriangle } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="p-6 max-w-[760px] mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Security</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          How we protect your data and our platform.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { icon: Lock, title: "Encryption at rest", desc: "All data is AES-256 encrypted at rest in our database.", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { icon: Shield, title: "TLS in transit", desc: "All API traffic uses TLS 1.2+ with HSTS enforced.", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
          { icon: Eye, title: "No credential storage", desc: "We never store your external service passwords or API keys.", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          { icon: AlertTriangle, title: "Safe scanning", desc: "All probes are read-only. We never exploit vulnerabilities.", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
        ].map((item) => (
          <div key={item.title} className={`p-4 rounded-xl border ${item.bg}`}>
            <div className="flex items-start gap-3">
              <item.icon size={16} className={`${item.color} shrink-0 mt-0.5`} />
              <div>
                <div className="text-sm font-semibold text-white">{item.title}</div>
                <div className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[
          {
            heading: "Vulnerability disclosure",
            body: "If you discover a security vulnerability in Neural Protocol, please email dubeykumar878@gmail.com with \"Security Disclosure\" in the subject. We aim to respond within 48 hours and resolve critical issues within 7 days. We do not pursue legal action against good-faith security researchers."
          },
          {
            heading: "API key security",
            body: "Your OpenAI API key (if configured) is stored only on the backend server as an environment variable. It is never transmitted to the frontend or stored in the database."
          },
          {
            heading: "Scan authorisation",
            body: "Our scan engine blocks all private IP ranges, loopback addresses, and internal hostnames. Only publicly routable domains submitted by authenticated users are scanned."
          },
        ].map((s) => (
          <div key={s.heading}>
            <h3 className="text-sm font-semibold text-white mb-2">{s.heading}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)]">
        <div className="text-sm font-medium text-white mb-1">Report a security issue</div>
        <div className="text-xs text-slate-400 mb-2">For responsible disclosure, contact:</div>
        <a href="mailto:dubeykumar878@gmail.com?subject=Security Disclosure" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          dubeykumar878@gmail.com
        </a>
      </div>
    </div>
  );
}
