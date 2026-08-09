"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAdaptiveRoadmap } from "@/services/adaptive-roadmap-service";
import type { RoadmapChangeTrigger } from "@/types";

/**
 * A small, reusable "Update my roadmap" action surfaced contextually from
 * other flagship flows (job-fit results, SkillForge assessment results) —
 * one of the explicit, user-initiated adaptation triggers described in
 * docs/roadmap-engine.md (as opposed to the profile-field-change staleness
 * check, which is automatic). Recomputes with the right trigger, then sends
 * the student to /roadmap to see what changed.
 */
export function UpdateRoadmapLink({ trigger, label = "Update my plan" }: { trigger: RoadmapChangeTrigger; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      await generateAdaptiveRoadmap(trigger);
      router.push("/roadmap");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your plan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size="sm" variant="secondary" disabled={busy} onClick={handleClick}>
        <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> {label}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
