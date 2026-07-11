import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Eye, EyeOff, Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function PasswordInput({
  id, value, onChange, disabled, placeholder, autoComplete,
}: {
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
        className="h-11 pr-10 bg-white border-gray-200 focus:border-violet-500 focus:ring-violet-500/20"
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
  const color =
    score <= 2 ? "bg-red-500" : score <= 3 ? "bg-amber-500" : score === 4 ? "bg-blue-500" : "bg-green-500";
  const label = score <= 2 ? "Weak" : score <= 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1 items-center">
        {checks.map((_, i) => (
          <div
            key={i}
            className={cn("h-1.5 flex-1 rounded-full transition-all duration-300", i < score ? color : "bg-gray-100")}
          />
        ))}
        <span
          className={cn(
            "text-xs font-medium ml-2 w-12 shrink-0",
            score <= 2 ? "text-red-500" : score <= 3 ? "text-amber-500" : score === 4 ? "text-blue-500" : "text-green-500"
          )}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={cn("text-xs transition-colors", c.ok ? "text-green-600 font-medium" : "text-gray-400")}
          >
            {c.ok ? "✓" : "·"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type PageState = "loading" | "ready" | "invalid" | "expired" | "deactivated" | "submitting" | "done";

export default function SetupPasswordPage() {
  const [, setLocation] = useLocation();

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [state, setState] = useState<PageState>("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [checkError, setCheckError] = useState("");

  // Validate the token on mount
  useEffect(() => {
    if (!token) {
      setCheckError("No setup token found in the link. Please check the URL or ask your administrator to resend the invite.");
      setState("invalid");
      return;
    }

    fetch(`${BASE_URL}/api/auth/setup-check?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({})) as { email?: string; name?: string; error?: string };
        if (res.status === 410) {
          setCheckError(data.error ?? "This setup link has expired.");
          setState("expired");
        } else if (res.status === 403) {
          setCheckError(data.error ?? "Account is deactivated. Contact your HR administrator.");
          setState("deactivated");
        } else if (!res.ok) {
          setCheckError(data.error ?? "Invalid setup link.");
          setState("invalid");
        } else {
          setEmail(data.email ?? "");
          setName(data.name ?? "");
          setState("ready");
        }
      })
      .catch(() => {
        setCheckError("Could not reach the server. Please try again.");
        setState("invalid");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const pwChecks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(password),
    ];
    if (!pwChecks.every(Boolean)) {
      setError("Password does not meet all the requirements.");
      return;
    }

    setState("submitting");
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({})) as { user?: unknown; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to set password. Please try again.");
        setState("ready");
        return;
      }
      setState("done");
      setTimeout(() => {
        window.location.href = `${BASE_URL}/dashboard`;
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
      setState("ready");
    }
  }

  const isSubmitting = state === "submitting";

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d1257 50%, #0f172a 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <img
              src={`${BASE_URL}/logo.svg`}
              alt="MysticsHR"
              className="h-5 invert"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <span className="text-lg font-bold text-white">MysticsHR</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Loading */}
          {state === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
              <p className="text-gray-500 text-sm">Verifying your invite link…</p>
            </div>
          )}

          {/* Invalid / Expired / Deactivated */}
          {(state === "invalid" || state === "expired" || state === "deactivated") && (
            <div className="flex flex-col items-center text-center py-12 px-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {state === "expired" ? "Link Expired" : state === "deactivated" ? "Account Deactivated" : "Invalid Link"}
                </h1>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{checkError}</p>
              </div>
              <button
                type="button"
                onClick={() => setLocation("/sign-in")}
                className="mt-2 text-sm text-violet-600 hover:text-violet-700 hover:underline font-medium"
              >
                Go to sign in
              </button>
            </div>
          )}

          {/* Success */}
          {state === "done" && (
            <div className="flex flex-col items-center text-center py-12 px-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h1>
                <p className="text-gray-500 text-sm">Your password has been created. Taking you to your dashboard…</p>
              </div>
              <div className="w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mt-2" />
            </div>
          )}

          {/* Form */}
          {(state === "ready" || state === "submitting") && (
            <>
              {/* Top accent bar */}
              <div className="h-1.5" style={{ background: "linear-gradient(90deg, #7c3aed, #6d28d9)" }} />

              <div className="px-8 pt-7 pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Set your password</h1>
                    <p className="text-gray-500 text-sm">
                      {name ? `Welcome, ${name.split(" ")[0]}!` : "Welcome!"} You're joining as{" "}
                      <span className="font-medium text-gray-700">{email}</span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      New password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                      <div className="pl-9">
                        <PasswordInput
                          id="password"
                          value={password}
                          onChange={setPassword}
                          disabled={isSubmitting}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                      <div className="pl-9">
                        <PasswordInput
                          id="confirm"
                          value={confirm}
                          onChange={setConfirm}
                          disabled={isSubmitting}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                    {confirm && password !== confirm && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                    {confirm && password === confirm && confirm.length > 0 && (
                      <p className="text-xs text-green-600 font-medium">✓ Passwords match</p>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm mt-1"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                    disabled={isSubmitting || password.length < 8 || password !== confirm}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up your account…
                      </span>
                    ) : (
                      "Create password & sign in"
                    )}
                  </Button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-5">
                  Already have a password?{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/sign-in")}
                    className="text-violet-600 hover:underline font-medium"
                  >
                    Sign in instead
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          © 2026 Automystics Technologies Pvt. Ltd.
        </p>
      </div>
    </div>
  );
}
