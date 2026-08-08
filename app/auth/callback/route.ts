import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveGithubConnection } from "@/repositories/github-repository";

/**
 * Exchanges an OAuth/magic-link code for a session, then redirects on to
 * wherever the user was headed. Also opportunistically captures a GitHub
 * `provider_token` when the OAuth flow that just completed was GitHub
 * (either a plain "Continue with GitHub" sign-in, or the "Connect GitHub"
 * button in the project analyzer calling `supabase.auth.linkIdentity` —
 * both land here) — this is what lets `docs/github-integration.md`'s
 * "OAuth via the app's existing auth architecture" path work without a
 * second, separate OAuth app. Never blocks the redirect if this fails;
 * connecting GitHub for repo analysis is a bonus on top of a successful
 * sign-in, not a requirement of it.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const githubIdentity = data.user?.identities?.find((identity) => identity.provider === "github");
      if (githubIdentity && data.session?.provider_token) {
        const username = (data.user?.user_metadata?.user_name as string | undefined) ?? (data.user?.user_metadata?.preferred_username as string | undefined);
        if (username) {
          await saveGithubConnection(data.user.id, {
            githubUsername: username,
            githubUserId: githubIdentity.id,
            accessToken: data.session.provider_token,
            scope: "read:user",
          }).catch(() => {});
        }
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
