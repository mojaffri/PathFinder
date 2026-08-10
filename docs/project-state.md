# PathFinder — Project state

Read this after [`CLAUDE.md`](../CLAUDE.md). This document is the current operational source of truth; it is intentionally not a session-by-session changelog. Durable design rationale lives in [`architecture.md`](architecture.md) and [`adr/`](adr/).

## Current status

PathFinder is in final portfolio/recruiter polish. The core product, persistence, authentication, deterministic scoring, AI boundaries, demo data, CI, and production deployment exist. The current release candidate focuses on accurate technical storytelling, demo reliability, security cleanup, and evidence-backed claims.

Production: [https://path-finder-umber.vercel.app/](https://path-finder-umber.vercel.app/)

Repository: [https://github.com/mojaffri/PathFinder](https://github.com/mojaffri/PathFinder)

## Architecture summary

```text
Next.js App Router UI
  → authenticated/validated route handlers
    → deterministic domain engines
    → Drizzle repositories
      → user-scoped Postgres transactions
        → Supabase Postgres with forced RLS

Optional external boundaries:
  Supabase Auth + private Storage
  Anthropic structured AI provider
  GitHub public REST API
  Vercel Analytics + structured runtime logs
```

Supabase Auth owns identity. Drizzle owns 34 application tables and 11 migrations through `0010`. Repositories are the exclusive database boundary. Every protected repository call runs with the verified Supabase subject in a transaction-local claim, and forced RLS provides defense in depth.

## Implemented product

### Career discovery and profile

- Deterministic weighted matching over 46 curated careers in 9 categories.
- Questionnaire explanations and a separate confirmed-profile fit breakdown.
- Progressive persisted onboarding and editable profile data.
- Target roles, target date, weekly capacity, education, experience, projects, skills, awards, and certifications.

### Resume system

- PDF and DOCX upload with 8 MB limit, extension/MIME validation, and magic-byte verification.
- AI structured extraction with Zod validation and one malformed-output retry.
- Conservative heuristic fallback when AI is absent or unavailable.
- Editable review, active-version selection, re-analysis, version history, and private original-file storage.
- Ownership-checked downloads through five-minute signed URLs.

### Job analysis and saved-job insights

- Paste-based job-description analysis; URL scraping is intentionally not a dependency.
- Required/preferred skill, tool, experience, and education requirements stored as editable rows.
- Deterministic requirement-by-requirement fit, component scores, evidence, and prioritized gaps.
- Persisted fit snapshots for before/after comparison.
- Saved-job frequency and evidence coverage scoped only to the signed-in user's saved jobs, explicitly not global labor-market research.

### Evidence and GitHub

- Evidence dimensions: claimed, assessed, demonstrated, and professional.
- Deterministic confidence bands with source strength and verification status.
- Public GitHub username/repository import without OAuth.
- Optional GitHub identity connection through Supabase with AES-256-GCM token encryption.
- Seven deterministic repository detectors: README, tests, CI, Docker, deployment, database, and backend/API.
- Stars, forks, followers, and commit volume remain metadata and never increase skill confidence.
- Project linkage uses persisted project IDs and rejects nonexistent or cross-user targets before the database update.

### SkillForge and assessments

- Ten seeded skill modules and twenty diagnostic/assessment definitions.
- Multiple-choice, true/false, code-output, structured, and open-response questions.
- Deterministic grading where possible and validated rubric-based AI grading for subjective responses.
- Knowledge, ability, evidence, and interview dimensions with a six-level mastery ladder.
- Recency-weighted attempts, age decay, inconsistency penalties, and prerequisite root-cause diagnosis.

### Adaptive roadmap

- Skill dependency graph with cycle detection.
- Tasks derived from profile gaps and recurring saved-job requirements.
- Deterministic priority from severity, recurrence, evidence confidence, and dependency position.
- Capacity-aware scheduling from effort, weekly availability, prerequisites, and target date.
- Impossible-deadline messaging, completed-history preservation, and change events.
- Narrative roadmap retains a deterministic fallback when AI is unavailable.
- Reader-first roadmap templates use concrete actions and treat career names as labels instead of inserting role titles into generic sentence frames. Quality coverage checks all 598 career/stage combinations plus every career's reviewable-work goal for banned jargon and known grammar failures.

### Product layer

- Actionable dashboard using persisted target, readiness, roadmap, jobs, evidence, application, and activity data.
- Longitudinal analytics based only on stored snapshots/events; no fabricated backfill.
- Focused nine-stage application tracker: saved, preparing, applied, phone screen, interview, final round, rejected, offer, withdrawn.
- Responsive Workspace navigation that consolidates Projects, Job Fit, Applications, and Saved.
- Explicit loading, empty, error, retry, and authentication states across major async surfaces.
- Shared demo account with labeled, engine-generated showcase data and a one-click entry point.

## Parsing reliability — 2026-08-10

- Resume fallback parsing recognizes common alternate section names for work history, projects/portfolio, education, skills, credentials/licenses, and honors.
- Date parsing supports hyphen/en-dash/em-dash/`to` ranges, seasons, and `Present`/`Current`/`Now`; stacked title, organization, location, and date layouts are reassembled into one experience record.
- Education parsing handles institution-first and degree-first layouts, including separate major, GPA, and date lines. Certifications are now populated by the deterministic fallback instead of being silently discarded.
- Project repository URLs found on the line below a project title are retained as project links, and a broader set of bullet markers and skill separators is normalized.
- Job fallback parsing recognizes inline or alternate qualification/responsibility headings, separates required from preferred language sentence by sentence, keeps responsibility-only technologies out of requirements, and stores explicit experience/education requirements as typed rows.
- A deterministic generated corpus exercises 18 varied resume layouts and 18 varied job-posting layouts, plus stacked/unheaded/ambiguous boundary cases. Structured-AI tests use mocks and never call a paid provider.
- Extracted data still enters the editable confirmation flow and remains unverified until the user confirms it. The corpus materially reduces routine corrections but does not claim perfect parsing for every possible PDF or posting format.
- Quality gate for this parser release: lint/typecheck/build clean; 208 unit tests, 39 integration tests, 266 total Vitest tests, and 9 local Playwright smoke checks passed (7 configured-account/device-specific cases skipped as expected).

## Security posture

- Email/password, magic link, Google OAuth, and GitHub OAuth are enabled in production through Supabase Auth.
- Protected page routes redirect server-side; protected APIs verify `getServerUser()` independently.
- Application-level ownership checks plus forced RLS are tested against embedded Postgres using the real migrations and a non-superuser role.
- AI-cost routes use atomic per-profile Postgres rate-limit windows before external calls.
- Resume uploads validate declared and actual file type.
- OAuth/provider secrets are server-only; connected GitHub tokens are encrypted at rest.
- Structured logs exclude document bodies, tokens, and request payloads.
- Account deletion removes private resume objects before deleting the Auth user and relational data; file-cleanup failure aborts deletion visibly.
- Security headers deny framing/sniffing and limit browser capabilities.

See [`security.md`](security.md) for threat boundaries and privacy limitations.

## Observability and analytics

- `instrumentation.ts` and `lib/observability/logger.ts` emit structured route/server/database/storage/external-service failures to Vercel logs.
- AI telemetry records feature, provider/model, latency, retries, parse outcome, and token counts when supplied—never prompt or document bodies.
- Vercel Analytics is enabled for aggregate page usage.
- `activity_events` records meaningful product changes for analytics and auditability; it is not a full access log.

## Interface polish — 2026-08-10

- The existing PathFinder logo remains the product mark across the shared navigation and authentication surfaces.
- Light and dark themes share one semantic token system, with restrained navy/indigo dark surfaces and accessible success, warning, danger, focus, and muted-text states.
- Theme selection is available at the top right on desktop and mobile, persists in a same-site cookie, follows the operating-system preference on first visit, and is applied before paint to avoid theme flash.
- The landing page keeps its existing focused content hierarchy instead of adopting a denser dashboard-style hero. Editorial heading typography, calmer panels, consistent form controls, and subtle depth improve polish without adding page clutter.
- The landing page's first desktop view now leads directly into Discover and Accelerate—the two real user journeys. Sign-in remains nearby, while the populated demo is deliberately presented as a quiet reviewer aid below those choices rather than the primary call to action.
- Desktop and mobile visual checks cover the landing, Discover, and sign-in surfaces in both themes. Playwright now verifies theme persistence and serious/critical WCAG A/AA violations after a theme change.

## CI and quality gate

`.github/workflows/ci.yml` runs on pull requests and pushes to `main` with read-only repository permissions, per-ref concurrency cancellation, and a 20-minute timeout:

```text
npm ci
→ lint
→ typecheck
→ unit tests
→ embedded-Postgres integration tests
→ production build
→ Playwright Chromium install
→ desktop/mobile smoke tests
```

CI never calls a paid AI provider and does not need production Supabase credentials. Integration tests apply the real migrations to PGlite. Configured demo journeys are opt-in through `E2E_DEMO=1` and `PLAYWRIGHT_BASE_URL`.

## Production verification — 2026-08-10

```text
npm run lint             → clean
npm run typecheck        → clean
npm run test:unit        → 166 passed (21 files)
npm run test:integration → 39 passed (6 files)
npm test                 → 224 passed (32 files)
npm run build            → clean; Next.js 16.3.0; 42 prerendered page slots
npm run test:e2e         → 9 passed, 7 environment/device-specific cases skipped
production demo E2E      → 10 passed, 2 device-inapplicable cases skipped
```

The production Playwright run covered one-click demo authentication and populated dashboard, profile/onboarding, resume, job analysis, adaptive roadmap, SkillForge, application tracker, and analytics surfaces on desktop and mobile. The shared-account run is intentionally serial to avoid cross-context token rotation. The public matrix also covers protected-route behavior, responsive navigation, keyboard behavior, and serious/critical axe violations.

- GitHub Actions: [run 31369022449](https://github.com/mojaffri/PathFinder/actions/runs/31369022449) passed install, lint, typecheck, unit, integration, build, and Playwright checks for commit `0ee320a6`; the matching CodeQL run also passed.
- Vercel production deployment: [commit deployment](https://path-finder-x4j2hwbev-mojaffris-projects.vercel.app) completed successfully and is aliased to the public URL.
- Post-deploy desktop/mobile smoke: 9 public checks passed and 7 environment/device-specific cases skipped; no browser-visible server errors occurred.
- Lighthouse on the public landing page: performance 98, accessibility 100, best practices 100, SEO 100.
- Production dependency audit: zero high-severity production vulnerabilities.

## Repository hygiene and GitHub security — 2026-08-10

- Reachable Git history contains no high-confidence credential patterns or sensitive-looking tracked filenames.
- Generated output, local environment files, test reports, coverage, and Vercel state are ignored and absent from the repository.
- All relative Markdown links resolve; README feature counts match the implementation (46 careers, 9 categories, 34 application tables).
- GitHub Dependabot alerts/security updates, secret scanning, push protection, private vulnerability reporting, and CodeQL default setup are enabled; the initial CodeQL and secret scans reported zero alerts.
- CI setup actions are pinned to immutable reviewed release commits; the workflow retains read-only repository permissions.

## Production configuration

Production Vercel currently has:

- Supabase URL and public key;
- pooled `DATABASE_URL` using the least-privilege runtime role;
- service-role key for private Storage and account deletion;
- Google and GitHub auth flags/providers;
- demo account credentials;
- GitHub token-encryption key.

`ANTHROPIC_API_KEY` and a server-wide `GITHUB_TOKEN` are optional; deterministic fallbacks/public unauthenticated GitHub limits remain supported.

Supabase migrations `0000` through `0010`, reference data, and the shared demo account are seeded in production.

## Known limitations and risks

1. The demo is one shared mutable account. Concurrent visitors can see each other's demo changes until a reseed.
2. Dedicated exception tracing/alerting such as Sentry is not integrated; structured Vercel logs are the current error-monitoring surface.
3. GitHub analysis inspects public structure and selected manifests, not source correctness, runtime behavior, or whether tests pass.
4. The legacy gap-analysis engine has broad indirect roadmap-quality coverage but less direct, isolated test coverage than newer domain engines.
5. Profile-based rate limiting does not replace platform/IP controls for pre-auth abuse.
6. AI-backed narrative quality is provider-dependent; fallback output is deliberately conservative.
7. The product is decision support, not a hiring probability, guaranteed outcome, or global labor-market dataset.
8. Transactional auth email delivery depends on the production SMTP sender configured in Supabase; the repository cannot provision those external credentials.

## Launch essentials — 2026-08-10

- Added complete password recovery with enumeration-safe request copy, PKCE callback exchange, authenticated password update, and local-session sign-out.
- Added signup acceptance for the Terms and Privacy Notice plus a consistent 13+ account boundary enforced in forms and the profile API.
- Added public Privacy, Terms, FAQ, and transparent How It Works pages without adding more content above the landing-page fold.
- Added a recruiter- and user-friendly footer, improved 404 recovery, public-route sitemap, private-route crawler exclusions/noindex metadata, corrected page-title composition, and a branded social preview image.
- Added Playwright coverage for the trust pages, footer links, crawler files, metadata title, and password-recovery entry point.

## Next three improvements

1. Replace the shared demo user with an isolated, expiring per-visitor sandbox.
2. Add dedicated error tracing/alerts and service-level production checks on top of structured logs.
3. Add direct property/table tests around `lib/gap-analysis/engine.ts` before evolving its weights or taxonomy.

## Documentation map

- [`architecture.md`](architecture.md) — current component and trust boundaries
- [`database.md`](database.md) — setup, migrations, schema groups, ER diagram
- [`scoring.md`](scoring.md) — deterministic scoring systems and non-goals
- [`evidence-model.md`](evidence-model.md) — evidence dimensions and confidence formula
- [`github-integration.md`](github-integration.md) — OAuth/public analysis, detectors, token handling
- [`skill-graph.md`](skill-graph.md) — dependency graph
- [`roadmap-engine.md`](roadmap-engine.md) — adaptive priority, scheduling, adaptation
- [`assessments.md`](assessments.md) — grading and mastery
- [`ai-system.md`](ai-system.md) — provider boundary and fallbacks
- [`security.md`](security.md) — auth, authorization, uploads, privacy, deletion
- [`recruiter-guide.md`](recruiter-guide.md) — five-minute demo, resume bullets, interview talking points
- [`adr/`](adr/) — durable architecture decisions
- [`implementation-plan.md`](implementation-plan.md) — historical phased plan
