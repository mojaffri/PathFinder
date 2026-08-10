"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagListInput } from "@/components/ui/tag-list-input";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { RatingScale } from "@/components/ui/rating-scale";
import { GuidedField } from "@/components/ui/guided-field";
import { TargetCareerSelect } from "@/components/profile/target-career-select";
import {
  AwardSection,
  CertificationSection,
  EducationSection,
  ExperienceSection,
  ProjectSection,
} from "@/components/profile/structured-sections";
import {
  CAREER_CATEGORIES,
  EDUCATION_STAGES,
  WORK_ENVIRONMENTS,
  categoryFromLabel,
  type EducationRecord,
  type StudentProfile,
  type WorkEnvironment,
} from "@/types";
import { syncPrimaryEducation } from "@/lib/profile-sync";

export type ProfileFormValues = Omit<StudentProfile, "id" | "createdAt" | "updatedAt">;

export interface ProfileFormProps {
  initialValues: ProfileFormValues;
  submitLabel: string;
  onSubmit: (values: ProfileFormValues) => void;
  onCancel?: () => void;
  /**
   * Resume extraction can never populate career goals, interests, or work
   * preferences — they don't exist on a resume. When true (the post-upload
   * review flow), those fields are wrapped with a prominent hint while
   * they're still empty, so students know exactly what's left for them to
   * fill in before generating a roadmap.
   */
  highlightUnparsedFields?: boolean;
}

export function ProfileForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  highlightUnparsedFields = false,
}: ProfileFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const hasTargetCareer = (values.targetCareers ?? []).length > 0;

  function update<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateEducation(education: EducationRecord[]) {
    const synced = syncPrimaryEducation(education);
    setValues((prev) => ({ ...prev, education, school: synced.school, major: synced.major, gpa: synced.gpa }));
  }

  function toggleEnvironment(env: WorkEnvironment) {
    const current = values.workPreferences.environments;
    const next = current.includes(env)
      ? current.filter((e) => e !== env)
      : [...current, env];
    setValues((prev) => ({
      ...prev,
      workPreferences: { ...prev.workPreferences, environments: next },
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!hasTargetCareer) {
          setSubmitAttempted(true);
          document.getElementById("targetCareers")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        onSubmit(values);
      }}
      className="flex flex-col gap-10"
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" required>
              Name
            </Label>
            <Input
              id="name"
              required
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={13}
              max={100}
              value={values.age ?? ""}
              onChange={(e) => update("age", e.target.value ? Number(e.target.value) : null)}
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="educationStage">Education stage</Label>
            <Select
              id="educationStage"
              value={values.educationStage ?? ""}
              onChange={(e) => update("educationStage", (e.target.value || null) as ProfileFormValues["educationStage"])}
              className="mt-1.5"
            >
              <option value="">Select...</option>
              {EDUCATION_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section>
        <EducationSection records={values.education} onChange={updateEducation} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Target career</h2>
        <div className="max-w-sm">
          <Label htmlFor="targetIndustry">Target field</Label>
          <Select
            id="targetIndustry"
            value={values.targetIndustry}
            onChange={(e) => update("targetIndustry", e.target.value)}
            className="mt-1.5"
          >
            <option value="">Select...</option>
            {CAREER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.label}>
                {c.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Choosing a field narrows the career list below to that field.
          </p>
        </div>
        <div id="targetCareers">
          <Label required>Target career(s)</Label>
          <div className="mt-1.5">
            <TargetCareerSelect
              values={values.targetCareers ?? []}
              onChange={(v) => update("targetCareers", v)}
              targetCategory={categoryFromLabel(values.targetIndustry)}
            />
          </div>
          {submitAttempted && !hasTargetCareer && (
            <p className="mt-1.5 text-xs font-medium text-danger">
              Pick at least one target career so we know what to build your roadmap toward.
            </p>
          )}
        </div>
        <GuidedField
          active={highlightUnparsedFields}
          empty={!values.careerGoals.trim()}
          message="Your resume can't tell us what you're aiming for, so a sentence or two here helps your roadmap target the right goal."
        >
          <Label htmlFor="careerGoals">Career goals</Label>
          <Textarea
            id="careerGoals"
            value={values.careerGoals}
            onChange={(e) => update("careerGoals", e.target.value)}
            className="mt-1.5"
            placeholder="What do you want this career to give you in 5-10 years?"
          />
        </GuidedField>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-sm font-semibold text-foreground">Skills & experience</h2>
        <div>
          <Label>Current skills</Label>
          <TagListInput
            values={values.currentSkills}
            onChange={(v) => update("currentSkills", v)}
            placeholder="Add a skill and press Enter"
          />
        </div>
        <GuidedField
          active={highlightUnparsedFields}
          empty={values.interests.length === 0}
          message="Personal interests never show up on a resume, but adding a few helps us match careers you'll actually enjoy."
        >
          <Label>Interests</Label>
          <TagListInput
            values={values.interests}
            onChange={(v) => update("interests", v)}
            placeholder="Add an interest and press Enter"
          />
        </GuidedField>
        <ExperienceSection records={values.experience} onChange={(v) => update("experience", v)} />
        <ProjectSection records={values.projects} onChange={(v) => update("projects", v)} />
        <AwardSection records={values.awards} onChange={(v) => update("awards", v)} />
        <CertificationSection records={values.certifications} onChange={(v) => update("certifications", v)} />
      </section>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Work preferences</h2>
          {highlightUnparsedFields && (
            <p className="mt-1 text-xs text-muted-foreground">
              None of this comes from a resume. It&apos;s about how you want to work, not what you&apos;ve
              already done. The priorities below start at a neutral middle value; adjust any that don&apos;t
              reflect what actually matters to you.
            </p>
          )}
        </div>
        <GuidedField
          active={highlightUnparsedFields}
          empty={values.workPreferences.environments.length === 0}
          message="Pick at least one. Your target career's environment (lab, remote, clinical, etc.) is a big factor in how your roadmap gets built."
        >
          <Label>Preferred work environments</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {WORK_ENVIRONMENTS.map((env) => (
              <ToggleChip
                key={env.value}
                selected={values.workPreferences.environments.includes(env.value)}
                onClick={() => toggleEnvironment(env.value)}
              >
                {env.label}
              </ToggleChip>
            ))}
          </div>
        </GuidedField>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label>Remote work interest</Label>
            <div className="mt-1.5">
              <RatingScale
                name="remoteInterest"
                lowLabel="Prefer in-person"
                highLabel="Prefer remote"
                value={values.workPreferences.remoteInterest}
                onChange={(v) =>
                  update("workPreferences", { ...values.workPreferences, remoteInterest: v })
                }
              />
            </div>
          </div>
          <div>
            <Label>Leadership / entrepreneurship interest</Label>
            <div className="mt-1.5">
              <RatingScale
                name="leadershipInterest"
                lowLabel="Not a priority"
                highLabel="Very important"
                value={values.workPreferences.leadershipInterest}
                onChange={(v) =>
                  update("workPreferences", { ...values.workPreferences, leadershipInterest: v })
                }
              />
            </div>
          </div>
          <div>
            <Label>Salary importance</Label>
            <div className="mt-1.5">
              <RatingScale
                name="salaryImportance"
                lowLabel="Not a priority"
                highLabel="Very important"
                value={values.workPreferences.salaryImportance}
                onChange={(v) =>
                  update("workPreferences", { ...values.workPreferences, salaryImportance: v })
                }
              />
            </div>
          </div>
          <div>
            <Label>Work-life balance importance</Label>
            <div className="mt-1.5">
              <RatingScale
                name="workLifeBalanceImportance"
                lowLabel="Not a priority"
                highLabel="Very important"
                value={values.workPreferences.workLifeBalanceImportance}
                onChange={(v) =>
                  update("workPreferences", {
                    ...values.workPreferences,
                    workLifeBalanceImportance: v,
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="max-w-sm rounded-lg border border-accent-foreground/30 bg-accent/50 p-4">
          <div className="flex items-start gap-2 text-xs font-medium text-accent-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Used by the timeline engine to convert total milestone hours into a realistic week-by-week schedule.</p>
          </div>
          <div className="mt-3">
            <Label htmlFor="weeklyHours">Hours per week for career prep</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Hours you can dedicate weekly to projects and closing skill gaps (excluding classes or your job).
            </p>
            <Input
              id="weeklyHours"
              type="number"
              min={0}
              max={80}
              value={values.weeklyHoursAvailable ?? ""}
              onChange={(e) =>
                update("weeklyHoursAvailable", e.target.value ? Number(e.target.value) : null)
              }
              className="mt-2"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="submit">{submitLabel}</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
