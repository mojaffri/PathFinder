"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { deleteResume, getResumes, reanalyzeResume, setActiveResume, uploadResume } from "@/services/resume-service";
import { mapResumeDataToProfileValues } from "@/lib/resume/map-to-profile";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import type { ResumeVersion, ResumeUploadResult } from "@/types";

/**
 * Upload history + version management, shown on the profile page — separate
 * from `components/accelerate/resume-upload.tsx` (the first-upload flow),
 * which only ever needs to hand its result to the review screen once.
 */
export function ResumeHistory({
  profileValues,
  onExtracted,
}: {
  profileValues: ProfileFormValues;
  onExtracted: (resumeData: ResumeUploadResult, initialValues: ProfileFormValues) => void;
}) {
  const [resumes, setResumes] = useState<ResumeVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      setResumes(await getResumes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load resume history.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    getResumes()
      .then((r) => {
        if (!cancelled) setResumes(r);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load resume history.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadResume(file);
      await refresh();
      onExtracted(data, mapResumeDataToProfileValues(data, profileValues));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong uploading that resume.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetActive(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await setActiveResume(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set that resume as active.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReanalyze(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const data = await reanalyzeResume(id);
      await refresh();
      onExtracted(data, mapResumeDataToProfileValues(data, profileValues));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't re-analyze that resume.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this resume version? This can't be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      await deleteResume(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that resume.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Resume history</CardTitle>
          <CardDescription>Every version you&apos;ve uploaded — pick which one is active or re-run extraction.</CardDescription>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleUpload(file);
          }}
        />
        <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload new version"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-danger">{error}</p>}

        {resumes === null ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No resumes uploaded yet.</p>
        ) : (
          resumes.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="text-sm">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    {r.fileName ?? "Untitled resume"}
                    {r.isActive && <Badge variant="accent">Active</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(r.uploadedAt).toLocaleDateString()} · {r.extractionMethod === "ai" ? "AI-extracted" : "Basic parsing"}
                    {r.extractionConfidence ? ` · ${r.extractionConfidence} confidence` : ""}
                    {!r.hasStoredFile && " · file not stored"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!r.isActive && (
                  <Button size="sm" variant="outline" onClick={() => handleSetActive(r.id)} disabled={busyId === r.id}>
                    Set active
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleReanalyze(r.id)} disabled={busyId === r.id} aria-label="Re-analyze">
                  {busyId === r.id ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} disabled={busyId === r.id} aria-label="Delete">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
