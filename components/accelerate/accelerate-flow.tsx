"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/use-profile";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { getRoadmaps } from "@/services/roadmap-service";
import { selectCurrentAccelerateRoadmap } from "@/lib/roadmap/current-roadmap";
import type { SavedRoadmap } from "@/types";

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
  const [currentRoadmap, setCurrentRoadmap] = useState<SavedRoadmap | null>(null);
  const [checkingRoadmap, setCheckingRoadmap] = useState(true);
  const [confirmAnother, setConfirmAnother] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    let cancelled = false;
    getRoadmaps()
      .then((roadmaps) => {
        if (!cancelled) setCurrentRoadmap(selectCurrentAccelerateRoadmap(roadmaps));
      })
      .finally(() => {
        if (!cancelled) setCheckingRoadmap(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

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

  if (isLoading || (isAuthenticated && checkingRoadmap)) {
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

  if (currentRoadmap) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        {confirmAnother ? (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle>Build another roadmap?</CardTitle>
              <CardDescription>
                Your current roadmap is already saved in Saved guides. Starting again will keep this copy available there.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setCurrentRoadmap(null);
                  setConfirmAnother(false);
                  setStep({ kind: "choice" });
                }}
              >
                Continue
              </Button>
              <Button variant="secondary" onClick={() => setConfirmAnother(false)}>Keep current roadmap</Button>
            </CardContent>
          </Card>
        ) : null}
        <RoadmapView
          roadmap={currentRoadmap.roadmap}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setConfirmAnother(true)}>Build another roadmap</Button>
              <Link href="/saved" className={buttonVariants({ variant: "ghost" })}>View saved guides</Link>
            </div>
          }
        />
      </div>
    );
  }

  if (profile?.isDemo) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Explore the fictional demo plan</CardTitle>
            <CardDescription>
              The public demo is read-only and already has a fictional profile, skill gaps, and scheduled roadmap tasks. Create your own account when you want to build and automatically save a personal roadmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/roadmap" className={buttonVariants()}>View seeded roadmap</Link>
            <Link href="/profile" className={buttonVariants({ variant: "secondary" })}>View fictional profile</Link>
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
