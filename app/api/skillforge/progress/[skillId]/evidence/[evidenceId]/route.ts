import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { getSkillModule } from "@/lib/skillforge/catalog";
import { removeEvidence } from "@/repositories/skillforge-repository";

export async function DELETE(_request: Request, { params }: { params: Promise<{ skillId: string; evidenceId: string }> }) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { skillId, evidenceId } = await params;
    const skillModule = getSkillModule(skillId);
    if (!skillModule) return NextResponse.json({ error: `Unknown skill "${skillId}".` }, { status: 404 });

    const progress = await removeEvidence(user.id, skillModule, evidenceId);
    return NextResponse.json({ progress });
  });
}
