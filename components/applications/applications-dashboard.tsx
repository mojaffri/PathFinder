"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ApplicationForm, APPLICATION_STATUS_LABELS } from "@/components/applications/application-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { createApplication, deleteApplication, getApplications, updateApplication } from "@/services/application-service";
import { APPLICATION_STATUSES, type JobApplication, type JobApplicationInput } from "@/types";

export function ApplicationsDashboard() {
  const [items, setItems] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<JobApplication | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setItems(await getApplications()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load applications."); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    getApplications().then((next) => { if (!cancelled) setItems(next); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load applications."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => new Map(APPLICATION_STATUSES.map((status) => [status, items.filter((item) => item.currentStage === status).length])), [items]);

  async function save(input: JobApplicationInput) {
    setBusy(true);
    try {
      const result = editing === "new" ? await createApplication(input) : await updateApplication(editing!.id, input);
      setItems((current) => editing === "new" ? [result, ...current] : current.map((item) => item.id === result.id ? result : item));
      setEditing(null);
    } finally { setBusy(false); }
  }

  async function remove(item: JobApplication) {
    if (!window.confirm(`Remove ${item.title} at ${item.company} from your pipeline?`)) return;
    try { await deleteApplication(item.id); setItems((current) => current.filter((candidate) => candidate.id !== item.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove the application."); }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-primary">Application tracker</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Your application pipeline</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Keep the next action visible without turning your search into a CRM.</p></div>
        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add application</Button>
      </div>

      {editing && <Card className="mt-8"><CardHeader><CardTitle>{editing === "new" ? "Add an application" : `Edit ${editing.title}`}</CardTitle></CardHeader><CardContent><ApplicationForm initial={editing === "new" ? undefined : editing} onSave={save} onCancel={() => setEditing(null)} busy={busy} /></CardContent></Card>}

      {loading ? <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /><span className="sr-only">Loading applications</span></div> : error ? (
        <div role="alert" className="mt-8 rounded-lg border border-danger/30 bg-danger-bg p-6"><p className="font-medium text-danger">Applications could not be loaded</p><p className="mt-1 text-sm text-danger">{error}</p><Button className="mt-4" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" />Retry</Button></div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center"><h2 className="text-lg font-semibold">No applications yet</h2><p className="mt-2 text-sm text-muted-foreground">Add a role you’re considering. Start at Saved or Preparing and move it forward as things change.</p><Button className="mt-5" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add your first application</Button></div>
      ) : (
        <div className="mt-8 overflow-x-auto pb-4" aria-label="Application pipeline">
          <div className="grid min-w-[1100px] grid-cols-9 gap-3">
            {APPLICATION_STATUSES.map((status) => <section key={status} aria-labelledby={`stage-${status}`} className="rounded-lg bg-surface p-3"><div className="mb-3 flex items-center justify-between"><h2 id={`stage-${status}`} className="text-sm font-semibold">{APPLICATION_STATUS_LABELS[status]}</h2><Badge>{counts.get(status)}</Badge></div><div className="space-y-3">{items.filter((item) => item.currentStage === status).map((item) => <Card key={item.id} className="shadow-none"><CardContent className="p-3"><p className="text-sm font-semibold leading-snug">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.company}</p>{item.fitScore !== null && <p className="mt-2 text-xs">Fit at save: <strong>{item.fitScore}%</strong></p>}{item.notes && <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{item.notes}</p>}<div className="mt-3 flex gap-1"><Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label={`Edit ${item.title}`} onClick={() => setEditing(item)}><Pencil className="h-3.5 w-3.5" /></Button>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source posting for ${item.title}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface"><ExternalLink className="h-3.5 w-3.5" /></a>}<Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-danger" aria-label={`Remove ${item.title}`} onClick={() => void remove(item)}><Trash2 className="h-3.5 w-3.5" /></Button></div></CardContent></Card>)}</div></section>)}
          </div>
        </div>
      )}
    </div>
  );
}
