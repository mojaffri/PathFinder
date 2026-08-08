import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RecordSection } from "@/components/profile/record-section";
import { GPA_SCALES } from "@/types";
import {
  createEmptyAwardRecord,
  createEmptyCertificationRecord,
  createEmptyEducationRecord,
  createEmptyExperienceRecord,
  createEmptyProjectRecord,
  type AwardRecord,
  type CertificationRecord,
  type EducationRecord,
  type ExperienceRecord,
  type ProjectRecord,
} from "@/types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function bulletsToText(bullets: string[]): string {
  return bullets.join("\n");
}

function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function EducationSection({
  records,
  onChange,
}: {
  records: EducationRecord[];
  onChange: (records: EducationRecord[]) => void;
}) {
  return (
    <RecordSection
      title="Education"
      records={records}
      onChange={onChange}
      createEmpty={createEmptyEducationRecord}
      emptyLabel="No education added yet."
      addLabel="Add education"
      renderSummary={(r) => ({
        primary: r.institution || "New education entry",
        secondary: [r.degree, r.major].filter(Boolean).join(" · ") || undefined,
      })}
      renderFields={(record, update) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Institution">
              <Input value={record.institution ?? ""} onChange={(e) => update({ institution: e.target.value || null })} />
            </Field>
            <Field label="Degree">
              <Input
                value={record.degree ?? ""}
                onChange={(e) => update({ degree: e.target.value || null })}
                placeholder="e.g. Bachelor of Science"
              />
            </Field>
            <Field label="Major">
              <Input value={record.major ?? ""} onChange={(e) => update({ major: e.target.value || null })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="GPA">
                <Input
                  type="number"
                  step="0.01"
                  value={record.gpa ?? ""}
                  onChange={(e) => update({ gpa: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
              <Field label="Scale">
                <Select
                  value={record.gpaScale ?? "4.0"}
                  onChange={(e) => update({ gpaScale: e.target.value as EducationRecord["gpaScale"] })}
                >
                  {GPA_SCALES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Start date">
              <Input value={record.startDate ?? ""} onChange={(e) => update({ startDate: e.target.value || null })} placeholder="Aug 2025" />
            </Field>
            <Field label="End date">
              <Input value={record.endDate ?? ""} onChange={(e) => update({ endDate: e.target.value || null })} placeholder="Present" />
            </Field>
          </div>
        </>
      )}
    />
  );
}

export function ExperienceSection({
  records,
  onChange,
}: {
  records: ExperienceRecord[];
  onChange: (records: ExperienceRecord[]) => void;
}) {
  return (
    <RecordSection
      title="Experience"
      description="Internships, jobs, research positions, and leadership roles."
      records={records}
      onChange={onChange}
      createEmpty={createEmptyExperienceRecord}
      emptyLabel="No experience added yet."
      addLabel="Add experience"
      renderSummary={(r) => ({
        primary: r.title || "New experience entry",
        secondary: [r.organization, [r.startDate, r.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" · ") || undefined,
      })}
      renderFields={(record, update) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input value={record.title ?? ""} onChange={(e) => update({ title: e.target.value || null })} />
            </Field>
            <Field label="Organization">
              <Input value={record.organization ?? ""} onChange={(e) => update({ organization: e.target.value || null })} />
            </Field>
            <Field label="Location">
              <Input value={record.location ?? ""} onChange={(e) => update({ location: e.target.value || null })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start date">
                <Input value={record.startDate ?? ""} onChange={(e) => update({ startDate: e.target.value || null })} />
              </Field>
              <Field label="End date">
                <Input value={record.endDate ?? ""} onChange={(e) => update({ endDate: e.target.value || null })} />
              </Field>
            </div>
          </div>
          <Field label="Bullet points (one per line)">
            <Textarea
              rows={4}
              value={bulletsToText(record.bullets)}
              onChange={(e) => update({ bullets: textToBullets(e.target.value) })}
              placeholder="Developed Python scripts to automate data processing and analysis."
            />
          </Field>
        </>
      )}
    />
  );
}

export function ProjectSection({
  records,
  onChange,
}: {
  records: ProjectRecord[];
  onChange: (records: ProjectRecord[]) => void;
}) {
  return (
    <RecordSection
      title="Projects"
      records={records}
      onChange={onChange}
      createEmpty={createEmptyProjectRecord}
      emptyLabel="No projects added yet."
      addLabel="Add project"
      renderSummary={(r) => ({ primary: r.title || "New project", secondary: r.technologies.join(", ") || undefined })}
      renderFields={(record, update) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input value={record.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input value={record.date ?? ""} onChange={(e) => update({ date: e.target.value || null })} />
            </Field>
          </div>
          <Field label="Technologies (comma-separated)">
            <Input
              value={record.technologies.join(", ")}
              onChange={(e) =>
                update({ technologies: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
              }
              placeholder="Python, React, PostgreSQL"
            />
          </Field>
          <Field label="Summary (optional)">
            <Textarea
              rows={2}
              value={record.summary ?? ""}
              onChange={(e) => update({ summary: e.target.value || null })}
              placeholder="One-sentence overview of what the project does."
            />
          </Field>
          <Field label="Description / bullet points (one per line)">
            <Textarea
              rows={4}
              value={bulletsToText(record.bullets)}
              onChange={(e) => update({ bullets: textToBullets(e.target.value) })}
              placeholder="Built the core feature...\nImplemented authentication...\nhttps://github.com/you/project"
            />
          </Field>
        </>
      )}
    />
  );
}

export function AwardSection({
  records,
  onChange,
}: {
  records: AwardRecord[];
  onChange: (records: AwardRecord[]) => void;
}) {
  return (
    <RecordSection
      title="Awards & Honors"
      records={records}
      onChange={onChange}
      createEmpty={createEmptyAwardRecord}
      emptyLabel="No awards added yet."
      addLabel="Add award"
      renderSummary={(r) => ({ primary: r.name || "New award", secondary: r.organization ?? undefined })}
      renderFields={(record, update) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input value={record.name} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label="Organization">
              <Input value={record.organization ?? ""} onChange={(e) => update({ organization: e.target.value || null })} />
            </Field>
            <Field label="Date">
              <Input value={record.date ?? ""} onChange={(e) => update({ date: e.target.value || null })} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={2}
              value={record.description ?? ""}
              onChange={(e) => update({ description: e.target.value || null })}
            />
          </Field>
        </>
      )}
    />
  );
}

export function CertificationSection({
  records,
  onChange,
}: {
  records: CertificationRecord[];
  onChange: (records: CertificationRecord[]) => void;
}) {
  return (
    <RecordSection
      title="Certifications"
      records={records}
      onChange={onChange}
      createEmpty={createEmptyCertificationRecord}
      emptyLabel="No certifications added yet."
      addLabel="Add certification"
      renderSummary={(r) => ({ primary: r.name || "New certification", secondary: r.issuer ?? undefined })}
      renderFields={(record, update) => (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name">
            <Input value={record.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="Issuer">
            <Input value={record.issuer ?? ""} onChange={(e) => update({ issuer: e.target.value || null })} />
          </Field>
          <Field label="Date">
            <Input value={record.date ?? ""} onChange={(e) => update({ date: e.target.value || null })} />
          </Field>
        </div>
      )}
    />
  );
}
