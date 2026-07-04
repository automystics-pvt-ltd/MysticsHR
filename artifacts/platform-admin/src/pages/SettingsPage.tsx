import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, EmailSettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Key, CheckCircle2, AlertCircle, Send, Eye, EyeOff, Info,
} from "lucide-react";

export function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<EmailSettings>({
    queryKey: ["platform-email-settings"],
    queryFn: () => api.getEmailSettings(),
  });

  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [fromAddress, setFromAddress] = useState("");
  const [fromDirty, setFromDirty] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const initialFrom = data?.fromAddress ?? "";

  const saveMutation = useMutation({
    mutationFn: (payload: { resendApiKey?: string; fromAddress?: string }) =>
      api.updateEmailSettings(payload),
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Email configuration updated." });
      setNewKey("");
      setFromDirty(false);
      void qc.invalidateQueries({ queryKey: ["platform-email-settings"] });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: (to: string) => api.testEmailSettings(to),
    onSuccess: () => setTestResult({ ok: true, msg: `Test email sent to ${testEmail}` }),
    onError: (e: Error) => setTestResult({ ok: false, msg: e.message }),
  });

  function handleSave() {
    const payload: { resendApiKey?: string; fromAddress?: string } = {};
    if (newKey.trim()) payload.resendApiKey = newKey.trim();
    if (fromDirty) payload.fromAddress = fromAddress;
    if (!payload.resendApiKey && !payload.fromAddress) {
      toast({ title: "Nothing to save", description: "No changes detected.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(payload);
  }

  function handleTest() {
    if (!testEmail.trim()) return;
    setTestResult(null);
    testMutation.mutate(testEmail.trim());
  }

  const displayFrom = fromDirty ? fromAddress : initialFrom;

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure platform-wide settings stored in the database.</p>
      </div>

      {/* Email Configuration Card */}
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4 border-b flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(217 80% 52% / 0.12)" }}>
            <Mail className="w-4 h-4" style={{ color: "hsl(217 91% 62%)" }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Email Configuration</h2>
            <p className="text-xs text-muted-foreground">Resend API settings for OTP and transactional emails</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Current status banner */}
              {data && (
                <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
                  data.resendApiKeySet
                    ? "bg-green-500/8 border border-green-500/20 text-green-700 dark:text-green-400"
                    : data.fallbackToEnv
                    ? "bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-red-500/8 border border-red-500/20 text-red-700 dark:text-red-400"
                }`}>
                  {data.resendApiKeySet ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : data.fallbackToEnv ? (
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>
                    {data.resendApiKeySet
                      ? `API key configured in database (${data.resendApiKey})`
                      : data.fallbackToEnv
                      ? "Using API key from server environment variable (.env.pm2). Set one here to override."
                      : "No Resend API key configured. OTPs are only logged to pm2 console."}
                  </span>
                </div>
              )}

              {/* API Key field */}
              <div className="space-y-1.5">
                <Label htmlFor="resend-key" className="flex items-center gap-1.5 text-xs font-medium">
                  <Key className="w-3.5 h-3.5" />
                  Resend API Key
                </Label>
                <div className="relative">
                  <Input
                    id="resend-key"
                    type={showKey ? "text" : "password"}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={data?.resendApiKeySet ? "Enter new key to replace existing…" : "re_xxxxxxxxxxxxxxxxxxxx"}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer"
                    className="underline underline-offset-2 hover:text-foreground transition-colors">
                    resend.com/api-keys
                  </a>
                </p>
              </div>

              {/* From address field */}
              <div className="space-y-1.5">
                <Label htmlFor="from-address" className="flex items-center gap-1.5 text-xs font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  From Address
                </Label>
                <Input
                  id="from-address"
                  type="text"
                  value={displayFrom}
                  onChange={(e) => { setFromAddress(e.target.value); setFromDirty(true); }}
                  placeholder="MysticsHR Platform <noreply@yourdomain.com>"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use the format <code className="bg-muted px-1 rounded">Name &lt;email@domain.com&gt;</code>.
                  Domain must be verified in Resend.
                </p>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || (!newKey.trim() && !fromDirty)}
                  size="sm"
                >
                  {saveMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Test email section */}
        <div className="px-6 py-5 border-t" style={{ background: "hsl(228 25% 4% / 0.4)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Send Test Email
          </h3>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }}
              placeholder="recipient@example.com"
              className="text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={!testEmail.trim() || testMutation.isPending}
              className="flex-shrink-0 gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {testMutation.isPending ? "Sending…" : "Send Test"}
            </Button>
          </div>
          {testResult && (
            <div className={`mt-2.5 flex items-center gap-2 text-xs rounded-md px-3 py-2 ${
              testResult.ok
                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}>
              {testResult.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              {testResult.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
