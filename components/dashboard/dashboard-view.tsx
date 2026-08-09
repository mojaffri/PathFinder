"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CalendarDays, ChartNoAxesCombined, CheckCircle2, RefreshCw, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Spinner } from "@/components/ui/spinner";
import { useProfile } from "@/hooks/use-profile";
import { getAnalyticsOverview } from "@/services/analytics-service";
import type { DashboardOverview } from "@/types";

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{children}<ArrowRight className="h-3.5 w-3.5" /></Link>;
}

export function DashboardView() {
  const { profile, isAuthenticated, isLoading: profileLoading } = useProfile();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setOverview(await getAnalyticsOverview()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load your dashboard."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    if (!isAuthenticated || !profile) return;
    let cancelled = false;
    getAnalyticsOverview().then((next) => { if (!cancelled) setOverview(next); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load your dashboard."); });
    return () => { cancelled = true; };
  }, [isAuthenticated, profile]);

  if (profileLoading || loading || (isAuthenticated && profile && !overview && !error)) return <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /><span className="sr-only">Loading dashboard</span></div>;
  if (!isAuthenticated) return <div className="mx-auto max-w-2xl px-6 py-16 text-center"><h1 className="text-2xl font-semibold">Sign in to see your dashboard</h1><Link href="/login?redirectTo=/dashboard" className="mt-6 inline-block"><Button>Sign in</Button></Link></div>;
  if (!profile || !profile.onboardingCompletedAt) return <div className="mx-auto max-w-2xl px-6 py-16 text-center"><h1 className="text-2xl font-semibold">Finish setting up your profile</h1><p className="mt-2 text-sm text-muted-foreground">Your personalized plan starts with your goals, skills, and timeline.</p><Link href="/onboarding" className="mt-6 inline-block"><Button>{profile ? "Resume onboarding" : "Start onboarding"}</Button></Link></div>;
  if (error) return <div role="alert" className="mx-auto mt-12 max-w-2xl rounded-lg border border-danger/30 bg-danger-bg p-6"><h1 className="text-lg font-semibold text-danger">Dashboard unavailable</h1><p className="mt-2 text-sm text-danger">{error}</p><Button className="mt-4" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" />Retry</Button></div>;
  if (!overview) return null;

  const activeApplications = Object.entries(overview.applicationsByStage).filter(([stage]) => !["rejected", "withdrawn"].includes(stage)).reduce((sum, [, count]) => sum + count, 0);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      {overview.isDemoData && <p className="mb-6 rounded-md border border-accent bg-accent/30 px-4 py-3 text-sm text-accent-foreground">Demo account: the activity history on this page is seeded showcase data and resets periodically.</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">Your career command center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome back, {profile.name}</h1><p className="mt-2 text-sm text-muted-foreground">Focus on the next evidence-building move, not another checklist.</p></div><Link href="/analytics"><Button variant="outline"><ChartNoAxesCombined className="h-4 w-4" />View progress</Button></Link></div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Target className="h-5 w-5 text-primary" /><CardTitle className="text-base">Target role</CardTitle></CardHeader><CardContent><p className="font-medium">{overview.targetRoles.join(", ") || "Choose a target"}</p><ActionLink href="/profile">Refine your goal</ActionLink></CardContent></Card>
        <Card><CardHeader><CalendarDays className="h-5 w-5 text-primary" /><CardTitle className="text-base">Target date</CardTitle></CardHeader><CardContent><p className="font-medium">{overview.targetDate ? new Date(`${overview.targetDate}T00:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "No date set"}</p><ActionLink href="/profile">Set your pace</ActionLink></CardContent></Card>
        <Card><CardHeader><ChartNoAxesCombined className="h-5 w-5 text-primary" /><CardTitle className="text-base">Career readiness</CardTitle></CardHeader><CardContent><div className="flex items-center gap-3"><ProgressBar value={overview.readiness ?? 0} className="flex-1" /><strong>{overview.readiness === null ? "—" : `${overview.readiness}%`}</strong></div><ActionLink href="/roadmap">Improve readiness</ActionLink></CardContent></Card>
        <Card><CardHeader><BriefcaseBusiness className="h-5 w-5 text-primary" /><CardTitle className="text-base">Application pipeline</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{activeApplications}</p><p className="text-xs text-muted-foreground">active or saved</p><ActionLink href="/applications">Manage applications</ActionLink></CardContent></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><div className="flex items-center justify-between"><CardTitle>Tasks this week</CardTitle><Badge>{overview.currentPhase ?? "Plan not generated"}</Badge></div><CardDescription>Highest-priority work scheduled from your actual roadmap.</CardDescription></CardHeader><CardContent>{overview.tasksThisWeek.length ? <ul className="divide-y divide-border">{overview.tasksThisWeek.map((task) => <li key={task.id} className="flex items-start gap-3 py-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{task.skillName}{task.targetDate ? ` · due ${new Date(`${task.targetDate}T00:00:00`).toLocaleDateString()}` : ""}</p></div></li>)}</ul> : <p className="text-sm text-muted-foreground">Generate an adaptive roadmap to schedule your next work.</p>}<ActionLink href="/roadmap">Open your plan</ActionLink></CardContent></Card>
        <Card><CardHeader><CardTitle>Top skill gaps</CardTitle><CardDescription>From only your {overview.savedJobCount} saved job{overview.savedJobCount === 1 ? "" : "s"}.</CardDescription></CardHeader><CardContent>{overview.topSkillGaps.length ? <ol className="space-y-3">{overview.topSkillGaps.map((skill) => <li key={skill.skill} className="flex items-center justify-between gap-3 text-sm"><span>{skill.skill}</span><span className="text-muted-foreground">{skill.frequencyPercent}% · {skill.evidence}</span></li>)}</ol> : <p className="text-sm text-muted-foreground">Save and analyze jobs to see recurring requirements.</p>}<ActionLink href="/jobs">Analyze saved jobs</ActionLink></CardContent></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Strongest evidence-backed skills</CardTitle><CardDescription>Skills supported by assessments, projects, experience, or verified artifacts.</CardDescription></CardHeader><CardContent>{overview.strongestSkills.length ? <ul className="space-y-3">{overview.strongestSkills.map((skill) => <li key={skill.skillName} className="flex items-center justify-between"><span className="text-sm font-medium">{skill.skillName}</span><Badge variant="accent">{skill.confidence.replace("-", " ")}</Badge></li>)}</ul> : <p className="text-sm text-muted-foreground">Add projects, assessments, or evidence to establish trusted skills.</p>}<ActionLink href="/projects">Build your evidence</ActionLink></CardContent></Card>
        <Card><CardHeader><CardTitle>Recent progress</CardTitle><CardDescription>Recorded actions only—nothing inferred.</CardDescription></CardHeader><CardContent>{overview.recentActivity.length ? <ul className="space-y-3">{overview.recentActivity.slice(0, 5).map((event) => <li key={event.id}><p className="text-sm font-medium capitalize">{event.label}</p><p className="text-xs text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Your meaningful actions will appear here as you use PathFinder.</p>}<ActionLink href="/analytics">See longitudinal progress</ActionLink></CardContent></Card>
      </div>
    </div>
  );
}
