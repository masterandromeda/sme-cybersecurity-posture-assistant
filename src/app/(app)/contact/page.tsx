"use client";

import { ContactSection } from "@/components/marketing/ContactSection";

export default function ContactPage() {
  return (
    <div className="p-6 max-w-[900px] mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Contact</h2>
        <p className="text-sm text-slate-400 mt-0.5">Get in touch — we reply to every message.</p>
      </div>
      <ContactSection />
    </div>
  );
}
