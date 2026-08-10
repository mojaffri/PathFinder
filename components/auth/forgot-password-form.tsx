"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirectTo=/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("We couldn’t send a reset link right now. Wait a moment and try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <div className="space-y-4 text-sm text-muted-foreground" role="status"><p>If an account exists for {email}, a password-reset link is on its way. The message may take a few minutes.</p><Link href="/login" className="font-medium text-primary hover:underline">Back to sign in</Link></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5"><Label htmlFor="reset-email">Email</Label><Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button type="submit" disabled={loading}>{loading ? "Sending link..." : "Send reset link"}</Button>
      <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">Back to sign in</Link>
    </form>
  );
}
