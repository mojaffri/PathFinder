"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const roadmapId = useRef<string>(crypto.randomUUID());

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

      if (!profile) {
        setState({ status: "error", message: "Your profile was not ready. Refresh and try again." });
        return;
      }

      const roadmap = body as Roadmap;
      const now = new Date().toISOString();
      const record: SavedRoadmap = {
        id: roadmapId.current,
        userId: profile.id,
        major: profileValues.major,
        targetCareers: profileValues.targetCareers,
        educationStage: profileValues.educationStage,
        createdAt: now,
        updatedAt: now,
        roadmap,
        source,
      };
      const saved = await saveRoadmap(record);
      setState({ status: "ready", roadmap: saved.roadmap });
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            <BookmarkCheck className="mr-1 h-3.5 w-3.5" /> Saved automatically
          </Badge>
          <Link href="/saved" className={buttonVariants({ variant: "secondary" })}>View saved guides</Link>
        </div>
      }
    />
  );
}
