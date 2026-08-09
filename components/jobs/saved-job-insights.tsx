"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getSavedJobInsights } from "@/services/application-service";
import type { SavedJobInsights as Insights } from "@/types";

export function SavedJobInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setData(await getSavedJobInsights()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load saved-job insights."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let cancelled = false;
    getSavedJobInsights().then((next) => { if (!cancelled) setData(next); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load saved-job insights."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  if (loading) return <Card><CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Spinner />Calculating insights from your saved jobs…</CardContent></Card>;
  if (error) return <Card><CardContent className="py-6"><p role="alert" className="text-sm text-danger">{error}</p><Button size="sm" variant="outline" className="mt-3" onClick={load}><RefreshCw className="h-4 w-4" />Retry</Button></CardContent></Card>;
  if (!data || !data.savedJobCount) return null;
  return <Card><CardHeader><CardTitle>What your saved jobs ask for</CardTitle><CardDescription>{data.basisLabel}</CardDescription></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="pb-2 font-medium">Skill</th><th scope="col" className="pb-2 font-medium">Any mention</th><th scope="col" className="pb-2 font-medium">Required</th><th scope="col" className="pb-2 font-medium">Preferred</th><th scope="col" className="pb-2 font-medium">Your evidence</th></tr></thead><tbody>{data.skills.slice(0, 10).map((skill) => <tr key={skill.skill} className="border-b border-border/60 last:border-0"><th scope="row" className="py-3 font-medium">{skill.skill}</th><td>{skill.frequencyPercent}%</td><td>{skill.requiredFrequencyPercent}%</td><td>{skill.preferredFrequencyPercent}%</td><td><Badge variant={skill.evidence === "Strong" ? "success" : skill.evidence === "Missing" ? "danger" : "neutral"}>{skill.evidence}</Badge></td></tr>)}</tbody></table></div>{data.recommendation && <p className="mt-5 rounded-md bg-accent p-4 text-sm text-accent-foreground"><strong>Recommendation:</strong> {data.recommendation}</p>}</CardContent></Card>;
}
