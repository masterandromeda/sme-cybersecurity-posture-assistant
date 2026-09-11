"use client";

export default function CookiesPage() {
  return (
    <div className="p-6 max-w-[760px] mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Cookie Policy</h2>
        <p className="text-sm text-slate-500 mt-0.5">Last updated: January 2025</p>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">
        Neural Protocol uses only essential cookies required to keep you signed in and maintain your session. We do not use advertising cookies, tracking cookies, or analytics cookies from third parties.
      </p>
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Essential cookies</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-400">
            <thead>
              <tr className="border-b border-[hsl(217,33%,17%)]">
                <th className="text-left py-2 text-slate-500 font-medium">Cookie</th>
                <th className="text-left py-2 text-slate-500 font-medium">Purpose</th>
                <th className="text-left py-2 text-slate-500 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "np_session", purpose: "Authentication session token", duration: "7 days" },
                { name: "np_csrf", purpose: "CSRF protection token", duration: "Session" },
              ].map((c) => (
                <tr key={c.name} className="border-b border-[hsl(217,33%,13%)]">
                  <td className="py-2 font-mono text-slate-300">{c.name}</td>
                  <td className="py-2">{c.purpose}</td>
                  <td className="py-2">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500">Contact dubeykumar878@gmail.com with cookie questions.</p>
    </div>
  );
}
