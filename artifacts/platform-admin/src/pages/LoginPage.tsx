import { useState, FormEvent, useRef, KeyboardEvent } from "react";
import { useLocation } from "wouter";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertCircle, Mail, ArrowLeft } from "lucide-react";

export function LoginPage() {
  const { requestOtp, verifyOtp } = usePlatformAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await requestOtp(email.trim());
    setLoading(false);
    if (result.ok) {
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      startResendCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } else {
      setError(result.error ?? "Failed to send code");
    }
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────────────────
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;
    setError(null);
    setLoading(true);
    const result = await verifyOtp(email.trim(), code);
    setLoading(false);
    if (result.ok) {
      navigate("/dashboard");
    } else {
      setError(result.error ?? "Verification failed");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setError(null);
    setLoading(true);
    const result = await requestOtp(email.trim());
    setLoading(false);
    if (result.ok) {
      setOtp(["", "", "", "", "", ""]);
      startResendCountdown();
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } else {
      setError(result.error ?? "Failed to resend code");
    }
  }

  function startResendCountdown() {
    setResendCountdown(60);
    const iv = setInterval(() => {
      setResendCountdown((n) => {
        if (n <= 1) { clearInterval(iv); return 0; }
        return n - 1;
      });
    }, 1000);
  }

  // ── OTP digit input helpers ─────────────────────────────────────────────────
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  const otpCode = otp.join("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Platform Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "email" ? "Sign in with your whitelisted email" : `Code sent to ${email}`}
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg">
          {step === "email" ? (
            <form onSubmit={(e) => void handleRequestOtp(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-9 bg-input border-border"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-2" disabled={loading || !email.trim()}>
                {loading ? "Sending code…" : "Send verification code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-5">
              {/* Back */}
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); setOtp(["", "", "", "", "", ""]); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change email
              </button>

              <div className="space-y-3">
                <Label className="text-sm font-medium">6-digit verification code</Label>
                {/* OTP boxes */}
                <div className="flex gap-2 justify-between">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-lg font-semibold rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Check your inbox — the code expires in 10 minutes.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || otpCode.length < 6}>
                {loading ? "Verifying…" : "Verify & sign in"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resendCountdown > 0 || loading}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Access is restricted to authorised platform administrators only.
        </p>
      </div>
    </div>
  );
}
