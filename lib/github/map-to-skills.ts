import type { DetectedSignal, EvidenceStrengthLevel, RepoLanguageBreakdown } from "@/types";

/**
 * Turns a repo's OBJECTIVE, already-detected signals into skill evidence
 * candidates. Every entry here traces back to something `lib/github/
 * detectors.ts` or the languages API actually found — this file never adds
 * new inference, it only relabels detected facts as named skills with a
 * strength and a reason. AI is intentionally not used here (see
 * `lib/github/narrative.ts` for where AI actually adds value — interpreting
 * the repo's free-text description, not this).
 */

const DEP_TO_SKILL: Record<string, string> = {
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle ORM",
  "@supabase/supabase-js": "Supabase",
  pg: "PostgreSQL",
  psycopg2: "PostgreSQL",
  "psycopg2-binary": "PostgreSQL",
  mysql2: "MySQL",
  mongoose: "MongoDB",
  pymongo: "MongoDB",
  sqlalchemy: "SQLAlchemy",
  redis: "Redis",
  express: "Express.js",
  fastify: "Fastify",
  koa: "Koa",
  next: "Next.js",
  fastapi: "FastAPI",
  flask: "Flask",
  django: "Django",
  "@nestjs/core": "NestJS",
  jest: "Jest",
  vitest: "Vitest",
  pytest: "pytest",
  playwright: "Playwright",
  cypress: "Cypress",
  "@testing-library/react": "React Testing Library",
};

export interface SkillSignal {
  skill: string;
  strength: EvidenceStrengthLevel;
  reason: string;
}

function dedupeStrongest(signals: SkillSignal[]): SkillSignal[] {
  const rank: Record<EvidenceStrengthLevel, number> = { weak: 0, moderate: 1, strong: 2 };
  const byName = new Map<string, SkillSignal>();
  for (const signal of signals) {
    const key = signal.skill.toLowerCase();
    const existing = byName.get(key);
    if (!existing || rank[signal.strength] > rank[existing.strength]) byName.set(key, signal);
  }
  return [...byName.values()];
}

export function mapRepoSignalsToSkills(input: {
  languages: RepoLanguageBreakdown[];
  detectedSignals: DetectedSignal[];
  manifestDeps: string[];
}): SkillSignal[] {
  const signals: SkillSignal[] = [];

  for (const lang of input.languages) {
    if (lang.percentage < 3) continue; // trivial presence (a config file in another language) isn't real evidence
    const strength: EvidenceStrengthLevel = lang.percentage >= 40 ? "strong" : lang.percentage >= 15 ? "moderate" : "weak";
    signals.push({ skill: lang.language, strength, reason: `${lang.percentage}% of this repository's code is ${lang.language}.` });
  }

  const byKey = new Map(input.detectedSignals.map((s) => [s.key, s]));

  const testing = byKey.get("testing");
  if (testing?.detected) {
    signals.push({
      skill: "Automated Testing",
      strength: testing.confidence === "high" ? "strong" : "moderate",
      reason: `Detected ${testing.evidence.slice(0, 3).join(", ")}.`,
    });
  }

  const database = byKey.get("database");
  if (database?.detected) {
    signals.push({
      skill: "Database / Persistence",
      strength: database.confidence === "high" ? "strong" : "moderate",
      reason: `Detected ${database.evidence.slice(0, 3).join(", ")}.`,
    });
  }

  const backend = byKey.get("backendApi");
  if (backend?.detected) {
    signals.push({
      skill: "Backend / API Development",
      strength: backend.confidence === "high" ? "strong" : "moderate",
      reason: `Detected ${backend.evidence.slice(0, 3).join(", ")}.`,
    });
  }

  const docker = byKey.get("docker");
  if (docker?.detected) {
    signals.push({ skill: "Docker", strength: "strong", reason: `Detected ${docker.evidence.slice(0, 2).join(", ")}.` });
  }

  const cicd = byKey.get("cicd");
  if (cicd?.detected) {
    signals.push({ skill: "CI/CD", strength: "moderate", reason: `Detected ${cicd.evidence.slice(0, 2).join(", ")}.` });
  }

  for (const dep of input.manifestDeps) {
    const skill = DEP_TO_SKILL[dep];
    if (skill) signals.push({ skill, strength: "moderate", reason: `"${dep}" is a direct dependency.` });
  }

  return dedupeStrongest(signals);
}
