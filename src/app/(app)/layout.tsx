"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { SecurityCopilot } from "@/components/copilot/SecurityCopilot";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Security Command Center",
  "/assessments": "Assessments",
  "/findings": "Findings",
  "/remediation": "Remediation Center",
  "/monitoring": "Monitoring",
  "/accounts": "Accounts & Vendors",
  "/posture": "Posture",
  "/readiness": "Readiness Center",
  "/settings": "Settings",
  "/help": "Help & Support",
  "/docs": "Documentation",
  "/pricing": "Pricing",
  "/contact": "Contact",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
  "/security": "Security",
  "/cookies": "Cookie Policy",
  "/support-admin": "Support Inbox",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Neural Protocol";
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(222,47%,7%)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-blue-400 animate-spin" />
          <span className="text-sm text-slate-500">Loading Neural Protocol...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Will redirect shortly; render nothing to avoid flash
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav title={title} />
        <main className="flex-1 overflow-y-auto bg-[hsl(222,47%,7%)]">
          {children}
          <SiteFooter />
        </main>
      </div>
      <SecurityCopilot />
    </div>
  );
}
