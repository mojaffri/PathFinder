import { NextResponse } from "next/server";
import { withGithubErrorHandling } from "@/lib/api/with-github-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { analyzeRepository } from "@/lib/github/analyze-repo";
import { getDecryptedGithubToken, saveRepoAnalysis } from "@/repositories/github-repository";

const OWNER_REPO_RE = /^[a-z\d](?:[a-z\d]|[-_.](?=[a-z\d])){0,99}$/i;

/** Analyzes one specific repository (deterministic signals + optional AI narrative) and persists it — the "import a repo" action, reachable from a public-username lookup or the connected account's own repo picker. */
export async function POST(request: Request) {
  return withGithubErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Please sign in before importing a repository." }, { status: 401 });

    const body: unknown = await request.json().catch(() => null);
    const owner = body && typeof body === "object" && "owner" in body && typeof body.owner === "string" ? body.owner.trim() : "";
    const repo = body && typeof body === "object" && "repo" in body && typeof body.repo === "string" ? body.repo.trim() : "";

    if (!OWNER_REPO_RE.test(owner) || !OWNER_REPO_RE.test(repo)) {
      return NextResponse.json({ error: "That doesn't look like a valid owner/repository name." }, { status: 422 });
    }

    const connection = await getDecryptedGithubToken(user.id).catch(() => null);
    const analysis = await analyzeRepository(owner, repo, connection?.token ?? null);
    const saved = await saveRepoAnalysis(user.id, analysis, connection?.connectionId ?? null);

    return NextResponse.json({ repo: saved }, { status: 201 });
  });
}
