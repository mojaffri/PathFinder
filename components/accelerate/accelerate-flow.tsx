"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { createEmptyProfile } from "@/types";
import type { ResumeProfileData } from "@/types";
import { mapResumeDataToProfileValues } from "@/lib/resume/map-to-profile";
import { IntakeChoice } from "@/components/accelerate/intake-choice";
import { ResumeUpload } from "@/components/accelerate/resume-upload";
import { ExtractedDataReview } from "@/components/accelerate/extracted-data-review";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import { RoadmapGenerator } from "@/components/roadmap/roadmap-generator";

type Step =
  | { kind: "choice" }
  | { kind: "resume" }
  | { kind: "review"; resumeData: ResumeProfileData; initialValues: ProfileFormValues }
  | { kind: "manual" }
  | { kind: "saving" }
  | { kind: "ready"; values: ProfileFormValues };

export function AccelerateFlow({ initialCareer }: { initialCareer?: string }) {
  const { profile, isAuthenticated, isLoading, createProfile, updateProfile, completeOnboarding } = useProfile();
  const [step, setStep] = useState<Step>({ kind: "choice" });

  function baseValues(): ProfileFormValues {
    const base: ProfileFormValues = profile ?? createEmptyProfile("");
    if (!initialCareer || base.targetCareers.includes(initialCareer)) return base;
    return { ...base, targetCareers: [...base.targetCareers, initialCareer] };
  }

  async function finalize(values: ProfileFormValues) {
    setStep({ kind: "saving" });
    if (!profile) await createProfile(values.name || "Student");
    await updateProfile(values);
    // Accelerate captures a full profile just like onboarding does, so
    // completing it here too means a student who skips /onboarding and
    // comes straight here isn't nagged to "resume onboarding" afterward.
    await completeOnboarding();
    setStep({ kind: "ready", values });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to build your roadmap</CardTitle>
            <CardDescription>Your resume review and roadmap get saved to your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/login?redirectTo=/accelerate">
              <Button>Sign in</Button>
            </Link>
            <Link href="/signup?redirectTo=/accelerate">
              <Button variant="secondary">Create an account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step.kind === "choice") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Accelerate your path</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {initialCareer
              ? `Let's build your roadmap toward becoming a competitive ${initialCareer} candidate.`
              : "Tell us where you're starting from, and we'll build a phase-by-phase roadmap."}
          </p>
        </div>
        <IntakeChoice
          onChooseResume={() => setStep({ kind: "resume" })}
          onChooseManual={() => setStep({ kind: "manual" })}
        />
      </div>
    );
  }

  if (step.kind === "resume") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <ResumeUpload
          onExtracted={(resumeData) =>
            setStep({
              kind: "review",
              resumeData,
              initialValues: mapResumeDataToProfileValues(resumeData, baseValues()),
            })
          }
          onSkip={() => setStep({ kind: "manual" })}
        />
      </div>
    );
  }

  if (step.kind === "review") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ExtractedDataReview
          resumeData={step.resumeData}
          initialValues={step.initialValues}
          onCancel={() => setStep({ kind: "choice" })}
          onConfirm={finalize}
        />
      </div>
    );
  }

  if (step.kind === "manual") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
          Tell us about yourself
        </h1>
        <ProfileForm
          initialValues={baseValues()}
          submitLabel="Continue"
          onCancel={() => setStep({ kind: "choice" })}
          onSubmit={finalize}
        />
      </div>
    );
  }

  if (step.kind === "saving") {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <RoadmapGenerator profileValues={step.values} source="accelerate" />
    </div>
  );
}
