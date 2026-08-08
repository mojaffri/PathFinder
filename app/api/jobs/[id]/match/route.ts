import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getJobDescription, listJobMatches, saveJobMatch } from "@/repositories/job-repository";
import { getProfileByUserId } from "@/repositories/profile-repository";
import { listResumes } from "@/repositories/resume-repository";
import { computeJobFitAnalysis } from "@/lib/jobs/fit-scoring";
import { buildSkillConfidenceContext } from "@/lib/evidence/build-context";

/** Match history for this job, most recent first — lets a student compare fit before/after building evidence for a gap. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const analyses = await listJobMatches(user.id, id);
    return NextResponse.json({ analyses });
  });
}

/** Runs the deterministic job-fit engine against the caller's profile and persists the result as a new point-in-time snapshot (a student can re-run this after building evidence for a gap and compare). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { id } = await params;
    const job = await getJobDescription(user.id, id);
    if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const profile = await getProfileByUserId(user.id);
    if (!profile) {
      return NextResponse.json(
        { error: "Set up your profile first (education, skills, experience) so there's something to score against." },
        { status: 422 },
      );
    }

    if (job.requirements.length === 0) {
      return NextResponse.json(
        { error: "This job description has no extracted requirements to match against — edit it to add some first." },
        { status: 422 },
      );
    }

    const resumes = await listResumes(user.id);
    const activeResumeId = resumes.find((r) => r.isActive)?.id ?? null;

    // buildSkillConfidenceContext re-fetches the profile internally, but this
    // route already needed its own profile fetch above to return the 422
    // "set up your profile first" error with a clean message — the second
    // fetch is a small, worthwhile price for keeping that check simple.
    const evidenceContext = await buildSkillConfidenceContext(user.id);
    const result = computeJobFitAnalysis(job, profile, activeResumeId, evidenceContext ?? undefined);
    const analysis = await saveJobMatch(user.id, id, result);
    return NextResponse.json({ analysis });
  });
}
