"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Sparkles,
  Activity,
  Brain,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ── Lazy-load the living star-field background — no SSR ──────────────────────
const NeuralBackground = dynamic(
  () => import("@/components/auth/NeuralBackground").then((m) => m.NeuralBackground),
  { ssr: false, loading: () => <BackgroundFallback /> }
);

// ── Static fallback while Three.js hydrates ───────────────────────────────────
function BackgroundFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "radial-gradient(ellipse at 40% 40%, #060e20 0%, #030914 70%)" }}
    />
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "signin" | "signup" | "forgot";

// ── Shared input component ────────────────────────────────────────────────────
interface InputProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  icon?: LucideIcon;
  autoComplete?: string;
  disabled?: boolean;
  suffix?: React.ReactNode;
}

function AuthInput({
  id, label, type = "text", value, onChange, placeholder, error, icon: Icon,
  autoComplete, disabled, suffix,
}: InputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-400 block">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            "w-full bg-white/5 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all",
            "focus:border-blue-500/60 focus:bg-white/8",
            Icon && "pl-9",
            suffix && "pr-10",
            error ? "border-red-500/40" : "border-white/10",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5 text-[11px] text-red-400"
          >
            <AlertCircle size={10} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sign In Form ──────────────────────────────────────────────────────────────
function SignInForm({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setErrors({ general: result.error });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AnimatePresence>
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-sm text-red-400">{errors.general}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthInput
        id="signin-email"
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@company.com"
        autoComplete="email"
        icon={Mail}
        error={errors.email}
        disabled={loading}
      />

      <AuthInput
        id="signin-password"
        label="Password"
        type={showPw ? "text" : "password"}
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete="current-password"
        icon={Lock}
        error={errors.password}
        disabled={loading}
        suffix={
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            tabIndex={-1}
          >
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setRemember(!remember)}
            className={cn(
              "w-4 h-4 rounded border transition-colors flex items-center justify-center",
              remember ? "bg-blue-600 border-blue-600" : "border-white/20"
            )}
          >
            {remember && <CheckCircle2 size={10} className="text-white" />}
          </div>
          <span className="text-xs text-slate-400 select-none">Remember me</span>
        </label>
        <button
          type="button"
          onClick={() => onSwitch("forgot")}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Signing in...</>
        ) : (
          <>Sign In <ArrowRight size={14} /></>
        )}
      </motion.button>

      <div className="text-center">
        <p className="text-[11px] text-slate-600">
          Demo:{" "}
          <button
            type="button"
            onClick={() => { setEmail("demo@neuralprotocol.io"); setPassword("demo1234"); }}
            className="text-blue-500 hover:text-blue-400"
          >
            use demo credentials
          </button>
        </p>
      </div>

      <div className="text-center">
        <span className="text-xs text-slate-500">Don&apos;t have an account? </span>
        <button
          type="button"
          onClick={() => onSwitch("signup")}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          Create account
        </button>
      </div>
    </form>
  );
}

// ── Sign Up Form ──────────────────────────────────────────────────────────────
function SignUpForm({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!company.trim()) e.company = "Company name is required";
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    return e;
  }

  const strength =
    password.length === 0 ? 0 :
    password.length < 6 ? 1 :
    password.length < 10 ? 2 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"][strength];

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const result = await signUp(name, email, password, company);
    setLoading(false);
    if (result.success) router.push("/dashboard");
    else setErrors({ general: result.error ?? "Registration failed" });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <AnimatePresence>
        {errors.general && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-sm text-red-400">{errors.general}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        <AuthInput id="name" label="Full Name" value={name} onChange={setName} placeholder="Alex Chen" icon={User} error={errors.name} disabled={loading} autoComplete="name" />
        <AuthInput id="company" label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" icon={Building2} error={errors.company} disabled={loading} autoComplete="organization" />
      </div>

      <AuthInput id="signup-email" label="Work Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" icon={Mail} error={errors.email} disabled={loading} autoComplete="email" />

      <AuthInput
        id="signup-password" label="Password" type={showPw ? "text" : "password"}
        value={password} onChange={setPassword} placeholder="Min. 8 characters"
        icon={Lock} error={errors.password} disabled={loading}
        suffix={
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      {password.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((lvl) => (
              <div key={lvl} className={cn("flex-1 h-1 rounded-full transition-all", lvl <= strength ? strengthColor : "bg-white/10")} />
            ))}
          </div>
          <div className="text-[10px] text-slate-500">{strengthLabel}</div>
        </div>
      )}

      <AuthInput id="confirm-password" label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" icon={Lock} error={errors.confirm} disabled={loading} autoComplete="new-password" />

      <motion.button
        type="submit" disabled={loading}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account...</> : <>Create Account <ArrowRight size={14} /></>}
      </motion.button>

      <div className="text-center">
        <span className="text-xs text-slate-500">Already have an account? </span>
        <button type="button" onClick={() => onSwitch("signin")} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</button>
      </div>
    </form>
  );
}

// ── Forgot Password Form ──────────────────────────────────────────────────────
function ForgotForm({ onSwitch }: { onSwitch: (m: Mode) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-4">
        <div className="w-14 h-14 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center mx-auto">
          <CheckCircle2 size={26} className="text-blue-400" />
        </div>
        <div>
          <div className="text-base font-semibold text-white">Check your inbox</div>
          <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
            If an account exists for <span className="text-white font-medium">{email}</span>, you will receive a password reset link shortly.
          </p>
        </div>
        <button onClick={() => onSwitch("signin")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto transition-colors">
          <ChevronLeft size={12} /> Back to Sign In
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm text-slate-400 leading-relaxed">
        Enter the email address associated with your account and we will send you a reset link.
      </p>

      <AuthInput
        id="forgot-email" label="Email address" type="email"
        value={email} onChange={setEmail} placeholder="you@company.com"
        icon={Mail} error={error} autoComplete="email"
      />

      <motion.button
        type="submit" disabled={loading}
        whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : <>Send Reset Link <ArrowRight size={14} /></>}
      </motion.button>

      <div className="text-center">
        <button type="button" onClick={() => onSwitch("signin")} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto transition-colors">
          <ChevronLeft size={12} /> Back to Sign In
        </button>
      </div>
    </form>
  );
}

// ── Trust badge strip shown below the card ────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Activity,  label: "Continuous Monitoring" },
  { icon: Brain,     label: "AI-Powered Risk Analysis" },
  { icon: Globe,     label: "Business-First Security" },
];

// ── Auth Card ─────────────────────────────────────────────────────────────────
const TITLES: Record<Mode, { heading: string; sub: string }> = {
  signin: { heading: "Welcome back",    sub: "Sign in to your workspace" },
  signup: { heading: "Get started free", sub: "Create your Neural Protocol account" },
  forgot: { heading: "Reset password",   sub: "We will send you a recovery link" },
};

function AuthCard() {
  const [mode, setMode] = useState<Mode>("signin");
  const { heading, sub } = TITLES[mode];

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Frosted card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "rgba(8, 18, 40, 0.72)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(59,130,246,0.06) inset",
        }}
      >
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

        <div className="p-8">
          {/* Logo + brand */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex items-center gap-2.5 mb-6"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <Shield size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-none">Neural Protocol</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Security intelligence for growing businesses.</div>
            </div>
            {/* Live badge */}
            <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-full"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-medium text-green-400">Live</span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <Sparkles size={12} className="text-blue-400" />
              </div>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Neural Protocol</span>
            </div>
            <h1 className="text-xl font-bold text-white">{heading}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{sub}</p>
          </motion.div>

          {/* Tab switcher */}
          {mode !== "forgot" && (
            <div className="flex gap-1 p-1 rounded-xl mb-5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-lg transition-all",
                    mode === m
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {m === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          )}

          {/* Animated form swap */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "signup" ? 16 : mode === "forgot" ? -16 : 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: mode === "signup" ? -16 : 16, filter: "blur(4px)" }}
              transition={{ duration: 0.22 }}
            >
              {mode === "signin" && <SignInForm onSwitch={setMode} />}
              {mode === "signup" && <SignUpForm onSwitch={setMode} />}
              {mode === "forgot" && <ForgotForm onSwitch={setMode} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="flex items-center justify-center gap-5 mt-5"
      >
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <Icon size={11} className="text-slate-500" />
            <span className="text-[10px] text-slate-600 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Legal footer */}
      <p className="text-center text-[11px] text-slate-700 mt-3">
        By signing in you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#030914" }}>
        <Loader2 size={24} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#030914" }}>
      {/* ── Living star-field background ── */}
      <NeuralBackground />

      {/* ── Edge vignette to keep card readable ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 25%, rgba(3,9,20,0.62) 100%)",
        }}
      />

      {/* ── Centered card overlay ── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <AuthCard />
      </div>
    </div>
  );
}
