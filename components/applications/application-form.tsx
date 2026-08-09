"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APPLICATION_STATUSES, type JobApplication, type JobApplicationInput } from "@/types";

const LABELS: Record<(typeof APPLICATION_STATUSES)[number], string> = {
  saved: "Saved", preparing: "Preparing", applied: "Applied", phone_screen: "Phone screen", interview: "Interview", final_round: "Final round", rejected: "Rejected", offer: "Offer", withdrawn: "Withdrawn",
};

export function emptyApplication(): JobApplicationInput {
  return { jobDescriptionId: null, company: "", title: "", jobDescription: null, sourceUrl: null, fitScore: null, applicationDate: null, currentStage: "saved", interviewDates: [], notes: null, gapsAtApplication: [] };
}

export function ApplicationForm({ initial, onSave, onCancel, busy }: { initial?: JobApplication; onSave: (input: JobApplicationInput) => Promise<void>; onCancel: () => void; busy: boolean }) {
  const prefix = useId();
  const [value, setValue] = useState<JobApplicationInput>(initial ? { ...initial } : emptyApplication());
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof JobApplicationInput>(key: K, next: JobApplicationInput[K]) => setValue((current) => ({ ...current, [key]: next }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try { await onSave(value); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this application."); }
  }

  return (
    <form onSubmit={submit} className="space-y-5" aria-describedby={error ? `${prefix}-error` : undefined}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor={`${prefix}-company`}>Company</Label><Input id={`${prefix}-company`} required maxLength={160} value={value.company} onChange={(e) => set("company", e.target.value)} /></div>
        <div><Label htmlFor={`${prefix}-title`}>Job title</Label><Input id={`${prefix}-title`} required maxLength={200} value={value.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div><Label htmlFor={`${prefix}-stage`}>Current stage</Label><Select id={`${prefix}-stage`} value={value.currentStage} onChange={(e) => set("currentStage", e.target.value as JobApplicationInput["currentStage"])}>{APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{LABELS[status]}</option>)}</Select></div>
        <div><Label htmlFor={`${prefix}-date`}>Application date</Label><Input id={`${prefix}-date`} type="date" value={value.applicationDate ?? ""} onChange={(e) => set("applicationDate", e.target.value || null)} /></div>
        <div className="sm:col-span-2"><Label htmlFor={`${prefix}-url`}>Source URL</Label><Input id={`${prefix}-url`} type="url" placeholder="https://…" value={value.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value || null)} /></div>
      </div>
      <div><Label htmlFor={`${prefix}-description`}>Job description</Label><Textarea id={`${prefix}-description`} maxLength={30000} className="min-h-32" value={value.jobDescription ?? ""} onChange={(e) => set("jobDescription", e.target.value || null)} /></div>
      <div><Label htmlFor={`${prefix}-notes`}>Notes and next step</Label><Textarea id={`${prefix}-notes`} maxLength={10000} placeholder="Example: Tailor project bullets and ask Maya for a referral." value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></div>
      {error && <p id={`${prefix}-error`} role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Add application"}</Button></div>
    </form>
  );
}

export { LABELS as APPLICATION_STATUS_LABELS };
