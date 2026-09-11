"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ScanSearch,
  AlertTriangle,
  Wrench,
  Activity,
  Building2,
  BarChart3,
  BookOpen,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bell,
  ChevronDown,
  Check,
  User,
  LogOut,
  CreditCard,
  FileText,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockWorkspaces, mockNotifications } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assessments", label: "Assessments", icon: ScanSearch },
  { href: "/findings", label: "Findings", icon: AlertTriangle },
  { href: "/remediation", label: "Remediation", icon: Wrench },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/accounts", label: "Accounts & Vendors", icon: Building2 },
  { href: "/posture", label: "Posture", icon: BarChart3 },
  { href: "/readiness", label: "Readiness Center", icon: BookOpen },
];

const bottomNavItems = [
  { href: "/pricing",  label: "Pricing",        icon: DollarSign },
  { href: "/docs",     label: "Documentation",   icon: FileText },
  { href: "/contact",  label: "Contact",          icon: MessageSquare },
  { href: "/settings", label: "Settings",         icon: Settings },
  { href: "/help",     label: "Help & Support",   icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(mockWorkspaces[0]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unreadNotifications = mockNotifications.filter((n) => !n.read).length;

  async function handleSignOut() {
    setUserMenuOpen(false);
    await signOut();
    router.push("/login");
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-[hsl(222,47%,8%)] border-r border-[hsl(217,33%,14%)] shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[hsl(217,33%,14%)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Shield className="w-4.5 h-4.5 text-blue-400" size={18} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <div className="text-sm font-semibold text-white tracking-tight leading-none">Neural Protocol</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Security intelligence</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="px-2 pt-3 pb-2 shrink-0">
        <button
          onClick={() => !collapsed && setWorkspaceOpen(!workspaceOpen)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors hover:bg-white/5",
            collapsed && "justify-center"
          )}
        >
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">{activeWorkspace.name[0]}</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0 flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{activeWorkspace.name}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{activeWorkspace.plan} plan</div>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", workspaceOpen && "rotate-180")} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {workspaceOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] overflow-hidden"
            >
              {mockWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { setActiveWorkspace(ws); setWorkspaceOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-blue-600/80 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-white">{ws.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">{ws.name}</div>
                    <div className="text-[10px] text-slate-500">{ws.industry}</div>
                  </div>
                  {ws.id === activeWorkspace.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all group relative",
                isActive
                  ? "bg-blue-500/15 text-blue-300 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                collapsed && "justify-center"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="active-nav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-400 rounded-full"
                />
              )}
              <Icon size={16} className="shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.href === "/findings" && !collapsed && (
                <span className="ml-auto text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded px-1.5 py-0.5 font-medium">
                  6
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="px-2 py-2 border-t border-[hsl(217,33%,14%)] space-y-0.5 shrink-0">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all",
                isActive ? "text-blue-300 bg-blue-500/10" : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                collapsed && "justify-center"
              )}
            >
              <Icon size={16} className="shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* User Profile */}
        <div className="pt-1">
          <button
            onClick={() => !collapsed && setUserMenuOpen(!userMenuOpen)}
            title={collapsed ? "Profile" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors",
              collapsed && "justify-center"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">{user?.avatarInitials ?? "?"}</span>
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-medium text-slate-200 truncate">{user?.name ?? "User"}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{user?.role ?? "member"}</div>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <div className="flex items-center gap-1">
                {unreadNotifications > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </div>
            )}
          </button>

          <AnimatePresence>
            {userMenuOpen && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-24 left-2 right-2 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] overflow-hidden shadow-xl z-50"
              >
                {[
                  { icon: User, label: "Profile Settings", action: () => setUserMenuOpen(false) },
                  { icon: CreditCard, label: "Billing", action: () => setUserMenuOpen(false) },
                  { icon: Bell, label: "Notifications", action: () => setUserMenuOpen(false) },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    <item.icon size={13} className="text-slate-500" />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-[hsl(217,33%,15%)] my-0.5" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/5 hover:text-red-300 transition-colors"
                >
                  <LogOut size={13} className="text-red-500/70" />
                  Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-[52px] -right-3 w-6 h-6 rounded-full bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,17%)] flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10 shadow-md"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
