"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignupForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!acceptedTerms) {
      setError("Confirm that you are at least 13 and agree to the Terms and Privacy Notice.");
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground" role="status">
        <p>Check {email} for a confirmation link, then return to sign in.</p>
        <Link href="/login" className="font-medium text-primary hover:underline">Go to sign in</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-start gap-3 text-sm leading-5 text-muted-foreground">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]" />
        <span>I am at least 13 and agree to the <Link href="/terms" className="font-medium text-primary hover:underline">Terms</Link> and <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Notice</Link>.</span>
      </label>
      <OAuthButtons redirectTo={redirectTo} disabled={!acceptedTerms} />
      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        </div>
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </div>
  );
}
