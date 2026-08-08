"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIAdvantageSection as AIAdvantageSectionType, AIWorkflowTemplate } from "@/types";

function TemplateItem({ template }: { template: AIWorkflowTemplate }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium text-foreground">{template.name}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="mt-3 flex flex-col gap-1.5">
          {template.steps.map((step, i) => (
            <li key={step} className="flex gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AIAdvantageSection({ advantage }: { advantage: AIAdvantageSectionType }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle>AI Advantage</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{advantage.summary}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            How to use AI seriously here
          </p>
          <ul className="flex flex-col gap-1.5">
            {advantage.useCases.map((useCase) => (
              <li key={useCase} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {useCase}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reusable workflow templates
          </p>
          <div className="flex flex-col gap-2">
            {advantage.templates.map((template) => (
              <TemplateItem key={template.name} template={template} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
