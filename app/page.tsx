import Link from "next/link";
import { Compass, Rocket, Map, SearchCheck, Target, GitBranch, Scale, ShieldCheck } from "lucide-react";
import { PathCard } from "@/components/landing/path-card";
import { TryDemoButton } from "@/components/landing/try-demo-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const HOW_IT_WORKS = [
  {
    icon: SearchCheck,
    title: "Tell us where you're starting",
    description:
      "A few minutes of questions about your interests, comfort with math and hands-on work, and what you actually want out of a career.",
  },
  {
    icon: Target,
    title: "Get a transparent match or roadmap",
    description:
      "A weighted, explainable match against real career data across fields, or a roadmap for the career you already have in mind.",
  },
  {
    icon: Map,
    title: "Follow a phase-by-phase plan",
    description:
      "Concrete academic priorities, portfolio projects, and interview preparation, sequenced so you know what to do next.",
  },
];

const TECHNICAL_DIFFERENTIATORS = [
  {
    icon: Scale,
    title: "Scores stay explainable",
    description: "Career and job-fit scores are deterministic. AI extracts structure from messy text, but it does not decide the ranking.",
  },
  {
    icon: GitBranch,
    title: "Claims require evidence",
    description: "Assessments, resume entries, and GitHub signals contribute different confidence levels instead of collapsing into a skill keyword list.",
  },
  {
    icon: ShieldCheck,
    title: "Plans stay reproducible",
    description: "Dependencies, priorities, effort, and target dates are scheduled by deterministic domain logic with a usable no-AI fallback.",
  },
] as const;

export default function HomePage() {
  const accountAccessAvailable = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="relative flex flex-col items-center overflow-hidden pb-7 pt-8 text-center sm:pb-8 sm:pt-10">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          Evidence-driven career readiness
        </span>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Find the career that fits you.
          <br />
          Then get unusually good at getting it.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          PathFinder turns a student&apos;s resume, projects, assessments, and saved jobs into
          explainable fit scores, evidence-backed skill gaps, and a roadmap they can act on.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline decoration-border-strong underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <h2 className="sr-only">Choose where to start</h2>
        <PathCard
          href="/discover"
          icon={Compass}
          accent="indigo"
          eyebrow="Not sure yet"
          title="Discover Your Path"
          description="Answer a short, structured questionnaire and get transparent, data-driven career matches."
          bullets={[
            "Weighted matching across 46 careers, from engineering to law to business",
            "Honest reality checks, not hype",
            "See salary, degree track, and competitiveness",
          ]}
          cta="Start discovering"
        />
        <PathCard
          href="/accelerate"
          icon={Rocket}
          accent="slate"
          eyebrow="Already know your target"
          title="Accelerate Your Path"
          description="Upload a resume or enter your background, and get a phase-by-phase roadmap to become a top candidate."
          bullets={[
            "Resume parsing with an editable review step",
            "Academic, portfolio, and interview phases",
            "Concrete milestones with real priorities",
          ]}
          cta="Build my roadmap"
        />
      </section>

      {accountAccessAvailable && (
        <aside className="flex items-center justify-center gap-1.5 pb-16 pt-3 text-xs text-muted-foreground" aria-label="Product demonstration">
          <span>Want to review a populated example?</span>
          <TryDemoButton
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-1 text-xs font-normal text-muted-foreground underline decoration-border-strong underline-offset-4 hover:bg-transparent hover:text-foreground"
          />
        </aside>
      )}

      <section className="border-t border-border py-20" aria-labelledby="decision-system-heading">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Not an LLM ranking engine</p>
          <h2 id="decision-system-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Structured AI at the edges. Deterministic decisions at the core.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The system separates uncertain extraction and feedback from the scoring, evidence, dependency, and scheduling logic a user should be able to inspect.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TECHNICAL_DIFFERENTIATORS.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-xl border border-border bg-panel p-6 shadow-sm">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
          How PathFinder works
        </h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-3">
          {HOW_IT_WORKS.map(({ icon: Icon, title, description }, index) => (
            <div key={title} className="flex flex-col">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface text-sm font-semibold text-muted-foreground">
                {index + 1}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
