import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

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
              const el = document.getElementById(`mfa-${i + 1}`);
              el?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              const el = document.getElementById(`mfa-${i - 1}`);
              el?.focus();
            }
          }}
          onPaste={(e) => {
            const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (paste) { onChange(paste); e.preventDefault(); }
          }}
          id={`mfa-${i}`}
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

export default function MfaVerifyPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");

  const mfaToken = sessionStorage.getItem("mfa_token") ?? "";

  if (!mfaToken) {
    setLocation("/sign-in");
    return null;
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const codeToSend = useBackup ? backupCode.trim() : code;
    if (!useBackup && codeToSend.length < 6) return;
    if (useBackup && !codeToSend) return;

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mfaToken, code: codeToSend }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      sessionStorage.removeItem("mfa_token");
      setLocation("/dashboard");
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Two-factor verification</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {useBackup
              ? "Enter one of your backup codes to continue."
              : "Open your authenticator app and enter the 6-digit code."}
          </p>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleVerify} className="space-y-5">
              {useBackup ? (
                <div className="space-y-1.5">
                  <label htmlFor="backup" className="text-sm font-medium">Backup code</label>
                  <input
                    id="backup"
                    type="text"
                    placeholder="xxxxxxxx"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    disabled={submitting}
                    className="w-full h-10 px-3 text-sm border rounded-md bg-background text-foreground font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>
              ) : (
                <OtpInput value={code} onChange={setCode} disabled={submitting} />
              )}

              {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}

              <Button type="submit" className="w-full"
                disabled={submitting || (!useBackup && code.length < 6) || (useBackup && !backupCode.trim())}>
                {submitting ? "Verifying…" : "Verify"}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t space-y-2 text-center">
              <button type="button" onClick={() => { setUseBackup((u) => !u); setCode(""); setBackupCode(""); setError(""); }}
                className="text-sm text-muted-foreground hover:text-foreground block w-full">
                {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
              </button>
              <button type="button" onClick={() => { sessionStorage.removeItem("mfa_token"); setLocation("/sign-in"); }}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 w-full">
                <ArrowLeft className="w-3.5 h-3.5" /> Sign in with a different account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
