"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CAREER_CATEGORIES, type CareerCategory } from "@/types";
import { CAREERS } from "@/data/careers";

const OTHER_CAREER_VALUE = "__other__";
const MAX_TARGET_CAREERS = 5;

/**
 * Multiple target careers, entered from the curated career list plus
 * free-text for anything not listed — students building a versatile resume
 * across more than one path add each one as its own chip. When a target
 * field is chosen upstream, the list narrows to just that field's careers
 * instead of the full grouped-by-category list.
 */
export function TargetCareerSelect({
  values = [],
  onChange,
  targetCategory = null,
}: {
  values?: string[];
  onChange: (values: string[]) => void;
  targetCategory?: CareerCategory | null;
}) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const safeValues = values || [];
  const atLimit = safeValues.length >= MAX_TARGET_CAREERS;

  function addCareer(title: string) {
    const trimmed = title.trim();
    if (!trimmed || safeValues.includes(trimmed) || atLimit) return;
    onChange([...safeValues, trimmed]);
  }

  function removeCareer(title: string) {
    onChange(safeValues.filter((v) => v !== title));
  }

  function commitCustom() {
    addCareer(customDraft);
    setCustomDraft("");
    setAddingCustom(false);
  }

  return (
    <div>
      {safeValues.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {safeValues.map((title) => (
            <span
              key={title}
              className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground"
            >
              {title}
              <button
                type="button"
                aria-label={`Remove ${title}`}
                onClick={() => removeCareer(title)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {addingCustom ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              }
            }}
            placeholder="Enter a target career"
            className="flex-1"
          />
          <Button type="button" variant="secondary" onClick={commitCustom} disabled={!customDraft.trim()}>
            Add
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setAddingCustom(false); setCustomDraft(""); }}>
            Cancel
          </Button>
        </div>
      ) : (
        <Select
          value=""
          disabled={atLimit}
          onChange={(e) => {
            if (e.target.value === OTHER_CAREER_VALUE) {
              setAddingCustom(true);
            } else if (e.target.value) {
              addCareer(e.target.value);
            }
          }}
        >
          <option value="">
            {atLimit
              ? `Up to ${MAX_TARGET_CAREERS} target careers`
              : targetCategory
                ? "Add a target career..."
                : "Select a target field above, or browse all fields..."}
          </option>
          {targetCategory ? (
            CAREERS.filter((c) => c.category === targetCategory)
              .filter((c) => !safeValues.includes(c.title))
              .map((c) => (
                <option key={c.id} value={c.title}>
                  {c.title}
                </option>
              ))
          ) : (
            CAREER_CATEGORIES.map((category) => (
              <optgroup key={category.value} label={category.label}>
                {CAREERS.filter((c) => c.category === category.value)
                  .filter((c) => !safeValues.includes(c.title))
                  .map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
              </optgroup>
            ))
          )}
          <option value={OTHER_CAREER_VALUE}>Other / not listed</option>
        </Select>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">
        {safeValues.length > 1
          ? "Your roadmap will prioritize skills and projects that count toward more than one of these."
          : targetCategory
            ? "Add more than one, even from a different field, if you want a versatile resume that's competitive across several paths."
            : "Add more than one if you want a versatile resume that's competitive across several paths."}
      </p>
    </div>
  );
}
