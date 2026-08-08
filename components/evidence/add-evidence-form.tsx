"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addManualEvidence } from "@/services/evidence-service";
import { EVIDENCE_SOURCE_TYPES } from "@/types";
import type { EvidenceStrengthLevel } from "@/types";

const STRENGTH_OPTIONS: { value: EvidenceStrengthLevel; label: string }[] = [
  { value: "weak", label: "Weak" },
  { value: "moderate", label: "Moderate" },
  { value: "strong", label: "Strong" },
];

export function AddEvidenceForm({ skillName, onDone, onCancel }: { skillName: string; onDone: () => void; onCancel: () => void }) {
  const [sourceType, setSourceType] = useState(EVIDENCE_SOURCE_TYPES[0].value);
  const [sourceLabel, setSourceLabel] = useState("");
  const [evidenceStrength, setEvidenceStrength] = useState<EvidenceStrengthLevel>("moderate");
  const [explanation, setExplanation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!sourceLabel.trim() || !explanation.trim()) {
      setError("Fill in both a label and a short explanation.");
      return;
    }
    setSaving(true);
    try {
      await addManualEvidence({
        skillName,
        sourceType,
        sourceLabel: sourceLabel.trim(),
        evidenceStrength,
        verificationStatus: "self-reported",
        explanation: explanation.trim(),
        occurredOn: null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that evidence.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Source type</Label>
          <Select value={sourceType} onChange={(e) => setSourceType(e.target.value as typeof sourceType)}>
            {EVIDENCE_SOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Strength</Label>
          <Select value={evidenceStrength} onChange={(e) => setEvidenceStrength(e.target.value as EvidenceStrengthLevel)}>
            {STRENGTH_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Label</Label>
        <Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder='e.g. "Published on Medium", "Letter from instructor"' />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Why this counts as evidence</Label>
        <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="A short, honest explanation — this is shown alongside the evidence, not hidden." />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Save evidence"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
