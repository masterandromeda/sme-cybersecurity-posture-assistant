"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Shield, X, CheckCheck, AlertTriangle, Globe, Building2, Wrench, FileText, type LucideIcon } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { mockNotifications, mockSecurityScore } from "@/lib/mock-data";
import { globalSearch, type SearchResult } from "@/lib/services";
import type { Notification } from "@/types";

const typeIcon: Record<Notification["type"], string> = {
  alert: "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

const resultIcon: Record<SearchResult["type"], LucideIcon> = {
  finding: AlertTriangle,
  asset: Globe,
  vendor: Building2,
  remediation: Wrench,
  user: FileText,
};

const resultTypeColor: Record<SearchResult["type"], string> = {
  finding: "text-orange-400",
  asset: "text-blue-400",
  vendor: "text-purple-400",
  remediation: "text-green-400",
  user: "text-slate-400",
};

export function TopNav({ title }: { title: string }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const searchRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;
  const score = mockSecurityScore;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      const clear = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(clear);
    }
    const t = setTimeout(async () => {
      const results = await globalSearch(searchQuery);
      setSearchResults(results);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function markAllRead() {
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }

  const findingResults = searchResults.filter((r) => r.type === "finding");
  const assetResults = searchResults.filter((r) => r.type === "asset" || r.type === "vendor");
  const remediationResults = searchResults.filter((r) => r.type === "remediation");

  return (
    <header className="h-14 border-b border-[hsl(217,33%,14%)] bg-[hsl(222,47%,8%)] flex items-center px-5 gap-4 shrink-0">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Security Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)]">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] text-slate-400">Monitoring Active</span>
          <span className="text-[11px] font-semibold text-blue-400">{score.current}/100</span>
        </div>

        {/* Search */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => { setSearchOpen(true); setNotifOpen(false); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Search"
          >
            <Search size={16} />
          </button>

          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                className="absolute right-0 top-10 w-80 bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)] rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="flex items-center gap-2 bg-[hsl(222,47%,13%)] px-3 py-2.5">
                  <Search size={13} className="text-slate-500" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search findings, assets, remediations..."
                    className="bg-transparent text-sm text-white placeholder-slate-500 outline-none flex-1"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")}>
                      <X size={12} className="text-slate-500 hover:text-white" />
                    </button>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto divide-y divide-[hsl(217,33%,13%)]">
                    {/* Group summary */}
                    <div className="px-3 py-1.5 text-[10px] text-slate-600 flex items-center gap-2">
                      {findingResults.length > 0 && <span>{findingResults.length} finding{findingResults.length > 1 ? "s" : ""}</span>}
                      {assetResults.length > 0 && <span>{assetResults.length} asset{assetResults.length > 1 ? "s" : ""}</span>}
                      {remediationResults.length > 0 && <span>{remediationResults.length} remediation{remediationResults.length > 1 ? "s" : ""}</span>}
                    </div>
                    {searchResults.map((r) => {
                      const Icon = resultIcon[r.type] ?? FileText;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSearchOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 text-left transition-colors"
                        >
                          <Icon size={13} className={resultTypeColor[r.type]} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">{r.title}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                              <span className="capitalize">{r.type}</span>
                              <span>·</span>
                              <span>{r.subtitle}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery ? (
                  <div className="py-6 text-center text-xs text-slate-600">No results for &quot;{searchQuery}&quot;</div>
                ) : (
                  <div className="px-3 py-3">
                    <div className="text-[10px] text-slate-600 mb-1.5">Try searching for:</div>
                    {["MFA", "email", "ssl", "admin"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSearchQuery(s)}
                        className="text-[10px] text-blue-400 mr-2 hover:underline"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); setSearchOpen(false); }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-10 w-80 bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,17%)] rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(217,33%,14%)]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unread > 0 && (
                      <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 rounded-full px-1.5 py-0.5">{unread}</span>
                    )}
                  </div>
                  <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[hsl(217,33%,14%)]">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn("px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer", !n.read && "bg-blue-500/5")}
                      onClick={() => setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-0.5 w-5 h-5 rounded-md border text-[10px] flex items-center justify-center shrink-0", typeIcon[n.type])}>
                          {n.type === "alert" ? "!" : n.type === "success" ? "✓" : n.type === "warning" ? "⚠" : "i"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-xs font-medium text-white truncate">{n.title}</span>
                            {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</div>
                          <div className="text-[10px] text-slate-600 mt-1">{formatRelativeTime(n.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Business badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)]">
          <Shield size={12} className="text-blue-400" />
          <span className="text-xs text-slate-300 font-medium">Acme Corp</span>
        </div>
      </div>
    </header>
  );
}
