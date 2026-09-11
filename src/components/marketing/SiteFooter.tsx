"use client";

/**
 * SiteFooter — Neural Protocol premium enterprise footer.
 * All links work.
 */

import Link from "next/link";
import { Shield } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Dashboard",          href: "/dashboard" },
    { label: "Assessments",        href: "/assessments" },
    { label: "Findings",           href: "/findings" },
    { label: "Remediation",        href: "/remediation" },
    { label: "Monitoring",         href: "/monitoring" },
    { label: "Security Copilot",   href: "/dashboard" },
  ],
  Documentation: [
    { label: "Getting Started",    href: "/docs" },
    { label: "Security Assessment",href: "/docs" },
    { label: "Findings",           href: "/docs" },
    { label: "Remediation",        href: "/docs" },
    { label: "Reports",            href: "/docs" },
    { label: "API Reference",      href: "/docs" },
  ],
  Company: [
    { label: "Pricing",            href: "/pricing" },
    { label: "Contact",            href: "/contact" },
    { label: "Help & Support",     href: "/help" },
    { label: "Support Inbox",      href: "/support-admin" },
    { label: "Email us",           href: "mailto:dubeykumar878@gmail.com" },
  ],
  Legal: [
    { label: "Privacy Policy",     href: "/privacy" },
    { label: "Terms of Service",   href: "/terms" },
    { label: "Security",           href: "/security" },
    { label: "Cookie Policy",      href: "/cookies" },
  ],
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[hsl(217,33%,15%)] bg-[hsl(222,47%,8%)]">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        {/* Top: brand + links grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 pb-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Shield size={14} className="text-blue-400" />
              </div>
              <span className="text-sm font-bold text-white tracking-tight">Neural Protocol</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 max-w-[200px]">
              Security intelligence for growing businesses. Real scans, plain-language results.
            </p>
            <a
              href="mailto:dubeykumar878@gmail.com"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              dubeykumar878@gmail.com
            </a>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                {section}
              </div>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("mailto:") ? (
                      <a
                        href={link.href}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-[hsl(217,33%,13%)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            © {year} Neural Protocol. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Terms
            </Link>
            <Link href="/security" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
