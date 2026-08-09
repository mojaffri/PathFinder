import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { addManualEvidence } from "@/repositories/evidence-repository";
import { EVIDENCE_SOURCE_TYPES } from "@/types";
import type { EvidenceSourceType, EvidenceStrengthLevel, VerificationStatus } from "@/types";
import { logActivityEvent } from "@/repositories/activity-repository";

const SOURCE_TYPES = new Set<string>(EVIDENCE_SOURCE_TYPES.map((t) => t.value));
const STRENGTHS = new Set(["weak", "moderate", "strong"]);
const VERIFICATION = new Set(["unverified", "self-reported", "verified"]);

function field(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

/** Adds one manually-entered piece of evidence (a publication, an instructor reference, anything not derivable from the profile/SkillForge/GitHub) — the only kind of evidence this app persists directly, see docs/evidence-model.md. */
export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Please sign in before adding evidence." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });

    const skillName = field(body, "skillName");
    const sourceType = field(body, "sourceType");
    const sourceLabel = field(body, "sourceLabel");
    const evidenceStrength = field(body, "evidenceStrength");
    const verificationStatus = field(body, "verificationStatus") || "self-reported";
    const explanation = field(body, "explanation");
    const occurredOn = field(body, "occurredOn") || null;

    if (!skillName || skillName.length > 80) {
      return NextResponse.json({ error: "Skill name is required and must be under 80 characters." }, { status: 422 });
    }
    if (!SOURCE_TYPES.has(sourceType)) {
      return NextResponse.json({ error: "Invalid evidence source type." }, { status: 422 });
    }
    if (!sourceLabel || sourceLabel.length > 200) {
      return NextResponse.json({ error: "A short label describing this evidence is required." }, { status: 422 });
    }
    if (!STRENGTHS.has(evidenceStrength)) {
      return NextResponse.json({ error: "Invalid evidence strength." }, { status: 422 });
    }
    if (!VERIFICATION.has(verificationStatus)) {
      return NextResponse.json({ error: "Invalid verification status." }, { status: 422 });
    }
    if (!explanation || explanation.length > 500) {
      return NextResponse.json({ error: "A short explanation of why this counts as evidence is required (under 500 characters)." }, { status: 422 });
    }

    const record = await addManualEvidence(user.id, {
      skillName,
      sourceType: sourceType as EvidenceSourceType,
      sourceLabel,
      evidenceStrength: evidenceStrength as EvidenceStrengthLevel,
      verificationStatus: verificationStatus as VerificationStatus,
      explanation,
      occurredOn,
    });
    await logActivityEvent(user.id, "skill_evidence_added", { evidenceId: record.id, skillName: record.skillName, sourceType: record.sourceType });
    return NextResponse.json({ evidence: record }, { status: 201 });
  });
}
