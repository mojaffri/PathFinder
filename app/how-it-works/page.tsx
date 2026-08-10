import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, CircleX } from "lucide-react";
import { PublicContent } from "@/components/layout/public-content";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How It Works",
  description: "See how PathFinder turns profile evidence and job requirements into explainable fit results and a practical roadmap.",
};

const example = [
  { skill: "TypeScript", result: "Strong evidence", detail: "Two shipped projects and recent use", Icon: CheckCircle2, tone: "text-success" },
  { skill: "SQL", result: "Partial evidence", detail: "Coursework is present; applied project evidence is limited", Icon: CircleDashed, tone: "text-warning" },
  { skill: "AWS", result: "Missing evidence", detail: "The job asks for it, but the profile does not support it yet", Icon: CircleX, tone: "text-danger" },
];

export default function HowItWorksPage() {
  return (
    <PublicContent
      eyebrow="Transparent by design"
      title="See exactly how PathFinder reaches a recommendation"
      intro="AI helps organize unstructured text. The application’s scoring, evidence rules, skill dependencies, and roadmap scheduling remain deterministic and inspectable."
    >
      <section>
        <h2>The workflow</h2>
        <p>Profile → resume and projects → job requirements → evidence-backed fit → skill gaps → roadmap → assessments and progress.</p>
      </section>

      <section>
        <h2>A worked example</h2>
        <p className="mb-5">This illustrative software-engineering posting asks for TypeScript, SQL, and AWS. PathFinder compares each requirement with evidence in the user&apos;s own profile; it does not infer a skill from a job title alone.</p>
        <div className="grid gap-3">
          {example.map(({ skill, result, detail, Icon, tone }) => (
            <article key={skill} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
                <div>
                  <h3>{skill} — {result}</h3>
                  <p>{detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5"><strong>Recommended next step:</strong> build a small deployed AWS project and document the architecture. That closes a recurring gap with evidence an employer can inspect.</p>
      </section>

      <section>
        <h2>What AI does—and what it does not do</h2>
        <ul>
          <li>AI may extract structured fields from resumes and job descriptions or provide assessment feedback.</li>
          <li>Extracted output is validated before it is stored or scored.</li>
          <li>AI does not decide the numerical fit score, invent user evidence, or silently change roadmap dependencies.</li>
          <li>Every result is decision support, not a promise of admission, employment, salary, or licensing eligibility.</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/discover" className={buttonVariants()}>Find a career path <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link>
        <Link href="/faq" className={buttonVariants({ variant: "outline" })}>Read common questions</Link>
      </div>
    </PublicContent>
  );
}
