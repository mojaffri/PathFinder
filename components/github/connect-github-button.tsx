"use client";

import { useEffect, useState } from "react";
import { GitBranch, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { disconnectGithub, getGithubConnectionStatus } from "@/services/github-service";
import type { GithubConnectionStatus } from "@/types";

/**
 * "Connect GitHub" via `supabase.auth.linkIdentity` — the app's EXISTING
 * auth architecture (Supabase already supports GitHub as a sign-in
 * provider), not a second, separate OAuth app. Linking attaches a GitHub
 * identity to the student's current session without changing who they're
 * signed in as; `app/auth/callback/route.ts` is where the resulting
 * `provider_token` actually gets captured and encrypted. Requesting only
 * `read:user` — the minimum scope needed to identify the account and
 * benefit from a higher API rate limit; this app never requests `repo`
 * scope, since it only ever analyzes PUBLIC repository data.
 */
export function ConnectGithubButton() {
  const [status, setStatus] = useState<GithubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGithubConnectionStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, username: null, connectedAt: null }));
  }, []);

  if (!isSupabaseConfigured()) return null;

  async function connect() {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(window.location.pathname)}`;
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "github",
      options: { scopes: "read:user", redirectTo },
    });
    if (linkError) {
      setLoading(false);
      setError(
        linkError.message.toLowerCase().includes("identity already")
          ? "This GitHub account is already connected."
          : `Couldn't connect GitHub: ${linkError.message}`,
      );
    }
    // On success, Supabase redirects the browser to GitHub then back to
    // redirectTo — nothing left to do here, the page will reload.
  }

  async function disconnect() {
    setLoading(true);
    await disconnectGithub();
    setStatus({ connected: false, username: null, connectedAt: null });
    setLoading(false);
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="accent" className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          Connected as {status.username}
        </Badge>
        <Button variant="ghost" size="sm" onClick={disconnect} disabled={loading}>
          <Unlink className="mr-1.5 h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="outline" size="sm" onClick={connect} disabled={loading}>
        <GitBranch className="mr-1.5 h-4 w-4" />
        {loading ? "Redirecting…" : "Connect GitHub"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Optional — raises your GitHub API rate limit and lets you pick from your own repos. You can always analyze any public username instead.</p>
    </div>
  );
}
