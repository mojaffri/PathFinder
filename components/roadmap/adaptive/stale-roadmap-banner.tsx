"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdaptiveRoadmap, RoadmapChangeTrigger, StudentProfile } from "@/types";

/**
 * Client-side staleness check: compares the loaded roadmap's snapshot of
 * target careers/date/weekly hours against the LIVE profile. This is how a
 * profile-field change reaches the adaptive roadmap without the app touching
 * `app/api/profile/route.ts` — the recompute stays an explicit user action,
 * just prompted contextually. See docs/roadmap-engine.md.
 */
export function StaleRoadmapBanner({
  roadmap,
  profile,
  onRecompute,
}: {
  roadmap: AdaptiveRoadmap;
  profile: StudentProfile;
  onRecompute: (trigger: RoadmapChangeTrigger) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const targetRoleChanged = JSON.stringify([...roadmap.targetCareers].sort()) !== JSON.stringify([...profile.targetCareers].sort());
  const deadlineChanged = roadmap.targetDate !== profile.targetDate;
  const hoursChanged = roadmap.weeklyHoursAvailable !== profile.weeklyHoursAvailable;

  if (!targetRoleChanged && !deadlineChanged && !hoursChanged) return null;

  const trigger: RoadmapChangeTrigger = targetRoleChanged ? "target-role-changed" : deadlineChanged ? "deadline-changed" : "weekly-hours-changed";
  const reason = targetRoleChanged
    ? "your target career"
    : deadlineChanged
      ? "your target date"
      : "your weekly availability";

  async function handleClick() {
    setBusy(true);
    try {
      await onRecompute(trigger);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning bg-warning-bg px-4 py-3">
      <p className="text-sm text-warning">Your profile changed — {reason} no longer matches this roadmap.</p>
      <Button size="sm" variant="secondary" disabled={busy} onClick={handleClick}>
        <RefreshCw className="h-4 w-4" /> Update my roadmap
      </Button>
    </div>
  );
}
