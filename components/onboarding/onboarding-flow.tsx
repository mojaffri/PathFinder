"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TagListInput } from "@/components/ui/tag-list-input";
import { TargetCareerSelect } from "@/components/profile/target-career-select";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import {
  createEmptyProfile,
  EDUCATION_STAGES,
  EMPLOYMENT_PREFERENCES,
  GPA_SCALES,
} from "@/types";

const STEPS = [
  { id: "basics", title: "The basics" },
  { id: "education", title: "Education" },
  { id: "target", title: "Target career" },
  { id: "skills", title: "Skills & interests" },
  { id: "logistics", title: "Logistics" },
] as const;

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function OnboardingFlow() {
  const router = useRouter();
  const { profile, isAuthenticated, isLoading, createProfile, updateProfile, completeOnboarding } = useProfile();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ProfileFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(profile);
    } else if (!isLoading && isAuthenticated) {
      setValues(createEmptyProfile(""));
    }
  }, [profile, isLoading, isAuthenticated]);

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
            <CardTitle>Sign in to get started</CardTitle>
            <CardDescription>Onboarding takes about two minutes.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/login?redirectTo=/onboarding">
              <Button>Sign in</Button>
            </Link>
            <Link href="/signup?redirectTo=/onboarding">
              <Button variant="secondary">Create an account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!values) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  function update<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((v) => (v ? { ...v, [key]: value } : v));
  }

  async function persist() {
    if (!values) return;
    setError(null);
    setSaving(true);
    try {
      if (!profile) {
        await createProfile(values.name || "Student");
      }
      await updateProfile(values);
    } catch {
      setError("Couldn't save that step. Check your connection and try again.");
      throw new Error("persist-failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    try {
      await persist();
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    } catch {
      // error state already set in persist()
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleFinish() {
    try {
      await persist();
      await completeOnboarding();
      router.push("/dashboard");
    } catch {
      // error state already set in persist()
    }
  }

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const canContinue = step.id !== "basics" || !isBlank(values.name);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <ProgressBar value={((stepIndex + 1) / STEPS.length) * 100} className="mt-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{step.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {step.id === "basics" && (
            <>
              <div>
                <Label htmlFor="ob-name" required>
                  Your name
                </Label>
                <Input id="ob-name" className="mt-1.5" value={values.name} onChange={(e) => update("name", e.target.value)} autoFocus />
              </div>
              <div>
                <Label htmlFor="ob-age">Age</Label>
                <Input
                  id="ob-age"
                  type="number"
                  min={13}
                  max={100}
                  className="mt-1.5"
                  value={values.age ?? ""}
                  onChange={(e) => update("age", e.target.value ? Number(e.target.value) : null)}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">PathFinder accounts are for people age 13 or older.</p>
              </div>
              <div>
                <Label htmlFor="ob-stage">Where are you in your journey?</Label>
                <Select
                  id="ob-stage"
                  className="mt-1.5"
                  value={values.educationStage ?? ""}
                  onChange={(e) => update("educationStage", (e.target.value || null) as ProfileFormValues["educationStage"])}
                >
                  <option value="">Select...</option>
                  {EDUCATION_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {step.id === "education" && (
            <>
              <div>
                <Label htmlFor="ob-school">School</Label>
                <Input id="ob-school" className="mt-1.5" value={values.school} onChange={(e) => update("school", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ob-major">Major / field of study</Label>
                <Input id="ob-major" className="mt-1.5" value={values.major} onChange={(e) => update("major", e.target.value)} />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <Label htmlFor="ob-gpa">GPA (optional)</Label>
                  <Input
                    id="ob-gpa"
                    type="number"
                    step="0.01"
                    className="mt-1.5"
                    value={values.gpa.raw ?? ""}
                    onChange={(e) => update("gpa", { ...values.gpa, raw: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div>
                  <Label htmlFor="ob-gpa-scale">Scale</Label>
                  <Select
                    id="ob-gpa-scale"
                    className="mt-1.5"
                    value={values.gpa.scale}
                    onChange={(e) => update("gpa", { ...values.gpa, scale: e.target.value as ProfileFormValues["gpa"]["scale"] })}
                  >
                    {GPA_SCALES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </>
          )}

          {step.id === "target" && (
            <>
              <div>
                <Label>Target career(s)</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">Add one or more — you can always change this later.</p>
                <div className="mt-1.5">
                  <TargetCareerSelect values={values.targetCareers} onChange={(v) => update("targetCareers", v)} />
                </div>
              </div>
              <div>
                <Label htmlFor="ob-industry">Target industry</Label>
                <Input
                  id="ob-industry"
                  className="mt-1.5"
                  value={values.targetIndustry}
                  onChange={(e) => update("targetIndustry", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ob-goals">What&apos;s your career goal, in a sentence or two?</Label>
                <Textarea
                  id="ob-goals"
                  className="mt-1.5"
                  rows={3}
                  value={values.careerGoals}
                  onChange={(e) => update("careerGoals", e.target.value)}
                />
              </div>
            </>
          )}

          {step.id === "skills" && (
            <>
              <div>
                <Label>Current skills</Label>
                <div className="mt-1.5">
                  <TagListInput values={values.currentSkills} onChange={(v) => update("currentSkills", v)} placeholder="e.g. Python, SQL" />
                </div>
              </div>
              <div>
                <Label>Interests</Label>
                <div className="mt-1.5">
                  <TagListInput values={values.interests} onChange={(v) => update("interests", v)} placeholder="e.g. robotics, policy" />
                </div>
              </div>
            </>
          )}

          {step.id === "logistics" && (
            <>
              <div>
                <Label htmlFor="ob-hours">Hours per week you can realistically commit</Label>
                <Input
                  id="ob-hours"
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={values.weeklyHoursAvailable ?? ""}
                  onChange={(e) => update("weeklyHoursAvailable", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div>
                <Label>Preferred locations</Label>
                <div className="mt-1.5">
                  <TagListInput
                    values={values.preferredLocations}
                    onChange={(v) => update("preferredLocations", v)}
                    placeholder="e.g. Remote, New York"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ob-employment">Looking for</Label>
                <Select
                  id="ob-employment"
                  className="mt-1.5"
                  value={values.employmentPreference ?? ""}
                  onChange={(e) => update("employmentPreference", (e.target.value || null) as ProfileFormValues["employmentPreference"])}
                >
                  <option value="">Select...</option>
                  {EMPLOYMENT_PREFERENCES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="ob-target-date">I want to be job-ready by (optional)</Label>
                <Input
                  id="ob-target-date"
                  type="date"
                  className="mt-1.5"
                  value={values.targetDate ?? ""}
                  onChange={(e) => update("targetDate", e.target.value || null)}
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="mt-2 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={handleBack} disabled={stepIndex === 0 || saving}>
              Back
            </Button>
            {isLastStep ? (
              <Button type="button" onClick={handleFinish} disabled={saving || !canContinue}>
                {saving ? "Saving..." : "Finish"}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} disabled={saving || !canContinue}>
                {saving ? "Saving..." : "Continue"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
