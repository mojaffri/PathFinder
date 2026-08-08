"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Compass, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spinner } from "@/components/ui/spinner";
import { useProfile } from "@/hooks/use-profile";
import { getRoadmaps } from "@/services/roadmap-service";
import { formatDate } from "@/lib/utils";
import { profileCompletion } from "@/types";
import type { SavedRoadmap } from "@/types";

export function DashboardView() {
  const { profile, isAuthenticated, isLoading } = useProfile();
  const [roadmaps, setRoadmaps] = useState<SavedRoadmap[]>([]);

  useEffect(() => {
    // Reading localStorage-backed roadmaps during render would mismatch SSR
    // output, so we read once the profile is available on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) setRoadmaps(getRoadmaps(profile.id));
  }, [profile]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!profile || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create a profile to see your dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your profile, saved roadmaps, and progress will show up here.
        </p>
        <Link href="/profile" className="mt-6 inline-block">
          <Button>Get started</Button>
        </Link>
      </div>
    );
  }

  const recent = roadmaps[0] ?? null;
  const completion = profileCompletion(profile);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back, {profile.name}</h1>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <ProgressBar value={completion} className="flex-1" />
              <span className="text-sm font-medium text-foreground">{completion}%</span>
            </div>
            <Link href="/profile" className="mt-3 inline-block text-sm text-primary hover:underline">
              Complete your profile
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target career{profile.targetCareers.length > 1 ? "s" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">
              {profile.targetCareers.length > 0 ? profile.targetCareers.join(", ") : "Not set yet"}
            </p>
            {profile.major && <p className="mt-1 text-sm text-muted-foreground">{profile.major}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent roadmap</CardTitle>
            <Badge variant="accent">{roadmaps.length} saved</Badge>
          </CardHeader>
          <CardContent>
            {recent ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{recent.targetCareers.join(", ")}</p>
                  <p className="text-sm text-muted-foreground">Saved {formatDate(recent.createdAt)}</p>
                </div>
                <Link href="/saved">
                  <Button variant="secondary">View saved guides</Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No roadmaps saved yet. Generate one from Discover or Accelerate.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Compass className="h-5 w-5" />
            </div>
            <CardTitle className="mt-3 text-base">Not sure what fits?</CardTitle>
            <CardDescription>Run the discovery questionnaire again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/discover">
              <Button variant="secondary">Go to Discover</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface text-foreground">
              <Rocket className="h-5 w-5" />
            </div>
            <CardTitle className="mt-3 text-base">Ready to build a plan?</CardTitle>
            <CardDescription>Generate a new acceleration roadmap.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/accelerate">
              <Button variant="secondary">Go to Accelerate</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {roadmaps.length === 0 && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bookmark className="h-3.5 w-3.5" />
          Saved roadmaps will appear above once you generate one.
        </p>
      )}
    </div>
  );
}
