import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function LoginPage() {
  const { isSignedIn, isLoading, login } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isSignedIn, isLoading, setLocation]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocation("/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setRegSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setRegError(data.error ?? "Registration failed");
        return;
      }
      setLocation("/dashboard");
      window.location.reload();
    } catch {
      setRegError("Network error. Please try again.");
    } finally {
      setRegSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={`${BASE_URL}/logo.svg`}
            alt="MysticsHR"
            className="h-10 mx-auto mb-4"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login" ? "Welcome back" : "Set up your account"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login"
              ? "Sign in to access MysticsHR"
              : "Create your password to get started"}
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-2" />
          <CardContent className="pt-0">
            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive font-medium">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  First time here?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setError(""); }}
                    className="text-primary font-medium hover:underline"
                  >
                    Set up your account
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Full name</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Arjun Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={regSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={regSubmitting}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={regSubmitting}
                  />
                </div>
                {regError && (
                  <p className="text-sm text-destructive font-medium">{regError}</p>
                )}
                <Button type="submit" className="w-full" disabled={regSubmitting}>
                  {regSubmitting ? "Setting up…" : "Set up account"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have a password?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setRegError(""); }}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
