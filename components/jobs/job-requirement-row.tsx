"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { JobRequirement } from "@/types";

const CATEGORY_OPTIONS: JobRequirement["category"][] = ["required", "preferred"];
const KIND_OPTIONS: JobRequirement["kind"][] = ["skill", "tool", "experience", "education"];

/** One editable row in the requirements review table — every field editable/removable per the "manually correct incorrectly extracted job requirements" requirement. */
export function JobRequirementRow({
  requirement,
  onChange,
  onRemove,
}: {
  requirement: JobRequirement;
  onChange: (next: JobRequirement) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_9rem_8rem_5rem_2.5rem] items-center gap-2">
      <Input
        value={requirement.label}
        onChange={(e) => onChange({ ...requirement, label: e.target.value, source: "manual" })}
        aria-label="Requirement label"
      />
      <Select
        value={requirement.category}
        onChange={(e) => onChange({ ...requirement, category: e.target.value as JobRequirement["category"], source: "manual" })}
        aria-label="Category"
      >
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c === "required" ? "Required" : "Preferred"}
          </option>
        ))}
      </Select>
      <Select
        value={requirement.kind}
        onChange={(e) => onChange({ ...requirement, kind: e.target.value as JobRequirement["kind"], source: "manual" })}
        aria-label="Kind"
      >
        {KIND_OPTIONS.map((k) => (
          <option key={k} value={k}>
            {k[0].toUpperCase() + k.slice(1)}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        min={0}
        value={requirement.minYears ?? ""}
        placeholder="yrs"
        onChange={(e) => onChange({ ...requirement, minYears: e.target.value === "" ? null : Number(e.target.value), source: "manual" })}
        aria-label="Minimum years"
        disabled={requirement.kind !== "experience"}
      />
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label="Remove requirement">
        <Trash2 className="h-4 w-4 text-danger" />
      </Button>
    </div>
  );
}
