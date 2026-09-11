"use client";

export default function PrivacyPage() {
  return (
    <div className="p-6 max-w-[760px] mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Privacy Policy</h2>
        <p className="text-sm text-slate-500 mt-0.5">Last updated: January 2025</p>
      </div>

      {[
        {
          heading: "What data we collect",
          body: "We collect the domain names you submit for scanning, scan results (findings, scores, categories), your name and email address when you create an account, and support conversation messages when you contact us. We do not collect passwords to external services, payment details (we use third-party payment processors), or the personal data of your customers."
        },
        {
          heading: "How we use your data",
          body: "Your scan results are used solely to generate your security posture report and provide remediation guidance. Your email address is used to send you reports, alerts, and responses to support requests. We never sell, share, or rent your data to third parties."
        },
        {
          heading: "Data storage",
          body: "All data is stored in encrypted databases in the EU/UK region. We retain scan results for the duration of your subscription plus 90 days after cancellation, after which data is permanently deleted."
        },
        {
          heading: "Cookies",
          body: "We use only essential cookies required for authentication and session management. We do not use advertising or tracking cookies."
        },
        {
          heading: "Your rights",
          body: "You have the right to access, correct, or delete your data at any time. Contact dubeykumar878@gmail.com with any data requests. We respond within 30 days."
        },
        {
          heading: "Contact",
          body: "For privacy questions, email dubeykumar878@gmail.com."
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
