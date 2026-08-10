"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Provider buttons are controlled by public availability flags so production
 * never advertises a provider before its Supabase credentials are active.
 */
export function OAuthButtons({ redirectTo }: { redirectTo: string }) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";
  const githubEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === "true";

  if (!googleEnabled && !githubEnabled) return null;

  async function signInWithProvider(provider: "google" | "github") {
    setError(null);
    setLoadingProvider(provider);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    });
    if (error) {
      setLoadingProvider(null);
      setError(`Could not start ${provider} sign-in. Please try again or use email.`);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {googleEnabled ? (
          <Button type="button" variant="outline" onClick={() => signInWithProvider("google")} disabled={loadingProvider !== null}>
            {loadingProvider === "google" ? "Redirecting..." : "Continue with Google"}
          </Button>
        ) : null}
        {githubEnabled ? (
          <Button type="button" variant="outline" onClick={() => signInWithProvider("github")} disabled={loadingProvider !== null}>
            {loadingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}
          </Button>
        ) : null}
        {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
