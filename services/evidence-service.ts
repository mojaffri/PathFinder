import type { EvidenceSourceType, EvidenceStrengthLevel, SkillConfidenceScore, SkillEvidenceRecord, VerificationStatus } from "@/types";

async function parseJsonOrThrow(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body;
}

export async function getSkillConfidenceScores(): Promise<SkillConfidenceScore[]> {
  const res = await fetch("/api/skills/confidence");
  if (res.status === 401) return [];
  const data = (await parseJsonOrThrow(res)) as { scores: SkillConfidenceScore[] };
  return data.scores;
}

export interface ManualEvidenceInput {
  skillName: string;
  sourceType: EvidenceSourceType;
  sourceLabel: string;
  evidenceStrength: EvidenceStrengthLevel;
  verificationStatus: VerificationStatus;
  explanation: string;
  occurredOn: string | null;
}

export async function addManualEvidence(input: ManualEvidenceInput): Promise<SkillEvidenceRecord> {
  const res = await fetch("/api/skills/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await parseJsonOrThrow(res)) as { evidence: SkillEvidenceRecord };
  return data.evidence;
}

export async function deleteManualEvidence(id: string): Promise<void> {
  await fetch(`/api/skills/evidence/${id}`, { method: "DELETE" });
}
