<div align="center">

# PathFinder

**Find the career that fits you. Then get unusually good at getting it.**

A full-stack TypeScript app that turns "I don't know what I want to do" or "I know my target but not how to get there" into a transparent, data-driven plan — and then a system for actually proving you're ready for it.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Zod](https://img.shields.io/badge/Zod-validated-3E67B1)](https://zod.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live demo](https://path-finder-umber.vercel.app/) &nbsp;·&nbsp; [Product spec](docs/SKILLFORGE_V1_SPEC.md) &nbsp;·&nbsp; [Run it locally](#running-locally)

</div>

---

## What it does

PathFinder is a career and academic roadmap engine with three connected products:

| | |
|---|---|
| **Discover** | An adaptive questionnaire scored by a deterministic, weighted-matching engine against a curated 46-career dataset spanning 9 categories — engineering, software, data/AI, biotech, healthcare, physical sciences, law, business, and policy. No LLM in the matching loop, so results are reproducible and explainable, not a black box. |
| **Accelerate** | Upload a resume (parsed via `unpdf` + AI extraction, with a regex/heuristic fallback when no AI key is present) or fill out a structured form. Either path produces the same profile shape, which is run through a deterministic gap-analysis engine to find prioritized, hour-costed gaps against what the target career actually rewards — then turned into a phase-by-phase roadmap, AI-generated when a key is available and always backed by a deterministic fallback generator when it isn't. |
| **SkillForge** | Not a course platform. A competency loop: diagnose what you can actually do → identify the specific gap → get pointed at a real external resource or practice activity → come back and take an AI-graded re-test on the same competency, with different questions → get root-cause failure diagnosis if you're still weak → have demonstrated mastery feed back into your roadmap's gap list as verified evidence. |

## Why this project is interesting

This isn't a CRUD app with an LLM bolted on. A few of the deliberate engineering decisions:

- **Deterministic where it matters, AI where it helps.** Career matching and gap analysis are pure, explainable scoring functions — you can trace exactly why a career matched or a gap was flagged. AI (Claude, via the Anthropic SDK) is used only where judgment genuinely helps: resume extraction, roadmap narrative generation, and grading open-response skill assessments — and every AI call is validated against a `zod` schema with structured tool-use extraction, never trusted raw.
- **The app never breaks without an API key.** Every AI-backed feature (resume parsing, roadmap generation, skill grading) has a fully-functional non-AI fallback. Missing key, network failure, or a malformed AI response all degrade to a deterministic path instead of crashing or blocking the user — verified by an explicit "AI unavailable" test scenario.
- **Anti-fabrication discipline, enforced structurally.** The app never invents resume metrics, project outcomes, or business impact — unverified claims stay as bracketed placeholders (`[quantify impact]`) the student has to fill in themselves. The same rule governs SkillForge's external resource links: a resource with no verified URL is shown without one rather than a guessed link.
- **"No fake progress" mastery model.** SkillForge tracks four dimensions (knowledge, ability, evidence, interview) with a six-level mastery ladder. Checking off every resource and exercise can only get you to a low ceiling — real credit comes from demonstrated performance on an AI-graded assessment or a reviewed project, and confidence in a score is computed from *how many* graded attempts back it, not the AI's own self-reported certainty.
- **Root-cause failure diagnosis, not "try again."** A weak assessment result walks backward through a skill's prerequisite chain (nearest-first, breadth-first) to find the smallest actual gap — e.g. correctly tracing a shaky "reading a p-value" answer in a finance module back to a shared `statistics-fundamentals` prerequisite, instead of telling the student to redo the whole module.
- **Storage designed for a backend that doesn't exist yet.** There's no database — everything lives in `localStorage` behind a thin service layer (`services/*`) that mirrors exactly the shape a future Supabase table would take, so swapping the persistence layer later touches one file per domain, not the UI.

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack, Server Components + API routes)
- **Language:** TypeScript, strict mode
- **UI:** React 19, Tailwind CSS v4, a small hand-rolled component library (`components/ui`)
- **Validation:** Zod, on every AI request/response boundary and API route
- **AI:** Anthropic SDK (Claude), server-only, structured tool-use extraction
- **Resume parsing:** `unpdf` (PDF → text) with a heuristic/regex extractor as the no-AI fallback
- **Persistence:** `localStorage`, behind a service layer designed for a drop-in Supabase migration
- **Tooling:** ESLint 9, `next build` + `tsc --noEmit` as a hard merge gate (no `@ts-ignore`/`eslint-disable` workarounds)

## Project structure

```
app/                    Routes: /discover, /accelerate, /skillforge, /saved, /profile, /api/*
components/              UI, grouped by feature (discovery, accelerate, roadmap, skillforge, profile, ui)
lib/
  matching/              Deterministic career-matching engine
  gap-analysis/          Deterministic gap-analysis engine
  roadmap/                AI + fallback roadmap generation, pacing math, per-career playbooks
  skillforge/             Mastery math, readiness checks, root-cause diagnosis, next-best-action
  resume/                 PDF text extraction, AI + heuristic structured extraction
  ai/                     Server-only Anthropic client
  storage/                localStorage abstraction (the only place that touches window.localStorage)
services/                Per-domain CRUD over the storage layer (profile, roadmap, SkillForge)
data/                    Curated career dataset and SkillForge skill-module catalog
types/                   Shared domain types
docs/                    Product spec + living "current state" doc
```

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No database or account needed — a profile is created and stored in your browser's `localStorage`.

AI features (resume extraction, AI-generated roadmaps, SkillForge assessment grading) are optional. Without a key, the app runs entirely on its deterministic fallback paths:

```bash
cp .env.example .env.local
# then set ANTHROPIC_API_KEY=... if you want the AI-backed paths
```

```bash
npm run build      # production build
npx tsc --noEmit   # type check
npm run lint       # lint
```

## License

MIT — see [LICENSE](LICENSE).
