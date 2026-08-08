"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Google/GitHub sign-in — works the instant those providers are enabled in
 * the Supabase dashboard (Authentication > Providers), no code changes
 * needed. Until then, clicking these surfaces Supabase's own "provider not
 * enabled" error, which is expected and not a bug in this app.
 */
export function OAuthButtons({ redirectTo }: { redirectTo: string }) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);

  async function signInWithProvider(provider: "google" | "github") {
    setLoadingProvider(provider);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}` },
    });
    if (error) {
      setLoadingProvider(null);
      alert(`Could not start ${provider} sign-in: ${error.message}`);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={() => signInWithProvider("google")} disabled={loadingProvider !== null}>
        {loadingProvider === "google" ? "Redirecting..." : "Continue with Google"}
      </Button>
      <Button variant="outline" onClick={() => signInWithProvider("github")} disabled={loadingProvider !== null}>
        {loadingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}
      </Button>
    </div>
  );
}
