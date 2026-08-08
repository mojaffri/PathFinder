# PathFinder — GitHub Integration

How PathFinder turns a GitHub repository into deterministic skill evidence. Design reference for `lib/github/*`, `repositories/github-repository.ts`, and `app/api/github/*`. For how repo signals feed into a skill's overall confidence, see [`evidence-model.md`](./evidence-model.md).

---

## Two ways in, both fully real

1. **Analyze a public username or `owner/repo`** — no sign-in to GitHub required at all. `GET /api/github/lookup?username=X` lists a public account's repos; `POST /api/github/import` analyzes and saves a specific one. This is the primary path and works for every student, including one who's never connected anything.
2. **Connect a GitHub account** — reuses the app's *existing* Supabase Auth architecture rather than standing up a second, separate OAuth app. The "Connect GitHub" button (`components/github/connect-github-button.tsx`) calls `supabase.auth.linkIdentity({ provider: "github", options: { scopes: "read:user" } })`, which attaches a GitHub identity to the student's current session without changing who they're signed in as. `app/auth/callback/route.ts` — the same route that already handles every OAuth/magic-link sign-in — is where the resulting `provider_token` is captured and persisted (see "Token security" below). Connecting buys two things: a higher GitHub API rate limit (5,000/hr vs. 60/hr unauthenticated) and a "pick from my own repos" picker (`GET /api/github/lookup` with no `username`) — it does **not** unlock private-repo access, since the app only ever requests `read:user` scope and only ever analyzes public data.

Both paths call the exact same deterministic analysis pipeline (`lib/github/analyze-repo.ts`) — a connected account doesn't get a different, richer analysis, just a friendlier rate limit.

## What's actually detected

`lib/github/detectors.ts` runs seven deterministic detectors against a repo's file tree (`GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`) and a handful of known manifest files' parsed contents (`lib/github/manifest-parse.ts` — `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Gemfile`, `Cargo.toml`):

| Detector | Looks for |
|---|---|
| README | A root-level `README`/`README.md`/etc. |
| Testing | `__tests__`/`tests`/`spec` directories, known test-runner config files (`jest.config.*`, `vitest.config.*`, `pytest.ini`, …), or test-framework dependencies (`jest`, `vitest`, `pytest`, `playwright`, …) |
| CI/CD | `.github/workflows/*.yml` |
| Docker | `Dockerfile`, `docker-compose.yml`/`compose.yml` |
| Deployment | `vercel.json`, `netlify.toml`, `fly.toml`, `render.yaml`, `Procfile`, plus Docker files |
| Database | Known DB/ORM dependencies (`prisma`, `drizzle-orm`, `@supabase/supabase-js`, `pg`, `sqlalchemy`, …) or `prisma/schema.prisma`/`drizzle.config.*`/a `migrations/` directory |
| Backend/API | Known backend framework dependencies (`express`, `fastify`, `next`, `fastapi`, `flask`, `django`, …) or an `app/api`/`pages/api`/`routes/` directory |

Every detector returns `{ detected, confidence, evidence[] }` — `evidence` is the literal list of files/dependencies that triggered it, never a bare "yes." Language mix comes straight from GitHub's own `/languages` endpoint (byte counts → percentages), not detected separately.

### What's intentionally NOT used as a signal

Per the task's explicit instruction: **stars, forks, and commit/follower counts are shown as metadata only** (`RepoMetadata` in `types/github.ts`) and never feed a detector's confidence, a skill's evidence strength, or the overall repo summary. A repo with zero stars and a real test suite reads as stronger evidence than a 10,000-star repo with none — popularity is not engineering quality.

This also is not, and doesn't attempt to be, real static analysis: it never parses source code (only file paths and a few manifest files), never runs the code, and never checks whether tests actually pass. "Do not attempt perfect static analysis" — the detectors are intentionally shallow, file-tree-and-manifest-level checks, and every result names exactly what was found so a student (or recruiter) can verify it themselves.

## From signals to skills

`lib/github/map-to-skills.ts` turns the detectors' output into named skill evidence: each language above a 3% share becomes a skill (strength scaled by share — ≥40% is `strong`), a detected testing setup becomes "Automated Testing" evidence, a detected database dependency becomes "Database / Persistence" (plus the specific technology, e.g. "Drizzle ORM", "PostgreSQL", via a small dependency→skill name table), and so on. This is where `lib/evidence/confidence.ts` picks the evidence up as one input to a skill's overall confidence score (see `evidence-model.md`).

## Where AI is (and isn't) used

The only AI call in this entire pipeline is `lib/github/narrative.ts`'s one-sentence recruiter-style summary ("This project provides strong evidence of X, Y, and Z…"). It receives ONLY the already-computed deterministic facts (which skills, at what strength, what wasn't detected) and is explicitly instructed never to reference anything else — never stars/forks, never a skill that wasn't passed in. Falls back to a deterministic template sentence (`deterministicSummary()`) whenever `ANTHROPIC_API_KEY` isn't configured or the call fails, same guaranteed-fallback contract as every other AI path in this app.

## Rate limits and failures

`lib/github/client.ts` wraps every GitHub REST call and normalizes failures into a `GithubError` with `{ status, message, isRateLimit, retryAfterSeconds }`:
- **404** → a clean "not found — check the username/repository" message (never a raw parse error).
- **403 with `X-RateLimit-Remaining: 0`, or 429** → `isRateLimit: true`, with `retryAfterSeconds` computed from `X-RateLimit-Reset` (or `Retry-After` when GitHub sends it) — `app/api/github/*` routes surface this as a structured JSON body (`lib/api/with-github-error-handling.ts`) so the UI can show "try again in N minutes" instead of a generic error.
- **Network failure** → wrapped in the same `GithubError` type rather than letting a raw fetch rejection reach the client.
- **Empty/new repo** (no tree, no languages) → the analysis still succeeds; every detector just reports `detected: false`.

## Token security

- `github_connections.access_token_encrypted` is AES-256-GCM ciphertext (`lib/github/token-crypto.ts`), never plaintext. The encryption key (`GITHUB_TOKEN_ENCRYPTION_KEY`, a base64-encoded 32-byte key) is optional infrastructure — without it, `encryptToken()` returns `null` and the connect flow simply doesn't persist a token (the "Connect GitHub" click still completes the identity link with Supabase, it just isn't remembered for later API calls). Every other GitHub feature keeps working regardless.
- The decrypted token is only ever read server-side (`getDecryptedGithubToken()` in `repositories/github-repository.ts`) to make an outbound GitHub API call on the student's behalf — it is never included in any API response body. `GET /api/github/connection` returns only `{ connected, username, connectedAt }`.
- **Minimum scope**: `read:user` only. This app never requests `repo` scope and never reads private repository data, by design — every analysis, connected or not, only ever touches public GitHub data.
- **Disconnect**: `DELETE /api/github/connection` deletes the encrypted token row outright. Previously analyzed repos are kept (their `connectionId` becomes `NULL` via `ON DELETE SET NULL`) — the analysis itself is still valid evidence; only the ability to re-analyze at the higher rate limit or list "my repos" again goes away until reconnected.
- Row Level Security (`FORCE ROW LEVEL SECURITY`, same pattern as every other user-owned table — see `docs/security.md`) protects `github_connections`, `github_repos`, and `skill_evidence_records` identically to the rest of the schema.

## Known limitations

- No real revocation call to GitHub's own token-revocation endpoint on disconnect (only the local encrypted copy is deleted) — GitHub's OAuth apps don't require this for read-only, non-`repo`-scoped tokens the way a write-scoped integration would, but a future session could add it for defense-in-depth.
- `linkIdentity` requires GitHub to actually be enabled as a provider in the Supabase dashboard (same one-time manual step already required for "Continue with GitHub" sign-in) — until then, clicking "Connect GitHub" surfaces Supabase's own "provider not enabled" error, which is expected, not a bug.
- The file-tree fetch is capped at whatever GitHub's `recursive=1` endpoint returns before truncating (~100,000 entries) — an enormous monorepo may get a partial view; detectors still run on whatever was returned rather than erroring out.
