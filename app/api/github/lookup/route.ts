import { NextResponse } from "next/server";
import { withGithubErrorHandling } from "@/lib/api/with-github-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { fetchPublicRepos, fetchUserRepos, type GithubRepoSummary } from "@/lib/github/client";
import { getDecryptedGithubToken } from "@/repositories/github-repository";

function summarize(repos: GithubRepoSummary[]) {
  return repos
    .filter((r) => !r.fork)
    .map((r) => ({ name: r.name, fullName: r.full_name, description: r.description, language: r.language }))
    .slice(0, 50);
}

/**
 * `?username=X` looks up ANY public GitHub username's repos — no connection
 * required, the primary path per the task's "analyze a public username
 * without requiring OAuth." Omitting `username` instead lists the
 * signed-in student's OWN repos via their connected GitHub account (a 400
 * if nothing is connected) — the picker behind "Import from my GitHub."
 */
export async function GET(request: Request) {
  return withGithubErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim();

    if (username) {
      if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username)) {
        return NextResponse.json({ error: "That doesn't look like a valid GitHub username." }, { status: 422 });
      }
      const connection = await getDecryptedGithubToken(user.id).catch(() => null);
      const repos = await fetchPublicRepos(username, connection?.token ?? null);
      return NextResponse.json({ repos: summarize(repos) });
    }

    const connection = await getDecryptedGithubToken(user.id);
    if (!connection) {
      return NextResponse.json({ error: "No GitHub account connected — connect one, or look up a public username instead." }, { status: 400 });
    }
    const repos = await fetchUserRepos(connection.token);
    return NextResponse.json({ repos: summarize(repos) });
  });
}
