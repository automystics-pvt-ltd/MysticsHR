import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertCircle } from "lucide-react";

export function LoginPage() {
  const { login } = usePlatformAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      navigate("/dashboard");
    } else {
      setError(result.error ?? "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Platform Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage tenants and users</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg">
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="platform@mysticshr.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-input border-border"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          This area is restricted to authorised platform administrators only.
        </p>
      </div>
    </div>
  );
}
