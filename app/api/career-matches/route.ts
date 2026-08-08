import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { saveCareerMatches } from "@/repositories/career-match-repository";
import type { CareerMatch } from "@/types";

/**
 * Best-effort persistence of a signed-in student's Discover results. Discover
 * itself never depends on this — matching runs entirely client-side and
 * works for anonymous visitors too; this just lets a signed-in student's
 * matches show up later (e.g. on `/dashboard`) instead of vanishing on
 * refresh. Not authenticated is a normal, silent no-op here, not an error.
 */
export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ saved: false });

    const body = (await request.json()) as { matches: CareerMatch[] };
    await saveCareerMatches(user.id, body.matches ?? []);
    return NextResponse.json({ saved: true });
  });
}
