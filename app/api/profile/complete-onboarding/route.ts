import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { completeOnboarding } from "@/repositories/profile-repository";
import { logActivityEvent } from "@/repositories/activity-repository";

export async function POST() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const profile = await completeOnboarding(user.id);
    await logActivityEvent(user.id, "onboarding_completed");
    return NextResponse.json({ profile });
  });
}
