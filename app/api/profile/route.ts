import { NextResponse } from "next/server";
import { withDbErrorHandling } from "@/lib/api/with-db-error-handling";
import { getServerUser } from "@/lib/supabase/server";
import { createProfile, deleteProfile, getProfileByUserId, updateProfile, type ProfileWriteInput } from "@/repositories/profile-repository";
import { logActivityEvent } from "@/repositories/activity-repository";
import { createEmptyProfile, type StudentProfile } from "@/types";

function toWriteInput(profile: StudentProfile): ProfileWriteInput {
  return {
    name: profile.name,
    age: profile.age,
    educationStage: profile.educationStage,
    school: profile.school,
    major: profile.major,
    gpaRaw: profile.gpa.raw,
    gpaScale: profile.gpa.scale,
    targetIndustry: profile.targetIndustry,
    targetCareers: profile.targetCareers,
    currentSkills: profile.currentSkills,
    interests: profile.interests,
    education: profile.education,
    experience: profile.experience,
    projects: profile.projects,
    awards: profile.awards,
    certifications: profile.certifications,
    careerGoals: profile.careerGoals,
    workPreferences: profile.workPreferences,
    weeklyHoursAvailable: profile.weeklyHoursAvailable,
    preferredLocations: profile.preferredLocations,
    employmentPreference: profile.employmentPreference,
    targetDate: profile.targetDate,
  };
}

export async function GET() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const profile = await getProfileByUserId(user.id);
    return NextResponse.json({ profile });
  });
}

export async function POST(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const existing = await getProfileByUserId(user.id);
    if (existing) return NextResponse.json({ profile: existing });

    const body: unknown = await request.json().catch(() => ({}));
    const name = typeof body === "object" && body !== null && "name" in body && typeof body.name === "string" ? body.name : "";

    const profile = await createProfile(user.id, toWriteInput(createEmptyProfile(name)));
    await logActivityEvent(user.id, "profile_created");
    return NextResponse.json({ profile }, { status: 201 });
  });
}

/** Full-replace update — the client sends the complete `StudentProfile` shape (merged client-side), matching the previous localStorage semantics. */
export async function PATCH(request: Request) {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const current = await getProfileByUserId(user.id);
    if (!current) return NextResponse.json({ error: "No profile exists for this user yet." }, { status: 404 });

    const updates = (await request.json()) as Partial<StudentProfile>;
    const merged: StudentProfile = { ...current, ...updates };

    const profile = await updateProfile(user.id, toWriteInput(merged));
    return NextResponse.json({ profile });
  });
}

export async function DELETE() {
  return withDbErrorHandling(async () => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    await deleteProfile(user.id);
    return NextResponse.json({ ok: true });
  });
}
