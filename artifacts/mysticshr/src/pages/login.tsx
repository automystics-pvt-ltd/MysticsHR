import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Eye, EyeOff, ArrowLeft, Building2, Mail, Lock, User, Globe, Briefcase, Sparkles, Shield, Zap } from "lucide-react";
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
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
  return (
    <div className="space-y-2 mt-1.5">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i < score ? color : "bg-muted")} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={cn("text-xs", c.ok ? "text-green-600" : "text-muted-foreground")}>
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
    <div className="flex gap-2 justify-center">
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
            "w-11 h-12 text-center text-xl font-bold border rounded-lg bg-background outline-none transition-colors",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            disabled && "opacity-50"
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
        "relative w-full text-left rounded-xl border-2 p-4 transition-all hover:border-primary/60",
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30"
      )}
    >
      {isPopular && (
        <span className="absolute -top-2.5 left-4 text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
          Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{plan.name}</span>
            {selected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
          </div>
          {plan.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{plan.description}</p>
          )}
          <div className="flex flex-wrap gap-x-3 mt-2 text-xs text-muted-foreground">
            {plan.maxEmployees && <span>Up to {plan.maxEmployees} employees</span>}
            {plan.maxUsers && <span>{plan.maxUsers} users</span>}
          </div>
        </div>
        <span className="shrink-0 text-base font-bold text-foreground">{price}</span>
      </div>
    </button>
  );
}

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
  // Step 1: account
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  // Step 2: company
  const [suCompany, setSuCompany] = useState("");
  const [suIndustry, setSuIndustry] = useState("");
  const [suCountry, setSuCountry] = useState("India");
  // Step 3: plan
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  // Step 4: OTP
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Login handler ──
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

      if (!res.ok) {
        setLoginError(data.error ?? "Sign in failed");
        return;
      }

      // Cookie is already set — reload to update auth state
      window.location.href = `${BASE_URL}/dashboard`;
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginSubmitting(false);
    }
  }

  // ── Signup: Step 1 → 2 (account details) ──
  async function handleSignupStep1(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    if (!suName.trim() || !suEmail.trim() || !suPassword) {
      setSignupError("All fields are required");
      return;
    }
    const pwChecks = [
      suPassword.length >= 8,
      /[A-Z]/.test(suPassword),
      /[a-z]/.test(suPassword),
      /\d/.test(suPassword),
      /[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(suPassword),
    ];
    if (!pwChecks.every(Boolean)) {
      setSignupError("Password does not meet the requirements");
      return;
    }
    setStep(1);
  }

  // ── Signup: Step 2 → 3 (company) ──
  function handleSignupStep2(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    if (!suCompany.trim()) {
      setSignupError("Company name is required");
      return;
    }
    setStep(2);
  }

  // ── Signup: Step 3 → 4 (plan → call API → send OTP) ──
  async function handleSignupStep3(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    setSignupSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: suEmail.toLowerCase().trim(),
          password: suPassword,
          name: suName.trim(),
          companyName: suCompany.trim(),
          industry: suIndustry || undefined,
          country: suCountry || undefined,
          planId: selectedPlanId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; registrationId?: number; error?: string };
      if (!res.ok) {
        setSignupError(data.error ?? "Registration failed");
        return;
      }
      setRegistrationId(data.registrationId ?? null);
      setResendCountdown(60);
      setStep(3);
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupSubmitting(false);
    }
  }

  // ── Signup: Step 4 → verify OTP ──
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
      if (!res.ok) {
        setSignupError(data.error ?? "Verification failed");
        return;
      }
      setStep(4);
      setTimeout(() => {
        setLocation("/dashboard");
        window.location.reload();
      }, 2500);
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (!registrationId || resendCountdown > 0) return;
    try {
      await fetch(`${BASE_URL}/api/auth/signup/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });
      setResendCountdown(60);
      setOtp("");
    } catch {}
  }

  // ── Forgot password ──
  async function handleForgotEmail(e: React.FormEvent) {
    e.preventDefault();
    setFpError("");
    setFpSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
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
    const pwChecks = [
      fpNewPassword.length >= 8,
      /[A-Z]/.test(fpNewPassword),
      /[a-z]/.test(fpNewPassword),
      /\d/.test(fpNewPassword),
      /[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(fpNewPassword),
    ];
    if (!pwChecks.every(Boolean)) { setFpError("Password does not meet the requirements"); return; }
    setFpSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken: fpResetToken, otp: fpOtp, newPassword: fpNewPassword }),
      });
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

  return (
    <div className="flex min-h-[100dvh] bg-muted/20">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between bg-sidebar p-10 shrink-0" style={{ background: "hsl(252 56% 12%)" }}>
        <div>
          <div className="flex items-center gap-2 mb-12">
            <img src={`${BASE_URL}/logo.svg`} alt="MysticsHR" className="h-8 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-lg font-bold text-white">MysticsHR</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            The precise cockpit for HR operations.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Manage the complete employee lifecycle — from hire to retire — with one intelligent platform.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: Zap, label: "Up and running in minutes" },
              { icon: Shield, label: "Enterprise-grade security" },
              { icon: Sparkles, label: "Smart automation built in" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs">© 2026 MysticsHR. All rights reserved.</p>
      </div>

      {/* Right panel — auth forms */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <img src={`${BASE_URL}/logo.svg`} alt="MysticsHR" className="h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="text-lg font-bold text-foreground">MysticsHR</span>
          </div>

          {/* ── SIGN IN ── */}
          {mode === "login" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
                <p className="text-muted-foreground text-sm mt-1">Sign in to your MysticsHR account</p>
              </div>
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="email" type="email" autoComplete="email" placeholder="you@company.com"
                          value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                          required disabled={loginSubmitting} className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button type="button" onClick={() => switchMode("forgot")}
                          className="text-xs text-primary hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <div className="pl-9">
                          <PasswordInput id="password" value={loginPassword} onChange={setLoginPassword}
                            disabled={loginSubmitting} autoComplete="current-password" />
                        </div>
                      </div>
                    </div>
                    {loginError && <p className="text-sm text-destructive font-medium">{loginError}</p>}
                    <Button type="submit" className="w-full" disabled={loginSubmitting}>
                      {loginSubmitting ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                  <div className="mt-6 pt-5 border-t text-center">
                    <p className="text-sm text-muted-foreground">
                      New to MysticsHR?{" "}
                      <button type="button" onClick={() => switchMode("signup")} className="text-primary font-medium hover:underline">
                        Start free trial
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── SIGN UP (multi-step) ── */}
          {mode === "signup" && step < 4 && (
            <>
              <div className="mb-6">
                <button type="button" onClick={() => step === 0 ? switchMode("login") : setStep(s => s - 1)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Back to sign in" : "Back"}
                </button>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-5">
                  {SIGNUP_STEPS.slice(0, 4).map((label, i) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center shrink-0",
                        i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={cn("text-xs hidden sm:block", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {label}
                      </span>
                      {i < 3 && <div className="flex-1 h-px bg-border min-w-[16px]" />}
                    </div>
                  ))}
                </div>
                {step === 0 && <><h1 className="text-xl font-bold">Create your account</h1><p className="text-sm text-muted-foreground mt-1">Start your 14-day free trial — no card required.</p></>}
                {step === 1 && <><h1 className="text-xl font-bold">Your company</h1><p className="text-sm text-muted-foreground mt-1">Tell us about your organisation.</p></>}
                {step === 2 && <><h1 className="text-xl font-bold">Choose a plan</h1><p className="text-sm text-muted-foreground mt-1">You can change this anytime.</p></>}
                {step === 3 && <><h1 className="text-xl font-bold">Verify your email</h1><p className="text-sm text-muted-foreground mt-1">We sent a 6-digit code to <span className="font-medium text-foreground">{suEmail}</span>.</p></>}
              </div>

              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  {/* Step 1: Account */}
                  {step === 0 && (
                    <form onSubmit={handleSignupStep1} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="su-name">Full name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="su-name" type="text" autoComplete="name" placeholder="Arjun Sharma"
                            value={suName} onChange={(e) => setSuName(e.target.value)} required className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="su-email">Work email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="su-email" type="email" autoComplete="email" placeholder="you@company.com"
                            value={suEmail} onChange={(e) => setSuEmail(e.target.value)} required className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="su-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <div className="pl-9">
                            <PasswordInput id="su-password" value={suPassword} onChange={setSuPassword} autoComplete="new-password" />
                          </div>
                        </div>
                        <PasswordStrength password={suPassword} />
                      </div>
                      {signupError && <p className="text-sm text-destructive font-medium">{signupError}</p>}
                      <Button type="submit" className="w-full">Continue</Button>
                    </form>
                  )}

                  {/* Step 2: Company */}
                  {step === 1 && (
                    <form onSubmit={handleSignupStep2} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="su-company">Company name</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input id="su-company" type="text" placeholder="Acme Corp" autoComplete="organization"
                            value={suCompany} onChange={(e) => setSuCompany(e.target.value)} required className="pl-9" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="su-industry">Industry <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                          <select id="su-industry" value={suIndustry} onChange={(e) => setSuIndustry(e.target.value)}
                            className="w-full pl-9 pr-3 h-9 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                            <option value="">Select industry</option>
                            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="su-country">Country</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                          <select id="su-country" value={suCountry} onChange={(e) => setSuCountry(e.target.value)}
                            className="w-full pl-9 pr-3 h-9 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      {signupError && <p className="text-sm text-destructive font-medium">{signupError}</p>}
                      <Button type="submit" className="w-full">Continue</Button>
                    </form>
                  )}

                  {/* Step 3: Plan */}
                  {step === 2 && (
                    <form onSubmit={handleSignupStep3} className="space-y-3">
                      {plansLoading && (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
                        </div>
                      )}
                      {!plansLoading && plans.length === 0 && (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground">No plans configured yet. You can select a plan later.</p>
                          {/* type="submit" so the form's onSubmit (handleSignupStep3) is called —
                              the previous type="button" with setStep(3) skipped the API call
                              entirely, leaving registrationId=null and no OTP ever sent. */}
                          <Button type="submit" className="mt-4 w-full" disabled={signupSubmitting}>
                            {signupSubmitting ? "Setting up…" : "Continue with free trial"}
                          </Button>
                        </div>
                      )}
                      {!plansLoading && plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} selected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />
                      ))}
                      {signupError && <p className="text-sm text-destructive font-medium">{signupError}</p>}
                      {!plansLoading && plans.length > 0 && (
                        <Button type="submit" className="w-full mt-2" disabled={signupSubmitting}>
                          {signupSubmitting ? "Setting up…" : "Start free trial"}
                        </Button>
                      )}
                    </form>
                  )}

                  {/* Step 4: Verify OTP */}
                  {step === 3 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                      <OtpInput value={otp} onChange={setOtp} disabled={signupSubmitting} />
                      {signupError && <p className="text-sm text-destructive font-medium text-center">{signupError}</p>}
                      <Button type="submit" className="w-full" disabled={signupSubmitting || otp.length < 6}>
                        {signupSubmitting ? "Verifying…" : "Verify & activate"}
                      </Button>
                      <div className="text-center">
                        <button type="button" onClick={handleResendOtp} disabled={resendCountdown > 0}
                          className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">
                          {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
                        </button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ── SIGNUP SUCCESS ── */}
          {mode === "signup" && step === 4 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">You're all set!</h2>
              <p className="text-muted-foreground text-sm">Your MysticsHR workspace is being set up. Redirecting you in a moment…</p>
              <div className="mt-6 animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === "forgot" && (
            <>
              <div className="mb-6">
                <button type="button" onClick={() => switchMode("login")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>
                {fpStep === "email" && <><h1 className="text-xl font-bold">Forgot your password?</h1><p className="text-sm text-muted-foreground mt-1">Enter your email and we'll send you a reset code.</p></>}
                {fpStep === "otp" && <><h1 className="text-xl font-bold">Check your email</h1><p className="text-sm text-muted-foreground mt-1">Enter the 6-digit code sent to <span className="font-medium text-foreground">{fpEmail}</span> and your new password.</p></>}
                {fpStep === "done" && <><h1 className="text-xl font-bold">Password reset</h1><p className="text-sm text-muted-foreground mt-1">Your password has been updated. You can now sign in.</p></>}
              </div>

              {fpStep === "done" ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                  </div>
                  <Button className="mt-4" onClick={() => switchMode("login")}>Sign in with new password</Button>
                </div>
              ) : (
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    {fpStep === "email" && (
                      <form onSubmit={handleForgotEmail} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="fp-email">Email address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="fp-email" type="email" autoComplete="email" placeholder="you@company.com"
                              value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} required disabled={fpSubmitting} className="pl-9" />
                          </div>
                        </div>
                        {fpError && <p className="text-sm text-destructive font-medium">{fpError}</p>}
                        <Button type="submit" className="w-full" disabled={fpSubmitting}>
                          {fpSubmitting ? "Sending…" : "Send reset code"}
                        </Button>
                      </form>
                    )}

                    {fpStep === "otp" && (
                      <form onSubmit={handleForgotReset} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Verification code</Label>
                          <OtpInput value={fpOtp} onChange={setFpOtp} disabled={fpSubmitting} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="fp-password">New password</Label>
                          <PasswordInput id="fp-password" value={fpNewPassword} onChange={setFpNewPassword}
                            disabled={fpSubmitting} autoComplete="new-password" />
                          <PasswordStrength password={fpNewPassword} />
                        </div>
                        {fpError && <p className="text-sm text-destructive font-medium">{fpError}</p>}
                        <Button type="submit" className="w-full" disabled={fpSubmitting || fpOtp.length < 6}>
                          {fpSubmitting ? "Resetting…" : "Reset password"}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
