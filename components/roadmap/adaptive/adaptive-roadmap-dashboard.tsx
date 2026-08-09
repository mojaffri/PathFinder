"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, RefreshCw } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { generateAdaptiveRoadmap, getAdaptiveRoadmap, updateAdaptiveTaskStatus } from "@/services/adaptive-roadmap-service";
import type { AdaptiveRoadmap, AdaptiveTaskStatus, RoadmapChangeTrigger } from "@/types";
import { AdaptiveRoadmapView } from "./adaptive-roadmap-view";

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; roadmap: AdaptiveRoadmap }
  | { status: "error"; message: string };

export function AdaptiveRoadmapDashboard() {
  const { profile, isAuthenticated, isLoading: isProfileLoading } = useProfile();
  const [state, setState] = useState<State>({ status: "loading" });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isProfileLoading || !isAuthenticated) return;
    let cancelled = false;
    getAdaptiveRoadmap()
      .then((roadmap) => {
        if (cancelled) return;
        setState(roadmap ? { status: "ready", roadmap } : { status: "empty" });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Couldn't load your roadmap." });
      });
    return () => {
      cancelled = true;
    };
  }, [isProfileLoading, isAuthenticated]);

  async function handleRecompute(trigger: RoadmapChangeTrigger) {
    setGenerating(true);
    try {
      const { roadmap } = await generateAdaptiveRoadmap(trigger);
      setState({ status: "ready", roadmap });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Couldn't generate a roadmap." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleTaskStatusChange(taskId: string, status: AdaptiveTaskStatus) {
    const { roadmap } = await updateAdaptiveTaskStatus(taskId, status);
    if (roadmap) setState({ status: "ready", roadmap });
  }

  if (isProfileLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in to build your plan</CardTitle>
            <CardDescription>Your adaptive roadmap is tied to your account and your saved profile data.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/login?redirectTo=/roadmap">
              <Button>Sign in</Button>
            </Link>
            <Link href="/signup?redirectTo=/roadmap">
              <Button variant="secondary">Create an account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Plan</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          A single, continuously-updated schedule of the specific skills you need next — sequenced by real
          prerequisites, prioritized by your saved jobs and evidence, and scheduled around your actual weekly hours.
        </p>
      </div>

      {state.status === "error" && <p className="mb-4 text-sm text-danger">{state.message}</p>}

      {state.status === "empty" || state.status === "error" ? (
        <EmptyState
          icon={Map}
          title="No plan yet"
          description="Generate a plan from your profile, saved jobs, SkillForge progress, and evidence."
          action={
            <Button disabled={generating} onClick={() => handleRecompute("manual")}>
              {generating && <Spinner />}
              {generating ? "Generating..." : "Generate my plan"}
            </Button>
          }
        />
      ) : (
        <>
          <AdaptiveRoadmapView
            roadmap={state.roadmap}
            profile={profile}
            onRecompute={handleRecompute}
            onTaskStatusChange={handleTaskStatusChange}
            recomputing={generating}
          />
          {generating && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" /> Recomputing your plan...
            </div>
          )}
        </>
      )}
    </div>
  );
}
