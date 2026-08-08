import { desc, eq } from "drizzle-orm";
import { ensureProfileId } from "@/repositories/profile-repository";
import { withUserContext } from "@/lib/db/with-user-context";
import { skillEvidenceRecords } from "@/lib/db/schema";
import type { EvidenceSourceType, EvidenceStrengthLevel, SkillEvidenceRecord, VerificationStatus } from "@/types";

type Row = typeof skillEvidenceRecords.$inferSelect;

function toRecord(row: Row): SkillEvidenceRecord {
  return {
    id: row.id,
    skillName: row.skillName,
    sourceType: row.sourceType as EvidenceSourceType,
    sourceLabel: row.sourceLabel,
    sourceRefType: null,
    sourceRefId: null,
    evidenceStrength: row.evidenceStrength as EvidenceStrengthLevel,
    verificationStatus: row.verificationStatus as VerificationStatus,
    explanation: row.explanation,
    occurredOn: row.occurredOn,
    origin: "manual",
    createdAt: row.createdAt.toISOString(),
  };
}

/** Manually-added evidence only — see `types/evidence.ts`'s module doc for why everything else is recomputed rather than persisted. */
export async function listManualEvidence(userId: string): Promise<SkillEvidenceRecord[]> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const rows = await tx.select().from(skillEvidenceRecords).where(eq(skillEvidenceRecords.profileId, profileId)).orderBy(desc(skillEvidenceRecords.createdAt));
    return rows.map(toRecord);
  });
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

export async function addManualEvidence(userId: string, input: ManualEvidenceInput): Promise<SkillEvidenceRecord> {
  return withUserContext(userId, async (tx) => {
    const profileId = await ensureProfileId(tx, userId);
    const [row] = await tx
      .insert(skillEvidenceRecords)
      .values({
        profileId,
        skillName: input.skillName,
        sourceType: input.sourceType,
        sourceLabel: input.sourceLabel,
        evidenceStrength: input.evidenceStrength,
        verificationStatus: input.verificationStatus,
        explanation: input.explanation,
        occurredOn: input.occurredOn,
      })
      .returning();
    return toRecord(row);
  });
}

export async function deleteManualEvidence(userId: string, id: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.delete(skillEvidenceRecords).where(eq(skillEvidenceRecords.id, id));
  });
}
