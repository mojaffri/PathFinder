"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Trash2 } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { analyzeJobDescription, deleteJobDescription, getJobDescriptions } from "@/services/job-service";
import { formatDate } from "@/lib/utils";
import type { JobDescriptionSummary } from "@/types";

const MIN_LENGTH = 50;

export function JobsDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isProfileLoading } = useProfile();
  const [jobs, setJobs] = useState<JobDescriptionSummary[] | null>(null);
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getJobDescriptions().then(setJobs);
  }

  useEffect(() => {
    if (isProfileLoading) return;
    let cancelled = false;
    getJobDescriptions().then((j) => {
      if (!cancelled) setJobs(j);
    });
    return () => {
      cancelled = true;
    };
  }, [isProfileLoading]);

  async function handleAnalyze() {
    setError(null);
    if (rawText.trim().length < MIN_LENGTH) {
      setError("Paste the full job posting — that looks too short to analyze.");
      return;
    }
    setAnalyzing(true);
    try {
      const job = await analyzeJobDescription(rawText);
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing that posting.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (isProfileLoading) {
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
            <CardTitle>Sign in to analyze job postings</CardTitle>
            <CardDescription>Your saved postings and fit analyses are tied to your account.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/login?redirectTo=/jobs">
              <Button>Sign in</Button>
            </Link>
            <Link href="/signup?redirectTo=/jobs">
              <Button variant="secondary">Create an account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Job fit</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Paste a job description to get a deterministic fit score against your profile — a requirement-by-requirement
          match matrix, not a black-box percentage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paste a job description</CardTitle>
          <CardDescription>The full posting works best — title, requirements, responsibilities, and all.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the full job posting here..."
            className="min-h-48"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={handleAnalyze} disabled={analyzing} className="self-start">
            {analyzing && <Spinner />}
            {analyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Saved postings
        </h2>

        {jobs === null ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState icon={Briefcase} title="No job postings yet" description="Paste one above to run your first fit analysis." />
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <Link href={`/jobs/${job.id}`} className="flex-1">
                    <p className="font-medium text-foreground">{job.title ?? "Untitled role"}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.company ? `${job.company} · ` : ""}
                      {job.requirementCount} requirement{job.requirementCount === 1 ? "" : "s"} · Saved {formatDate(job.createdAt)}
                    </p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Delete this saved job posting?")) {
                        deleteJobDescription(job.id).then(refresh);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
