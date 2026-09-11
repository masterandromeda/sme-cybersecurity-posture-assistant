"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Bell, Shield, Users, Key, Globe, ChevronRight } from "lucide-react";

const sections = [
  {
    icon: Shield,
    title: "Security Preferences",
    description: "Risk thresholds, alert sensitivity, and scan frequency",
    items: ["Risk Alert Threshold", "Continuous Monitoring Interval", "Email Digest Frequency"],
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure which alerts you receive and how",
    items: ["Email Notifications", "Slack Integration", "Critical Alert SMS"],
  },
  {
    icon: Users,
    title: "Team & Access",
    description: "Manage team members and their permissions",
    items: ["Team Members", "Role Assignments", "Invite Users"],
  },
  {
    icon: Key,
    title: "API & Integrations",
    description: "Connect Neural Protocol to your existing tools",
    items: ["API Keys", "Webhook Endpoints", "SIEM Integration"],
  },
  {
    icon: Globe,
    title: "Workspace Settings",
    description: "Business profile, branding, and plan management",
    items: ["Business Profile", "Plan & Billing", "Data Retention"],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-5 max-w-[800px] mx-auto">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-sm text-slate-400 mt-0.5">Configure Neural Protocol for your business</p>
      </div>

      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} hover>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{section.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{section.description}</div>
                  </div>
                </div>
                <div className="space-y-1 ml-12">
                  {section.items.map((item) => (
                    <button
                      key={item}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                    >
                      {item}
                      <ChevronRight size={13} className="text-slate-600" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
