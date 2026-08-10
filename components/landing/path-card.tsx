import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PathCardProps {
  href: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  accent: "indigo" | "slate";
}

export function PathCard({ href, icon: Icon, eyebrow, title, description, bullets, cta, accent }: PathCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-panel p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg",
          accent === "indigo" ? "bg-accent text-accent-foreground" : "bg-surface text-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

      <ul className="mt-6 flex flex-col gap-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {bullet}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center gap-1.5 text-sm font-medium text-primary">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
