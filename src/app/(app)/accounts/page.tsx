"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  AlertTriangle,
  ShieldCheck,
  Database,
  Link2,
  Users,
  Shield,
  Clock,
  CheckCircle2,
  X,
  Key,
  UserX,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badges";
import { mockVendors, mockUserAccounts } from "@/lib/mock-data";
import type { UserAccount } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ─── User Row ─────────────────────────────────────────────────────────────
function UserRow({ user, onAction }: { user: UserAccount; onAction: (u: UserAccount, action: string) => void }) {
  const days = daysSince(user.lastActive);
  const isDormant = user.status === "dormant";
  const hasRisk = user.riskFlags.length > 0;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("hover:bg-white/5 transition-colors", isDormant && "opacity-75")}
    >
      <td className="py-3 pl-0 pr-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">{user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
          </div>
          <div>
            <div className="text-xs font-medium text-white">{user.name}</div>
            <div className="text-[10px] text-slate-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <span className={cn(
          "text-[10px] font-medium rounded px-1.5 py-0.5 border capitalize",
          user.role === "administrator"
            ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
            : user.role === "manager"
            ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
            : "text-slate-400 bg-slate-500/10 border-slate-500/20"
        )}>
          {user.role}
        </span>
      </td>
      <td className="py-3 px-3">
        <div className={cn("text-xs flex items-center gap-1", days > 90 ? "text-red-400" : days > 30 ? "text-yellow-400" : "text-slate-400")}>
          <Clock size={10} />
          {days === 0 ? "Today" : `${days}d ago`}
        </div>
      </td>
      <td className="py-3 px-3">
        <span className={cn(
          "text-[10px] font-medium rounded px-1.5 py-0.5 border capitalize",
          user.accessLevel === "high" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
          user.accessLevel === "medium" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
          "text-green-400 bg-green-500/10 border-green-500/20"
        )}>{user.accessLevel}</span>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {user.riskFlags.includes("no-mfa") && (
            <span className="text-[9px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-1 py-0.5 flex items-center gap-0.5">
              <Key size={8} /> No MFA
            </span>
          )}
          {user.riskFlags.includes("dormant") && (
            <span className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1 py-0.5 flex items-center gap-0.5">
              <UserX size={8} /> Dormant
            </span>
          )}
          {!hasRisk && <span className="text-[9px] text-green-400">✓ OK</span>}
        </div>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          {isDormant && (
            <button
              onClick={() => onAction(user, "review")}
              className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-2 py-0.5 hover:bg-orange-500/15 transition-colors"
            >
              Review Access
            </button>
          )}
          {!user.mfaEnabled && (
            <button
              onClick={() => onAction(user, "mfa")}
              className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5 hover:bg-blue-500/15 transition-colors"
            >
              Enforce MFA
            </button>
          )}
          <button className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-white transition-colors">
            <MoreHorizontal size={13} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Action Modal ─────────────────────────────────────────────────────────
function ActionModal({
  user,
  action,
  onClose,
}: {
  user: UserAccount;
  action: string;
  onClose: () => void;
}) {
  const isMfa = action === "mfa";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[hsl(222,47%,10%)] border border-[hsl(217,33%,18%)] rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              {isMfa ? "Enforce MFA" : "Review Account Access"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{user.name} · {user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {isMfa ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
              <div className="flex items-center gap-2 mb-1.5">
                <Key size={13} className="text-orange-400" />
                <span className="text-xs font-semibold text-orange-300">MFA not enabled</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This account does not have multi-factor authentication enabled. Enabling MFA dramatically reduces the risk of account takeover.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Clicking below will send an email to <span className="text-white">{user.email}</span> asking them to enable MFA on their next login. You will not be removing their access.
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-400 border border-[hsl(217,33%,20%)] rounded-lg hover:text-white transition-colors">Cancel</button>
              <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">Send MFA Request</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/15">
              <div className="flex items-center gap-2 mb-1.5">
                <UserX size={13} className="text-red-400" />
                <span className="text-xs font-semibold text-red-300">Dormant account detected</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This account has not been active for <span className="text-white font-medium">{daysSince(user.lastActive)} days</span>. Dormant accounts with access represent an unnecessary security risk.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Neural Protocol does not remove accounts directly. Choose an action to take on your identity provider.
            </p>
            <div className="space-y-2">
              <button onClick={onClose} className="w-full py-2 text-xs font-medium text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <UserX size={12} /> Remove Access (external)
              </button>
              <button onClick={onClose} className="w-full py-2 text-xs font-medium text-blue-300 border border-blue-500/20 hover:bg-blue-500/10 rounded-lg transition-colors">
                Mark as Reviewed
              </button>
              <button onClick={onClose} className="w-full py-2 text-xs text-slate-400 hover:text-white rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

const NOW = Date.now();
function monthsSince(dateStr: string): number {
  return Math.floor((NOW - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30));
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<"users" | "vendors">("users");
  const [actionModal, setActionModal] = useState<{ user: UserAccount; action: string } | null>(null);
  const [vendorReviewId, setVendorReviewId] = useState<string | null>(null);

  const totalUsers = mockUserAccounts.length;
  const admins = mockUserAccounts.filter((u) => u.role === "administrator").length;
  const dormant = mockUserAccounts.filter((u) => u.status === "dormant").length;
  const highPriv = mockUserAccounts.filter((u) => u.accessLevel === "high").length;

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Accounts & Vendors</h2>
          <p className="text-sm text-slate-400 mt-0.5">Manage user accounts and third-party service access</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[hsl(222,47%,13%)] hover:bg-[hsl(222,47%,16%)] border border-[hsl(217,33%,20%)] text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={14} /> Add Account
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[hsl(222,47%,11%)] rounded-xl w-fit">
        {(["users", "vendors"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
              activeTab === tab ? "bg-[hsl(222,47%,16%)] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {tab === "users" ? `User Accounts (${totalUsers})` : `Third-Party Vendors (${mockVendors.length})`}
          </button>
        ))}
      </div>

      {/* ── User Accounts Tab ── */}
      {activeTab === "users" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Users", value: totalUsers, icon: Users, color: "text-slate-300" },
              { label: "Administrators", value: admins, icon: Shield, color: "text-orange-400" },
              { label: "Dormant Accounts", value: dormant, icon: UserX, color: "text-red-400" },
              { label: "High-Privilege", value: highPriv, icon: Key, color: "text-yellow-400" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <s.icon size={13} className="text-slate-500" />
                    <span className="text-xs text-slate-500">{s.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Dormant account warning */}
          {dormant > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/15">
              <UserX size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-red-300">{dormant} dormant account{dormant > 1 ? "s" : ""} detected</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  These accounts have not been active for over 90 days and still have system access. Review or remove unnecessary access to reduce risk.
                </p>
              </div>
            </div>
          )}

          {/* User table */}
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="border-b border-[hsl(217,33%,15%)]">
                      {["Name", "Role", "Last Active", "Access Level", "Risk Flags", "Action"].map((h) => (
                        <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide py-2 px-3 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(217,33%,13%)]">
                    {mockUserAccounts.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        onAction={(u, a) => setActionModal({ user: u, action: a })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Vendors Tab ── */}
      {activeTab === "vendors" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400">
                  <span className="text-white font-medium">Third-party risk:</span> These services have access to your business systems or data. Review each one periodically and revoke access for services you no longer use.
                </div>
              </div>
            </CardContent>
          </Card>

          {mockVendors.map((vendor, i) => {
            const isSelected = vendorReviewId === vendor.id;
            const monthsSinceReview = monthsSince(vendor.lastReviewed);
            const reviewDue = monthsSinceReview >= 3;

            return (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card hover>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[hsl(222,47%,13%)] border border-[hsl(217,33%,18%)] flex items-center justify-center shrink-0 text-sm font-bold text-blue-400">
                        {vendor.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{vendor.name}</span>
                          <span className="text-[10px] text-slate-500 border border-[hsl(217,33%,20%)] rounded px-1.5 py-0.5">{vendor.category}</span>
                          <span className={cn(
                            "text-[10px] font-medium rounded px-1.5 py-0.5 border capitalize",
                            vendor.accessLevel === "high" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
                            vendor.accessLevel === "medium" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
                            "text-green-400 bg-green-500/10 border-green-500/20"
                          )}>{vendor.accessLevel} access</span>
                          {reviewDue && (
                            <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">
                              Review overdue
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{vendor.notes}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {vendor.hasDataAccess && (
                            <div className="flex items-center gap-1 text-[10px] text-orange-400">
                              <Database size={10} /> Customer data access
                            </div>
                          )}
                          {vendor.hasSSOIntegration && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-400">
                              <Link2 size={10} /> SSO connected
                            </div>
                          )}
                          <div className="text-[10px] text-slate-500">
                            Last reviewed: {vendor.lastReviewed} ({monthsSinceReview}mo ago)
                          </div>
                        </div>

                        {/* Review Panel */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-[hsl(217,33%,15%)] space-y-2">
                                <div className="text-xs font-semibold text-white">Access Review — {vendor.name}</div>
                                <div className="text-xs text-slate-400 leading-relaxed">
                                  Review whether <span className="text-white">{vendor.name}</span> still requires {vendor.accessLevel} level access to your business systems. If this integration is no longer in use, revoking access reduces your attack surface.
                                </div>
                                <div className="flex items-center gap-2 pt-1 flex-wrap">
                                  <button onClick={() => setVendorReviewId(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/25 text-xs font-medium rounded-lg hover:bg-green-500/20 transition-colors">
                                    <CheckCircle2 size={11} /> Mark as Reviewed
                                  </button>
                                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium rounded-lg hover:bg-red-500/15 transition-colors">
                                    <X size={11} /> Revoke Access (external)
                                  </button>
                                  <button onClick={() => setVendorReviewId(null)} className="text-xs text-slate-500 hover:text-white ml-auto">Cancel</button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <RiskBadge risk={vendor.riskLevel} size="xs" />
                        {!isSelected ? (
                          <button
                            onClick={() => setVendorReviewId(vendor.id)}
                            className="text-xs text-blue-400 border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/15 rounded-lg px-2.5 py-1.5 transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck size={11} /> Review Access
                          </button>
                        ) : (
                          <button
                            onClick={() => setVendorReviewId(null)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white border border-[hsl(217,33%,20%)] transition-colors"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal && (
          <ActionModal
            user={actionModal.user}
            action={actionModal.action}
            onClose={() => setActionModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
