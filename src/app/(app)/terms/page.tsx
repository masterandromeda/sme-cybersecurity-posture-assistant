"use client";

export default function TermsPage() {
  return (
    <div className="p-6 max-w-[760px] mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Terms of Service</h2>
        <p className="text-sm text-slate-500 mt-0.5">Last updated: January 2025</p>
      </div>

      {[
        {
          heading: "Acceptance",
          body: "By using Neural Protocol you agree to these terms. If you disagree, do not use the service."
        },
        {
          heading: "Authorised scanning",
          body: "You must only submit domains and assets that you own or are explicitly authorised to test. Scanning third-party domains without authorisation is prohibited and may be illegal. Neural Protocol is not liable for misuse."
        },
        {
          heading: "Service availability",
          body: "We aim for 99.5% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance."
        },
        {
          heading: "Limitation of liability",
          body: "Neural Protocol is a security awareness tool. We do not guarantee that our findings represent a complete security audit. We are not liable for security incidents that occur despite using our service."
        },
        {
          heading: "Intellectual property",
          body: "The Neural Protocol platform, branding, and AI models are owned by Neural Protocol Ltd. Scan results are your data."
        },
        {
          heading: "Termination",
          body: "We may suspend or terminate your account for violations of these terms. You may cancel at any time with no penalty."
        },
        {
          heading: "Contact",
          body: "Questions about these terms: dubeykumar878@gmail.com."
        },
      ].map((s) => (
        <div key={s.heading}>
          <h3 className="text-sm font-semibold text-white mb-2">{s.heading}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
