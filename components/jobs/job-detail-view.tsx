"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { TagListInput } from "@/components/ui/tag-list-input";
import { JobRequirementRow } from "@/components/jobs/job-requirement-row";
import { JobFitResults } from "@/components/jobs/job-fit-results";
import { getJobDescription, runJobFitAnalysis, updateJobDescription } from "@/services/job-service";
import type { JobDescription, JobFitAnalysis, JobRequirement } from "@/types";

function newRequirement(): JobRequirement {
  return {
    id: `manual-${crypto.randomUUID()}`,
    category: "required",
    kind: "skill",
    label: "",
    minYears: null,
    source: "manual",
  };
}

export function JobDetailView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDescription | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobFitAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    getJobDescription(jobId).then(setJob);
  }, [jobId]);

  async function handleSave() {
    if (!job) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJobDescription(jobId, job);
      setJob(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await runJobFitAnalysis(jobId);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't run the fit analysis.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (job === undefined) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm text-muted-foreground">This job posting wasn&apos;t found.</p>
        <Link href="/jobs" className="mt-4 inline-block text-sm font-medium text-foreground hover:underline">
          Back to job fit
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/jobs" className="mb-8 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to job fit
      </Link>

      <div className="mb-6 flex items-center gap-2">
        <Badge variant="neutral">{job.extractionMethod === "ai" ? "AI-extracted" : "Basic parsing"}</Badge>
        {job.extractionConfidence && <Badge variant="neutral">{job.extractionConfidence} confidence</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="job-title">Title</Label>
          <Input id="job-title" value={job.title ?? ""} onChange={(e) => setJob({ ...job, title: e.target.value || null })} className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="job-company">Company</Label>
          <Input id="job-company" value={job.company ?? ""} onChange={(e) => setJob({ ...job, company: e.target.value || null })} className="mt-1.5" />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Requirements</CardTitle>
          <CardDescription>Correct anything misextracted, remove what doesn&apos;t belong, or add what&apos;s missing.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {job.requirements.length > 0 && (
            <div className="grid grid-cols-[1fr_9rem_8rem_5rem_2.5rem] gap-2 text-xs font-medium text-muted-foreground">
              <span>Requirement</span>
              <span>Category</span>
              <span>Kind</span>
              <span>Years</span>
              <span />
            </div>
          )}
          {job.requirements.map((req) => (
            <JobRequirementRow
              key={req.id}
              requirement={req}
              onChange={(next) => setJob({ ...job, requirements: job.requirements.map((r) => (r.id === next.id ? next : r)) })}
              onRemove={() => setJob({ ...job, requirements: job.requirements.filter((r) => r.id !== req.id) })}
            />
          ))}
          <Button variant="secondary" size="sm" className="self-start" onClick={() => setJob({ ...job, requirements: [...job.requirements, newRequirement()] })}>
            <Plus className="h-4 w-4" />
            Add requirement
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <TagListInput
            values={job.responsibilities}
            onChange={(values) => setJob({ ...job, responsibilities: values })}
            placeholder="Add a responsibility and press Enter"
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <TagListInput values={job.keywords} onChange={(values) => setJob({ ...job, keywords: values })} placeholder="Add a keyword and press Enter" />
        </CardContent>
      </Card>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={handleSave} disabled={saving}>
          {saving && <Spinner />}
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <Button onClick={handleAnalyze} disabled={analyzing}>
          {analyzing && <Spinner />}
          {analyzing ? "Analyzing..." : "Run fit analysis"}
        </Button>
      </div>

      {analysis && (
        <div className="mt-10">
          <JobFitResults analysis={analysis} />
        </div>
      )}
    </div>
  );
}
