"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { useProfile } from "@/hooks/use-profile";
import { deleteRoadmap, getRoadmaps } from "@/services/roadmap-service";
import { getSkillProgressMap } from "@/services/skillforge-service";
import { getSkillModulesForCareers } from "@/lib/skillforge/catalog";
import { getDemonstratedGapIds } from "@/lib/skillforge/roadmap-connection";
import { formatDate } from "@/lib/utils";
import type { SavedRoadmap } from "@/types";

export function SavedRoadmapsView() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const [roadmaps, setRoadmaps] = useState<SavedRoadmap[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [demonstratedGapIds, setDemonstratedGapIds] = useState<Set<string> | undefined>(undefined);

  useEffect(() => {
    if (isProfileLoading) return;
    let cancelled = false;
    getRoadmaps().then((r) => {
      if (!cancelled) setRoadmaps(r);
    });
    return () => {
      cancelled = true;
    };
  }, [isProfileLoading]);

  const selected = roadmaps?.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    // Live-computed, not stored on the roadmap itself — a gap is "demonstrated"
    // based on the student's current SkillForge mastery, which can keep
    // changing after the roadmap was generated.
    if (!selected || !profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDemonstratedGapIds(undefined);
      return;
    }
    let cancelled = false;
    const modules = getSkillModulesForCareers(profile.targetCareers);
    getSkillProgressMap(modules.map((m) => m.id)).then((progressMap) => {
      if (cancelled) return;
      setDemonstratedGapIds(
        getDemonstratedGapIds(
          selected.roadmap.gapAnalysis,
          modules.map((module) => ({ module, progress: progressMap[module.id] })),
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selected, profile]);

  if (isProfileLoading || roadmaps === null) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="mb-8 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to saved guides
        </button>
        <RoadmapView roadmap={selected.roadmap} demonstratedGapIds={demonstratedGapIds} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Saved guides</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Roadmaps you&apos;ve saved from Discover or Accelerate.</p>

      {roadmaps.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved guides yet"
          description="Generate a roadmap from Discover or Accelerate, then save it to see it here."
          className="mt-10"
        />
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {roadmaps.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>{r.targetCareers.join(", ")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.major ? `${r.major} · ` : ""}
                    Saved {formatDate(r.createdAt)}
                  </p>
                </div>
                <Badge variant="accent">{r.source}</Badge>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Button onClick={() => setSelectedId(r.id)}>Open</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Delete this saved guide?")) {
                      deleteRoadmap(r.id).then(() => getRoadmaps().then(setRoadmaps));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
