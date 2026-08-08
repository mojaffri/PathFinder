"use client";

import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RecordSectionProps<T extends { id: string }> {
  title: string;
  description?: string;
  records?: T[];
  onChange: (records: T[]) => void;
  createEmpty: () => T;
  renderSummary: (record: T) => { primary: string; secondary?: string };
  renderFields: (record: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  emptyLabel: string;
  addLabel: string;
}

/**
 * Shared editable list UI for structured resume/profile records (education,
 * experience, projects, awards, certifications). Each record renders as an
 * expandable card — collapsed shows a one-line summary, expanded shows real
 * form fields (never chips/tags for this kind of long-form structured data).
 */
export function RecordSection<T extends { id: string }>({
  title,
  description,
  records = [],
  onChange,
  createEmpty,
  renderSummary,
  renderFields,
  emptyLabel,
  addLabel,
}: RecordSectionProps<T>) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function updateRecord(id: string, patch: Partial<T>) {
    onChange(records.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRecord(id: string) {
    onChange(records.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function addRecord() {
    const record = createEmpty();
    onChange([...records, record]);
    setExpandedId(record.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addRecord}>
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>

      {records.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {records.map((record) => {
            const isOpen = expandedId === record.id;
            const summary = renderSummary(record);
            return (
              <div key={record.id} className="rounded-md border border-border bg-background">
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : record.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{summary.primary}</p>
                      {summary.secondary && <p className="text-xs text-muted-foreground">{summary.secondary}</p>}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => removeRecord(record.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {isOpen && (
                  <div className="flex flex-col gap-3 border-t border-border p-4">
                    {renderFields(record, (patch) => updateRecord(record.id, patch))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
