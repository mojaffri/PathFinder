"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { useProfile } from "@/hooks/use-profile";
import { saveRoadmap } from "@/services/roadmap-service";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import type { Roadmap, RoadmapSource, SavedRoadmap } from "@/types";

function toRoadmapRequestBody(values: ProfileFormValues) {
  return {
    name: values.name,
    age: values.age,
    educationStage: values.educationStage,
    school: values.school,
    major: values.major,
    gpa: values.gpa,
    education: values.education,
    targetIndustry: values.targetIndustry,
    targetCareers: values.targetCareers,
    currentSkills: values.currentSkills,
    interests: values.interests,
    experience: values.experience,
    projects: values.projects,
    awards: values.awards,
    certifications: values.certifications,
    careerGoals: values.careerGoals,
    weeklyHoursAvailable: values.weeklyHoursAvailable,
  };
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; roadmap: Roadmap };

export function RoadmapGenerator({
  profileValues,
  source,
}: {
  profileValues: ProfileFormValues;
  source: RoadmapSource;
}) {
  const { profile } = useProfile();
  const [state, setState] = useState<State>({ status: "loading" });
  const [saved, setSaved] = useState<SavedRoadmap | null>(null);

  async function generate() {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRoadmapRequestBody(profileValues)),
      });
      const body = await response.json();

      if (!response.ok) {
        setState({ status: "error", message: body.error ?? "Couldn't generate a roadmap." });
        return;
      }

      setState({ status: "ready", roadmap: body as Roadmap });
    } catch {
      setState({ status: "error", message: "Couldn't reach the server. Check your connection and try again." });
    }
  }

  useEffect(() => {
    // Kick off roadmap generation once, on mount. This is an imperative POST
    // request (not a cacheable data read), so an effect is the right tool.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (state.status !== "ready" || !profile) return;
    const now = new Date().toISOString();
    const record: SavedRoadmap = {
      id: crypto.randomUUID(),
      userId: profile.id,
      major: profileValues.major,
      targetCareers: profileValues.targetCareers,
      educationStage: profileValues.educationStage,
      createdAt: now,
      updatedAt: now,
      roadmap: state.roadmap,
      source,
    };
    saveRoadmap(record);
    setSaved(record);
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <Spinner className="h-6 w-6 text-primary" />
        <p className="text-sm text-muted-foreground">Generating your roadmap, this can take a moment...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-sm text-danger">{state.message}</p>
        <Button onClick={generate}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <RoadmapView
      roadmap={state.roadmap}
      actions={
        saved ? (
          <div className="flex items-center gap-2">
            <Badge>Saved</Badge>
            <Link href="/saved">
              <Button variant="secondary">View saved guides</Button>
            </Link>
          </div>
        ) : (
          <Button onClick={handleSave}>
            <BookmarkCheck className="h-4 w-4" />
            Save Guide
          </Button>
        )
      }
    />
  );
}
