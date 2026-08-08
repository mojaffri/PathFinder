import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EDUCATION_STAGES,
  WORK_ENVIRONMENTS,
  type AwardRecord,
  type CertificationRecord,
  type EducationRecord,
  type ExperienceRecord,
  type ProjectRecord,
  type StudentProfile,
} from "@/types";
import { formatGpa } from "@/lib/gpa";
import { FolderGit2 } from "lucide-react";

function stageLabel(profile: StudentProfile) {
  return EDUCATION_STAGES.find((s) => s.value === profile.educationStage)?.label ?? "Not set";
}

function TagList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item}>{item}</Badge>
      ))}
    </div>
  );
}

function dateRange(start: string | null, end: string | null): string | null {
  const parts = [start, end].filter(Boolean);
  return parts.length > 0 ? parts.join(" – ") : null;
}

function EducationList({ records }: { records: EducationRecord[] }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">No education added yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      {records.map((r) => (
        <div key={r.id} className="text-sm">
          <p className="font-medium text-foreground">{r.institution ?? "Untitled institution"}</p>
          <p className="text-muted-foreground">
            {[r.degree, r.major].filter(Boolean).join(", ")}
            {r.gpa !== null && ` · GPA: ${r.gpa}${r.gpaScale ? ` (${r.gpaScale})` : ""}`}
          </p>
          {dateRange(r.startDate, r.endDate) && <p className="text-xs text-muted-foreground">{dateRange(r.startDate, r.endDate)}</p>}
        </div>
      ))}
    </div>
  );
}

function ExperienceList({ records }: { records: ExperienceRecord[] }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">No experience added yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      {records.map((r) => (
        <div key={r.id} className="text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-medium text-foreground">{r.title ?? "Untitled role"}</p>
            {dateRange(r.startDate, r.endDate) && (
              <p className="text-xs text-muted-foreground">{dateRange(r.startDate, r.endDate)}</p>
            )}
          </div>
          {(r.organization || r.location) && (
            <p className="text-muted-foreground">{[r.organization, r.location].filter(Boolean).join(" · ")}</p>
          )}
          {r.summary && <p className="mt-1 text-foreground">{r.summary}</p>}
          {r.bullets.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1">
              {r.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectList({ records }: { records: ProjectRecord[] }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">No projects added yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      {records.map((r) => (
        <div key={r.id} className="text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-medium text-foreground">{r.title}</p>
            {r.date && <p className="text-xs text-muted-foreground">{r.date}</p>}
          </div>
          {r.technologies.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {r.technologies.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
          {r.summary && <p className="mt-1 text-foreground">{r.summary}</p>}
          {r.bullets.length > 0 && (
            <ul className="mt-1 flex flex-col gap-1">
              {r.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function AwardList({ records }: { records: AwardRecord[] }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">No awards added yet.</p>;
  return (
    <div className="flex flex-col gap-3">
      {records.map((r) => (
        <div key={r.id} className="text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-medium text-foreground">{r.name}</p>
            {r.date && <p className="text-xs text-muted-foreground">{r.date}</p>}
          </div>
          {r.organization && <p className="text-muted-foreground">{r.organization}</p>}
          {r.description && <p className="mt-1 text-foreground">{r.description}</p>}
        </div>
      ))}
    </div>
  );
}

function CertificationList({ records }: { records: CertificationRecord[] }) {
  if (records.length === 0) return <p className="text-sm text-muted-foreground">No certifications added yet.</p>;
  return (
    <div className="flex flex-col gap-2">
      {records.map((r) => (
        <div key={r.id} className="text-sm">
          <span className="font-medium text-foreground">{r.name}</span>
          {(r.issuer || r.date) && (
            <span className="text-muted-foreground"> · {[r.issuer, r.date].filter(Boolean).join(", ")}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProfileView({
  profile,
  onEdit,
  onSignOut,
  onDelete,
}: {
  profile: StudentProfile;
  onEdit: () => void;
  onSignOut: () => void;
  onDelete: () => void;
}) {
  const hasAnyRecords =
    profile.education.length > 0 ||
    profile.experience.length > 0 ||
    profile.projects.length > 0 ||
    profile.awards.length > 0 ||
    profile.certifications.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{profile.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stageLabel(profile)}
            {profile.school && ` · ${profile.school}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Edit profile
          </Button>
          <Button variant="ghost" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target career{profile.targetCareers.length > 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="text-foreground">
            {profile.targetCareers.length > 0 ? profile.targetCareers.join(", ") : "Not set yet. Try Discover or Accelerate."}
          </p>
          {profile.targetIndustry && (
            <p className="text-muted-foreground">Industry: {profile.targetIndustry}</p>
          )}
          {profile.careerGoals && (
            <p className="mt-2 text-muted-foreground">{profile.careerGoals}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-foreground">
          <div className="grid gap-2 sm:grid-cols-2">
            <p>GPA: {formatGpa(profile.gpa)}</p>
            <p>Age: {profile.age ?? "—"}</p>
            <p>Hours per week for career prep: {profile.weeklyHoursAvailable ?? "—"}</p>
          </div>
          <EducationList records={profile.education} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <TagList items={profile.currentSkills} emptyLabel="No skills added yet." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interests</CardTitle>
        </CardHeader>
        <CardContent>
          <TagList items={profile.interests} emptyLabel="No interests added yet." />
        </CardContent>
      </Card>

      {!hasAnyRecords ? (
        <EmptyState
          icon={FolderGit2}
          title="No experience, projects, awards, or certifications yet"
          description="Upload a resume via Accelerate, or add these from Edit profile."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <ExperienceList records={profile.experience} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectList records={profile.projects} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Awards & Honors</CardTitle>
            </CardHeader>
            <CardContent>
              <AwardList records={profile.awards} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificationList records={profile.certifications} />
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Preferred environments</CardTitle>
        </CardHeader>
        <CardContent>
          <TagList
            items={profile.workPreferences.environments.map(
              (env) => WORK_ENVIRONMENTS.find((e) => e.value === env)?.label ?? env,
            )}
            emptyLabel="None set yet."
          />
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={onDelete}
        className="self-start text-sm text-danger hover:underline"
      >
        Delete profile
      </button>
    </div>
  );
}
