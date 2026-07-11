import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, Eye, EyeOff, ArrowLeft, Building2, Mail, Lock,
  User, Globe, Briefcase, Sparkles, Shield, Zap, AlertCircle,
  Users, BarChart3, Clock, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type Mode = "login" | "signup" | "forgot";

interface Plan {
  id: number;
  name: string;
  description: string | null;
  priceMonthly: string | null;
  priceYearly: string | null;
  maxUsers: number | null;
  maxEmployees: number | null;
  allowedModules: string[] | null;
}

const SIGNUP_STEPS = ["Account", "Company", "Plan", "Verify", "Done"] as const;

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance & Banking", "Manufacturing", "Retail",
  "Education", "Real Estate", "Hospitality", "Logistics", "Consulting",
  "Media & Entertainment", "Government", "Non-profit", "Other",
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Singapore", "UAE", "Germany", "France", "Netherlands", "Other",
];

const STATS = [
  { icon: Users, value: "500+", label: "Companies" },
  { icon: BarChart3, value: "50K+", label: "Employees" },
  { icon: Clock, value: "99.9%", label: "Uptime" },
  { icon: Star, value: "4.9★", label: "Rating" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function PasswordInput({ id, value, onChange, disabled, placeholder, autoComplete }: {
  id: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder ?? "••••••••"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="pr-10 h-11 bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500/20"
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special char", ok: /[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(password) },
  ];
  if (!password) return null;
  const score = checks.filter((c) => c.ok).length;
  const color = score <= 2 ? "bg-red-500" : score <= 3 ? "bg-amber-500" : score === 4 ? "bg-blue-500" : "bg-green-500";
  const label = score <= 2 ? "Weak" : score <= 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1 items-center">
        {checks.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", i < score ? color : "bg-gray-100")} />
        ))}
        <span className={cn("text-xs font-medium ml-2 w-12 shrink-0", score <= 2 ? "text-red-500" : score <= 3 ? "text-amber-500" : score === 4 ? "text-blue-500" : "text-green-500")}>
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={cn("text-xs transition-colors", c.ok ? "text-green-600 font-medium" : "text-gray-400")}>
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            const next = value.split("").concat(Array(6).fill("")).slice(0, 6);
            next[i] = v.slice(-1);
            onChange(next.join("").replace(/\s/g, ""));
            if (v && i < 5) {
              const el = document.getElementById(`otp-${i + 1}`);
              el?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              const el = document.getElementById(`otp-${i - 1}`);
              el?.focus();
            }
          }}
          onPaste={(e) => {
            const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (paste) { onChange(paste); e.preventDefault(); }
          }}
          id={`otp-${i}`}
          className={cn(
            "w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-white outline-none transition-all duration-150",
            "focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:shadow-sm",
            d ? "border-violet-400 bg-violet-50/50 text-violet-700" : "border-gray-200 text-gray-800",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  const price = plan.priceMonthly ? `₹${Number(plan.priceMonthly).toLocaleString()}/mo` : "Free";
  const isPopular = plan.name?.toLowerCase().includes("pro") || plan.name?.toLowerCase().includes("growth");
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200",
        selected
          ? "border-violet-500 bg-violet-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/30"
      )}
    >
      {isPopular && (
        <span className="absolute -top-2.5 left-4 text-xs font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white px-2.5 py-0.5 rounded-full">
          Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">{plan.name}</span>
            {selected && <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />}
          </div>
          {plan.description && (
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{plan.description}</p>
          )}
          <div className="flex flex-wrap gap-x-3 mt-1.5 text-xs text-gray-500">
            {plan.maxEmployees && <span>Up to {plan.maxEmployees} employees</span>}
            {plan.maxUsers && <span>{plan.maxUsers} users</span>}
          </div>
        </div>
        <span className="shrink-0 text-base font-bold text-gray-900">{price}</span>
      </div>
    </button>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

function FormInput({
  id, type = "text", icon: Icon, label, placeholder, value, onChange,
  disabled, autoComplete, required, rightElement, hint,
}: {
  id: string; type?: string; icon?: React.ComponentType<{ className?: string }>;
  label: string; placeholder?: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; autoComplete?: string; required?: boolean;
  rightElement?: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
        {rightElement}
      </div>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />}
        <Input
          id={id} type={type} autoComplete={autoComplete}
          placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required} disabled={disabled}
          className={cn("h-11 bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500/20", Icon && "pl-9")}
        />
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { isSignedIn, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();
  const initialMode = (): Mode => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode");
    if (m === "signup" || m === "forgot") return m;
    return "login";
  };
  const [mode, setMode] = useState<Mode>(initialMode);

  // ── Login ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // ── Signup (multi-step) ──
  const [step, setStep] = useState(0);
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [signupError, setSignupError] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suIndustry, setSuIndustry] = useState("");
  const [suCountry, setSuCountry] = useState("India");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // ── Forgot password ──
  const [fpEmail, setFpEmail] = useState("");
  const [fpResetToken, setFpResetToken] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpStep, setFpStep] = useState<"email" | "otp" | "done">("email");
  const [fpError, setFpError] = useState("");
  const [fpSubmitting, setFpSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isSignedIn) setLocation("/dashboard");
  }, [isSignedIn, isLoading, setLocation]);

  useEffect(() => {
    if (step === 2 && plans.length === 0) {
      setPlansLoading(true);
      fetch(`${BASE_URL}/api/auth/plans`)
        .then((r) => r.json())
        .then((data: Plan[]) => {
          setPlans(data);
          if (data.length > 0 && !selectedPlanId) setSelectedPlanId(data[0].id);
        })
        .catch(() => {})
        .finally(() => setPlansLoading(false));
    }
  }, [step, plans.length, selectedPlanId]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d1257 50%, #0f172a 100%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Handlers (unchanged) ──────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json().catch(() => ({})) as { user?: unknown; mfaRequired?: boolean; mfaToken?: string; error?: string };

      if (data.mfaRequired && data.mfaToken) {
        sessionStorage.setItem("mfa_token", data.mfaToken);
        setLocation("/sign-in/mfa");
        return;
      }
      if (!res.ok) { setLoginError(data.error ?? "Sign in failed"); return; }
      window.location.href = `${BASE_URL}/dashboard`;
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleSignupStep1(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    if (!suName.trim() || !suEmail.trim() || !suPassword) { setSignupError("All fields are required"); return; }
    const pwChecks = [suPassword.length >= 8, /[A-Z]/.test(suPassword), /[a-z]/.test(suPassword), /\d/.test(suPassword), /[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(suPassword)];
    if (!pwChecks.every(Boolean)) { setSignupError("Password does not meet the requirements"); return; }
    setStep(1);
  }

  function handleSignupStep2(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    if (!suCompany.trim()) { setSignupError("Company name is required"); return; }
    setStep(2);
  }

  async function handleSignupStep3(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: suEmail.toLowerCase().trim(), password: suPassword, name: suName.trim(), companyName: suCompany.trim(), industry: suIndustry || undefined, country: suCountry || undefined, planId: selectedPlanId ?? undefined }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; registrationId?: number; error?: string };
      if (!res.ok) { setSignupError(data.error ?? "Registration failed"); return; }
      setRegistrationId(data.registrationId ?? null);
      setResendCountdown(60);
      setStep(3);
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return;
    setSignupError("");
    setSignupSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ registrationId, otp }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok) { setSignupError(data.error ?? "Verification failed"); return; }
      setStep(4);
      setTimeout(() => { setLocation("/dashboard"); window.location.reload(); }, 2500);
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (!registrationId || resendCountdown > 0) return;
    try {
      await fetch(`${BASE_URL}/api/auth/signup/resend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registrationId }) });
      setResendCountdown(60);
      setOtp("");
    } catch {}
  }

  async function handleForgotEmail(e: React.FormEvent) {
    e.preventDefault();
    setFpError("");
    setFpSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fpEmail }) });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; resetToken?: string };
      setFpResetToken(data.resetToken ?? "");
      setFpStep("otp");
    } catch {
      setFpError("Network error. Please try again.");
    } finally {
      setFpSubmitting(false);
    }
  }

  async function handleForgotReset(e: React.FormEvent) {
    e.preventDefault();
    setFpError("");
    if (fpOtp.length < 6) { setFpError("Enter the 6-digit code"); return; }
    const pwChecks = [fpNewPassword.length >= 8, /[A-Z]/.test(fpNewPassword), /[a-z]/.test(fpNewPassword), /\d/.test(fpNewPassword), /[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(fpNewPassword)];
    if (!pwChecks.every(Boolean)) { setFpError("Password does not meet the requirements"); return; }
    setFpSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resetToken: fpResetToken, otp: fpOtp, newPassword: fpNewPassword }) });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok) { setFpError(data.error ?? "Reset failed"); return; }
      setFpStep("done");
    } catch {
      setFpError("Network error. Please try again.");
    } finally {
      setFpSubmitting(false);
    }
  }

  function resetSignup() {
    setStep(0); setRegistrationId(null); setSignupError("");
    setSuName(""); setSuEmail(""); setSuPassword(""); setSuCompany("");
    setSuIndustry(""); setSuCountry("India"); setOtp(""); setSelectedPlanId(null);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setLoginError(""); setSignupError(""); setFpError("");
    setFpStep("email"); setFpEmail(""); setFpOtp(""); setFpNewPassword(""); setFpResetToken("");
    if (m === "signup") resetSignup();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isSignupWide = mode === "signup" && step === 2 && plans.length > 2;

  return (
    <div
      className="flex min-h-[100dvh]"
      style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d1257 50%, #0f172a 100%)" }}
    >
      {/* ── Left panel (hidden on mobile) ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[500px] flex-col justify-between p-10 xl:p-12 shrink-0 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <img
                src={`${BASE_URL}/logo.svg`}
                alt="MysticsHR"
                className="h-6 invert"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">MysticsHR</span>
          </div>

          {/* Tagline */}
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5">
            The precise<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #c084fc, #818cf8)" }}>
              cockpit for HR.
            </span>
          </h2>
          <p className="text-white/60 text-base leading-relaxed max-w-xs">
            Manage the complete employee lifecycle — from hire to retire — with one intelligent platform built for Indian businesses.
          </p>

          {/* Feature pills */}
          <div className="mt-10 space-y-3.5">
            {[
              { icon: Zap, label: "Up and running in minutes", sub: "No IT department needed" },
              { icon: Shield, label: "Enterprise-grade security", sub: "SOC-2 ready, data stays in India" },
              { icon: Sparkles, label: "Smart automation built in", sub: "Payroll, leave, appraisals on autopilot" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-white/40 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats grid */}
          <div className="mt-10 grid grid-cols-4 gap-3">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <Icon className="w-4 h-4 text-violet-300 mx-auto mb-1" />
                <p className="text-white font-bold text-sm">{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/25 text-xs">
          © 2026 Automystics Technologies Pvt. Ltd. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — auth forms ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
        <div className={cn("w-full transition-all duration-300", isSignupWide ? "max-w-lg" : "max-w-md")}>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 justify-center mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <img src={`${BASE_URL}/logo.svg`} alt="MysticsHR" className="h-5 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <span className="text-lg font-bold text-white">MysticsHR</span>
          </div>

          {/* ─────────── SIGN IN ─────────── */}
          {mode === "login" && (
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Card header */}
              <div className="px-8 pt-8 pb-6">
                <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                <p className="text-gray-500 text-sm mt-1">Sign in to your MysticsHR workspace</p>
              </div>

              <div className="px-8 pb-8 space-y-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <FormInput
                    id="email" type="email" icon={Mail}
                    label="Work email" placeholder="you@company.com"
                    value={loginEmail} onChange={setLoginEmail}
                    required autoComplete="email" disabled={loginSubmitting}
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">Password</Label>
                      <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-violet-600 hover:text-violet-700 hover:underline font-medium">
                        Forgot password?
                      </button>
                    </div>
                    <PasswordInput id="login-password" value={loginPassword} onChange={setLoginPassword} disabled={loginSubmitting} autoComplete="current-password" />
                  </div>

                  {loginError && <ErrorAlert message={loginError} />}

                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                    disabled={loginSubmitting}
                  >
                    {loginSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in…
                      </span>
                    ) : "Sign in"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                  <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">New to MysticsHR?</span></div>
                </div>

                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="w-full h-11 rounded-lg border-2 border-violet-200 text-violet-700 text-sm font-semibold hover:bg-violet-50 hover:border-violet-300 transition-all"
                >
                  Start your free trial →
                </button>
              </div>
            </div>
          )}

          {/* ─────────── SIGN UP (multi-step) ─────────── */}
          {mode === "signup" && step < 4 && (
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${((step + 1) / 4) * 100}%`, background: "linear-gradient(90deg, #7c3aed, #6d28d9)" }}
                />
              </div>

              <div className="px-8 pt-7 pb-8">
                {/* Back + steps */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    type="button"
                    onClick={() => step === 0 ? switchMode("login") : setStep(s => s - 1)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {step === 0 ? "Sign in" : "Back"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    {SIGNUP_STEPS.slice(0, 4).map((label, i) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-all",
                          i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-600 text-white ring-4 ring-violet-100" : "bg-gray-100 text-gray-400"
                        )}>
                          {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        {i < 3 && <div className={cn("w-5 h-0.5 rounded-full transition-colors", i < step ? "bg-violet-400" : "bg-gray-200")} />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step heading */}
                <div className="mb-6">
                  {step === 0 && <><h1 className="text-2xl font-bold text-gray-900">Create your account</h1><p className="text-gray-500 text-sm mt-1">Start your 14-day free trial — no card required.</p></>}
                  {step === 1 && <><h1 className="text-2xl font-bold text-gray-900">Your company</h1><p className="text-gray-500 text-sm mt-1">Tell us about your organisation.</p></>}
                  {step === 2 && <><h1 className="text-2xl font-bold text-gray-900">Choose a plan</h1><p className="text-gray-500 text-sm mt-1">Pick the plan that fits your team. You can change anytime.</p></>}
                  {step === 3 && <><h1 className="text-2xl font-bold text-gray-900">Verify your email</h1><p className="text-gray-500 text-sm mt-1">We sent a 6-digit code to <span className="font-semibold text-gray-800">{suEmail}</span>.</p></>}
                </div>

                {/* Step 1: Account */}
                {step === 0 && (
                  <form onSubmit={handleSignupStep1} className="space-y-4">
                    <FormInput id="su-name" icon={User} label="Full name" placeholder="Arjun Sharma" value={suName} onChange={setSuName} required autoComplete="name" />
                    <FormInput id="su-email" type="email" icon={Mail} label="Work email" placeholder="you@company.com" value={suEmail} onChange={setSuEmail} required autoComplete="email" />
                    <div className="space-y-1.5">
                      <Label htmlFor="su-password" className="text-sm font-medium text-gray-700">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10 pointer-events-none" />
                        <div className="pl-9">
                          <PasswordInput id="su-password" value={suPassword} onChange={setSuPassword} autoComplete="new-password" />
                        </div>
                      </div>
                      <PasswordStrength password={suPassword} />
                    </div>
                    {signupError && <ErrorAlert message={signupError} />}
                    <Button type="submit" className="w-full h-11 font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                      Continue
                    </Button>
                  </form>
                )}

                {/* Step 2: Company */}
                {step === 1 && (
                  <form onSubmit={handleSignupStep2} className="space-y-4">
                    <FormInput id="su-company" icon={Building2} label="Company name" placeholder="Acme Corp" value={suCompany} onChange={setSuCompany} required autoComplete="organization" />
                    <div className="space-y-1.5">
                      <Label htmlFor="su-industry" className="text-sm font-medium text-gray-700">
                        Industry <span className="text-gray-400 font-normal">(optional)</span>
                      </Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                          id="su-industry" value={suIndustry} onChange={(e) => setSuIndustry(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        >
                          <option value="">Select industry</option>
                          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="su-country" className="text-sm font-medium text-gray-700">Country</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <select
                          id="su-country" value={suCountry} onChange={(e) => setSuCountry(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                        >
                          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    {signupError && <ErrorAlert message={signupError} />}
                    <Button type="submit" className="w-full h-11 font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                      Continue
                    </Button>
                  </form>
                )}

                {/* Step 3: Plan */}
                {step === 2 && (
                  <form onSubmit={handleSignupStep3} className="space-y-3">
                    {plansLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
                      </div>
                    )}
                    {!plansLoading && plans.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-sm text-gray-500">No plans configured yet. You can select a plan after signing up.</p>
                        <Button type="submit" className="mt-4 w-full h-11 font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }} disabled={signupSubmitting}>
                          {signupSubmitting ? "Setting up…" : "Continue with free trial"}
                        </Button>
                      </div>
                    )}
                    {!plansLoading && plans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} selected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />
                    ))}
                    {signupError && <ErrorAlert message={signupError} />}
                    {!plansLoading && plans.length > 0 && (
                      <Button type="submit" className="w-full h-11 font-semibold mt-1" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }} disabled={signupSubmitting}>
                        {signupSubmitting ? (
                          <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting up…</span>
                        ) : "Start free trial"}
                      </Button>
                    )}
                  </form>
                )}

                {/* Step 4: Verify OTP */}
                {step === 3 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                      <Mail className="w-6 h-6 text-violet-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Check your inbox at <span className="font-semibold text-gray-800">{suEmail}</span></p>
                      <p className="text-xs text-gray-400 mt-0.5">The code expires in 10 minutes</p>
                    </div>
                    <OtpInput value={otp} onChange={setOtp} disabled={signupSubmitting} />
                    {signupError && <ErrorAlert message={signupError} />}
                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                      disabled={signupSubmitting || otp.length < 6}
                    >
                      {signupSubmitting ? (
                        <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span>
                      ) : "Verify & activate"}
                    </Button>
                    <div className="text-center">
                      <button type="button" onClick={handleResendOtp} disabled={resendCountdown > 0}
                        className="text-sm text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed transition-colors">
                        {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Didn't receive it? Resend code"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ─────────── SIGNUP SUCCESS ─────────── */}
          {mode === "signup" && step === 4 && (
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
              <p className="text-gray-500 text-sm">Your MysticsHR workspace is being set up. Redirecting you in a moment…</p>
              <div className="mt-8 w-7 h-7 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* ─────────── FORGOT PASSWORD ─────────── */}
          {mode === "forgot" && (
            <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
              {fpStep !== "done" && (
                <div className="h-1 bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: fpStep === "email" ? "50%" : "100%", background: "linear-gradient(90deg, #7c3aed, #6d28d9)" }} />
                </div>
              )}

              <div className="px-8 pt-7 pb-8">
                {fpStep !== "done" && (
                  <button type="button" onClick={() => switchMode("login")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                  </button>
                )}

                {fpStep === "email" && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
                      <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send a reset code.</p>
                    </div>
                    <form onSubmit={handleForgotEmail} className="space-y-4">
                      <FormInput id="fp-email" type="email" icon={Mail} label="Email address" placeholder="you@company.com" value={fpEmail} onChange={setFpEmail} required autoComplete="email" disabled={fpSubmitting} />
                      {fpError && <ErrorAlert message={fpError} />}
                      <Button type="submit" className="w-full h-11 font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }} disabled={fpSubmitting}>
                        {fpSubmitting ? (
                          <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</span>
                        ) : "Send reset code"}
                      </Button>
                    </form>
                  </>
                )}

                {fpStep === "otp" && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
                      <p className="text-gray-500 text-sm mt-1">
                        Enter the 6-digit code sent to <span className="font-semibold text-gray-800">{fpEmail}</span>, then set your new password.
                      </p>
                    </div>
                    <form onSubmit={handleForgotReset} className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Verification code</Label>
                        <OtpInput value={fpOtp} onChange={setFpOtp} disabled={fpSubmitting} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="fp-password" className="text-sm font-medium text-gray-700">New password</Label>
                        <PasswordInput id="fp-password" value={fpNewPassword} onChange={setFpNewPassword} disabled={fpSubmitting} autoComplete="new-password" />
                        <PasswordStrength password={fpNewPassword} />
                      </div>
                      {fpError && <ErrorAlert message={fpError} />}
                      <Button type="submit" className="w-full h-11 font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }} disabled={fpSubmitting || fpOtp.length < 6}>
                        {fpSubmitting ? (
                          <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting…</span>
                        ) : "Reset password"}
                      </Button>
                    </form>
                  </>
                )}

                {fpStep === "done" && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Password reset!</h1>
                    <p className="text-gray-500 text-sm mb-6">Your password has been updated. You can now sign in.</p>
                    <Button
                      className="h-11 px-8 font-semibold"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                      onClick={() => switchMode("login")}
                    >
                      Sign in with new password
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom trust text */}
          {mode === "login" && (
            <p className="text-center text-white/35 text-xs mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
