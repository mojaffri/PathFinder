import { Compass, Rocket, Map, SearchCheck, Target } from "lucide-react";
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

export default function HomePage() {
  const accountAccessAvailable = isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="flex flex-col items-center py-20 text-center sm:py-28">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          Career & Academic Roadmap Engine
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Find the career that fits you.
          <br />
          Then get unusually good at getting it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          PathFinder helps students who don&apos;t know what career fits them discover a
          strong match, and helps students who already know their target become genuinely
          competitive for it, across engineering, tech, law, medicine, business, and beyond.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <TryDemoButton size="lg" />
          <p className="text-xs text-muted-foreground">
            {accountAccessAvailable
              ? "No signup — explore a fully populated profile, roadmap, and SkillForge progress."
              : "Career discovery is available now; account features are temporarily unavailable."}
          </p>
        </div>
      </section>

      <section className="grid gap-6 pb-24 sm:grid-cols-2">
        <PathCard
          href="/discover"
          icon={Compass}
          accent="indigo"
          eyebrow="Not sure yet"
          title="Discover Your Path"
          description="Answer a short, structured questionnaire and get transparent, data-driven career matches."
          bullets={[
            "Weighted matching across 30+ careers, from engineering to law to business",
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
