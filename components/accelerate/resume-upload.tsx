"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { uploadResume } from "@/services/resume-service";
import type { ResumeUploadResult } from "@/types";

export function ResumeUpload({
  onExtracted,
  onSkip,
}: {
  onExtracted: (data: ResumeUploadResult) => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const data = await uploadResume(file);
      onExtracted(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong parsing that resume.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-dashed border-border-strong px-8 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Upload className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Upload your resume</h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          We&apos;ll pull out your education, skills, and experience, and you&apos;ll be able to review and
          correct everything before it&apos;s used. PDF or DOCX, up to 8MB.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
        className="hidden"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError(null);
        }}
      />

      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {file.name}
        </div>
      ) : (
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          Choose PDF or DOCX file
        </Button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        {file && (
          <Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            Choose a different file
          </Button>
        )}
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          {isUploading && <Spinner />}
          {isUploading ? "Parsing resume..." : "Upload & Parse"}
        </Button>
      </div>

      <button type="button" onClick={onSkip} className="text-sm text-muted-foreground hover:underline">
        Skip, I&apos;ll enter my information manually
      </button>
    </div>
  );
}
