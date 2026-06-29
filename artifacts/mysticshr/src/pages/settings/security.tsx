import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Shield, Key, Smartphone, Eye, EyeOff, CheckCircle2, Copy, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

function PasswordInput({ id, value, onChange, disabled, placeholder, autoComplete }: {
  id: string; value: string; onChange: (v: string) => void;
  disabled?: boolean; placeholder?: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete}
        placeholder={placeholder ?? "••••••••"} value={value}
        onChange={(e) => onChange(e.target.value)} disabled={disabled} className="pr-10" />
      <button type="button" tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((s) => !s)}>
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
    <div className="space-y-1.5 mt-1">
      <div className="flex gap-1">{checks.map((_, i) => <div key={i} className={cn("h-1 flex-1 rounded-full", i < score ? color : "bg-muted")} />)}</div>
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

function OtpInput({ value, onChange, disabled, prefix }: { value: string; onChange: (v: string) => void; disabled?: boolean; prefix?: string }) {
  const id = prefix ?? "otp";
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  return (
    <div className="flex gap-2">
      {digits.map((d, i) => (
        <input key={i} type="text" inputMode="numeric" maxLength={1} disabled={disabled} value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            const next = value.split("").concat(Array(6).fill("")).slice(0, 6);
            next[i] = v.slice(-1);
            onChange(next.join("").replace(/\s/g, ""));
            if (v && i < 5) document.getElementById(`${id}-${i + 1}`)?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !value[i] && i > 0) document.getElementById(`${id}-${i - 1}`)?.focus(); }}
          onPaste={(e) => { const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (p) { onChange(p); e.preventDefault(); } }}
          id={`${id}-${i}`}
          className={cn("w-10 h-11 text-center text-lg font-bold border rounded-lg bg-background outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20", disabled && "opacity-50")}
        />
      ))}
    </div>
  );
}

// ─── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordCard() {
  const { toast } = useToast();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw !== confirmPw) { setError("New passwords do not match"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "Password change failed"); return; }
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Key className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription className="text-xs">Change your account password</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current password</Label>
            <PasswordInput id="current-pw" value={currentPw} onChange={setCurrentPw}
              disabled={submitting} autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <PasswordInput id="new-pw" value={newPw} onChange={setNewPw}
              disabled={submitting} autoComplete="new-password" />
            <PasswordStrength password={newPw} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <PasswordInput id="confirm-pw" value={confirmPw} onChange={setConfirmPw}
              disabled={submitting} autoComplete="new-password"
              placeholder={newPw ? (confirmPw === newPw ? "✓ Matches" : "Must match new password") : "••••••••"} />
          </div>
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          <Button type="submit" disabled={submitting || !currentPw || !newPw || !confirmPw}>
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── MFA Card ─────────────────────────────────────────────────────────────────

function MfaCard() {
  const { toast } = useToast();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  // Setup flow
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "backup">("qr");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Disable flow
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [disableError, setDisableError] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/api/auth/mfa/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { mfaEnabled?: boolean; backupCodesRemaining?: number }) => {
        setMfaEnabled(!!d.mfaEnabled);
        setBackupCodesRemaining(d.backupCodesRemaining ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function startSetup() {
    setSetupLoading(true);
    setSetupStep("qr");
    setVerifyCode(""); setVerifyError(""); setBackupCodes([]);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mfa/setup`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json().catch(() => ({})) as { qrDataUrl?: string; secret?: string };
      if (res.ok) {
        setQrDataUrl(data.qrDataUrl ?? "");
        setSecret(data.secret ?? "");
        setSetupOpen(true);
      }
    } catch {}
    setSetupLoading(false);
  }

  async function handleVerifySetup(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError("");
    setSetupLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mfa/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; backupCodes?: string[]; error?: string };
      if (!res.ok) { setVerifyError(data.error ?? "Verification failed"); return; }
      setBackupCodes(data.backupCodes ?? []);
      setMfaEnabled(true);
      setSetupStep("backup");
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableError("");
    setDisableLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/mfa`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: disablePw }),
      });
      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!res.ok) { setDisableError(data.error ?? "Failed to disable MFA"); return; }
      setMfaEnabled(false);
      setDisableOpen(false);
      setDisablePw("");
      toast({ title: "MFA disabled", description: "Two-factor authentication has been turned off." });
    } catch {
      setDisableError("Network error. Please try again.");
    } finally {
      setDisableLoading(false);
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", mfaEnabled ? "bg-green-50" : "bg-muted")}>
                <Smartphone className={cn("w-4 h-4", mfaEnabled ? "text-green-600" : "text-muted-foreground")} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Two-factor authentication</CardTitle>
                  {loading ? null : (
                    <Badge variant={mfaEnabled ? "default" : "secondary"} className={cn("text-xs", mfaEnabled && "bg-green-100 text-green-700 hover:bg-green-100")}>
                      {mfaEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {mfaEnabled
                    ? `Protect your account with a TOTP authenticator app. ${backupCodesRemaining} backup code${backupCodesRemaining !== 1 ? "s" : ""} remaining.`
                    : "Add an extra layer of security to your account."}
                </CardDescription>
              </div>
            </div>
            {!loading && (
              mfaEnabled
                ? <Button variant="outline" size="sm" onClick={() => setDisableOpen(true)}>Disable</Button>
                : <Button size="sm" onClick={startSetup} disabled={setupLoading}>{setupLoading ? "Loading…" : "Enable"}</Button>
            )}
          </div>
        </CardHeader>
        {mfaEnabled && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 text-green-600 shrink-0" />
              <span>Your account is protected with TOTP two-factor authentication.</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupOpen} onOpenChange={(o) => { if (!o) setSetupOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {setupStep === "qr" && "Set up authenticator"}
              {setupStep === "verify" && "Verify your code"}
              {setupStep === "backup" && "Save backup codes"}
            </DialogTitle>
            <DialogDescription>
              {setupStep === "qr" && "Scan this QR code with Google Authenticator, Authy, or any TOTP app."}
              {setupStep === "verify" && "Enter the 6-digit code from your authenticator app to confirm it's working."}
              {setupStep === "backup" && "Store these codes somewhere safe. Each can be used once if you lose access to your authenticator."}
            </DialogDescription>
          </DialogHeader>

          {setupStep === "qr" && (
            <div className="space-y-4">
              {qrDataUrl && (
                <div className="flex justify-center">
                  <img src={qrDataUrl} alt="MFA QR Code" className="w-48 h-48 rounded-lg border" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">Can't scan? Enter this code manually:</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <code className="text-xs font-mono flex-1 break-all">{secret}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(secret).catch(() => {})}
                    className="text-muted-foreground hover:text-foreground shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={() => setSetupStep("verify")}>I've scanned it — continue</Button>
              </DialogFooter>
            </div>
          )}

          {setupStep === "verify" && (
            <form onSubmit={handleVerifySetup} className="space-y-4">
              <OtpInput value={verifyCode} onChange={setVerifyCode} disabled={setupLoading} prefix="setup" />
              {verifyError && <p className="text-sm text-destructive font-medium">{verifyError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSetupStep("qr")}>Back</Button>
                <Button type="submit" disabled={setupLoading || verifyCode.length < 6}>
                  {setupLoading ? "Verifying…" : "Verify & enable"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {setupStep === "backup" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i} className="bg-muted rounded-md px-3 py-1.5 text-xs font-mono text-center tracking-wider">
                    {code}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={copyBackupCodes}>
                {copied ? <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Copied!</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy all codes</>}
              </Button>
              <div className="flex items-start gap-2 bg-amber-50 text-amber-800 rounded-lg px-3 py-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Store these in a safe place. You won't be able to see them again.</span>
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={() => { setSetupOpen(false); setBackupCodesRemaining(backupCodes.length); }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Confirm Dialog */}
      <AlertDialog open={disableOpen} onOpenChange={setDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra security layer from your account. Enter your password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleDisable} className="space-y-3 mt-2">
            <PasswordInput id="disable-pw" value={disablePw} onChange={setDisablePw}
              disabled={disableLoading} placeholder="Your current password" autoComplete="current-password" />
            {disableError && <p className="text-sm text-destructive font-medium">{disableError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setDisablePw(""); setDisableError(""); }}>Cancel</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={disableLoading || !disablePw}>
                {disableLoading ? "Disabling…" : "Disable MFA"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Manage your password and account security settings."
        badge={<Badge variant="secondary">Personal</Badge>}
      />
      <div className="max-w-2xl space-y-6">
        <ChangePasswordCard />
        <MfaCard />
      </div>
    </div>
  );
}
