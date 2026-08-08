import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getSkillModule } from "@/lib/skillforge/catalog";
import { addEvidence } from "@/repositories/skillforge-repository";
import type { SkillEvidence } from "@/types";

export async function POST(request: Request, { params }: { params: Promise<{ skillId: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { skillId } = await params;
    const skillModule = getSkillModule(skillId);
    if (!skillModule) return NextResponse.json({ error: `Unknown skill "${skillId}".` }, { status: 404 });

    const body = (await request.json()) as Omit<SkillEvidence, "id" | "skillId" | "addedAt">;
    const progress = await addEvidence(user.id, skillModule, body);
    return NextResponse.json({ progress }, { status: 201 });
  });
}
