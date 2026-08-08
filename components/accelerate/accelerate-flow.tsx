"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
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
  | { kind: "ready"; values: ProfileFormValues };

export function AccelerateFlow({ initialCareer }: { initialCareer?: string }) {
  const { profile, createProfile, updateProfile } = useProfile();
  const [step, setStep] = useState<Step>({ kind: "choice" });

  function baseValues(): ProfileFormValues {
    const base: ProfileFormValues = profile ?? createEmptyProfile("");
    if (!initialCareer || base.targetCareers.includes(initialCareer)) return base;
    return { ...base, targetCareers: [...base.targetCareers, initialCareer] };
  }

  function finalize(values: ProfileFormValues) {
    if (!profile) createProfile(values.name || "Student");
    updateProfile(values);
    setStep({ kind: "ready", values });
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <RoadmapGenerator profileValues={step.values} source="accelerate" />
    </div>
  );
}
