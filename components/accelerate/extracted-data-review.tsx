import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { ProfileForm, type ProfileFormValues } from "@/components/profile/profile-form";
import type { ResumeProfileData } from "@/types";

export function ExtractedDataReview({
  resumeData,
  initialValues,
  onConfirm,
  onCancel,
}: {
  resumeData: ResumeProfileData;
  initialValues: ProfileFormValues;
  onConfirm: (values: ProfileFormValues) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          PathFinder found these claims in your resume
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          These are unverified claims pulled from your document, not confirmed facts. Every field below is
          editable, so confirm what&apos;s right, fix what&apos;s wrong, and remove anything that shouldn&apos;t be
          there before continuing.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
        {resumeData.extractionConfidence === "high" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        )}
        <div className="text-sm">
          <p className="font-medium text-foreground">
            {resumeData.extractionConfidence === "high"
              ? "We found a good amount of detail in your resume."
              : resumeData.extractionConfidence === "medium"
                ? "We found some detail in your resume, but please double-check it."
                : "We didn't find much structured detail in your resume, so please fill in the gaps below."}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Extracted using {resumeData.extractionMethod === "ai" ? "AI-assisted reading" : "basic text parsing"}.
          </p>
          {resumeData.followUpQuestions.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {resumeData.followUpQuestions.map((q) => (
                <li key={q}>• {q}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-dashed border-accent-foreground/30 bg-accent/50 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
        <div className="text-sm">
          <p className="font-medium text-accent-foreground">
            A resume can&apos;t tell us everything a roadmap needs.
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Career goals, personal interests, and work preferences (environment, remote interest, weekly hours,
            and priorities) only come from you. We&apos;ve flagged those sections below, and filling them in gets
            you a much more accurate roadmap.
          </p>
        </div>
      </div>

      <ProfileForm
        initialValues={initialValues}
        submitLabel="Continue"
        onCancel={onCancel}
        onSubmit={onConfirm}
        highlightUnparsedFields
      />
    </div>
  );
}
