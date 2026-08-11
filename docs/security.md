# PathFinder — Security

## Authentication

**Provider:** Supabase Auth, via `@supabase/ssr` (cookie-based session, App Router-native). Supported sign-in methods, all working the moment they're enabled in the Supabase dashboard with no code changes:

- Email + password (`components/auth/login-form.tsx`, `signup-form.tsx`).
- Magic link (email OTP) — "Email me a sign-in link instead" on the login form.
- Password recovery (`/forgot-password` → email callback → authenticated `/reset-password`). The request response never reveals whether an email belongs to an account, and the reset session is signed out locally after the password changes.
- Google / GitHub OAuth (`components/auth/oauth-buttons.tsx`) — requires enabling the provider in Supabase's dashboard (Authentication → Providers) and setting the provider's own OAuth app credentials there; nothing in this repo needs to change.

**Session flow:**

1. `proxy.ts` (Next.js 16's renamed `middleware.ts` — see `node_modules/next/dist/docs/.../proxy.md`) runs on every request, refreshes the Supabase session cookie via `lib/supabase/middleware.ts`, and **server-side redirects** unauthenticated requests to protected route prefixes (`/dashboard`, `/accelerate`, `/skillforge`, `/profile`, `/saved`, `/onboarding`, `/jobs`, `/projects`) to `/login`. This is enforced before any page renders — a disabled or bypassed client-side check can never expose a protected page.
2. `lib/supabase/server.ts#getServerUser()` is the one function every API route calls to authorize a request — it re-validates the token against Supabase Auth (`auth.getUser()`, not `auth.getSession()`, which only decodes a JWT locally without verifying it hasn't been revoked).
3. OAuth/magic-link callbacks land on `app/auth/callback/route.ts`, which exchanges the code for a session server-side.

Production email authentication requires a custom SMTP sender configured in Supabase. The built-in sender is suitable only for initial testing and has strict rate limits. Signup requires confirmation that the user is at least 13 and accepts the public Terms and Privacy Notice; persisted age values are also constrained to 13–100 in both forms and the profile API.

**Account deletion** (`app/api/account/route.ts`): first removes the signed-in user's private resume objects, then uses the Supabase service-role admin client to call `auth.admin.deleteUser()`. The auth deletion cascades through `profiles` and every relational child. If file cleanup fails, the account is kept and the route returns a visible error rather than orphaning a document. Requires `SUPABASE_SERVICE_ROLE_KEY`; without it, account deletion returns a clear 503. This is distinct from `deleteProfile()` (clears profile data but keeps the login).

## Authorization: application layer + Row Level Security

This is the part of the design worth reading carefully before extending it, because the two layers protect against different failure modes and neither alone is sufficient.

**Layer 1 — application-layer scoping (the primary enforcement mechanism).** Every `repositories/*.ts` function takes a `userId` argument that route handlers populate **only** from `getServerUser()`, never from a client-supplied field in the request body. Repository queries filter by that user's own `profile_id` (resolved server-side, never trusted from the client).

**Layer 2 — Row Level Security (the backstop).** Every user-owned table has a Postgres RLS policy (`drizzle/migrations/0001_rls_policies.sql`) scoped to `auth.uid()`, and — this is the important, easy-to-get-wrong part — every one of those policies is declared with **`FORCE ROW LEVEL SECURITY`**, not just `ENABLE`. Here's why that specific detail matters:

> The app does not talk to Postgres through Supabase's PostgREST API (which would automatically forward the caller's verified JWT and enforce RLS for you). It connects **directly** to Postgres via Drizzle (`lib/db/client.ts`, `postgres.js`), using the same database role for every request. In Supabase, that role (`postgres`) typically **owns** every table it created via migrations — and Postgres skips RLS for a table's owner **unless** `FORCE ROW LEVEL SECURITY` is set. Without `FORCE`, every RLS policy in this schema would be silently decorative for the app's own queries.

Because the app sets `FORCE`, and because `lib/db/with-user-context.ts` sets the `request.jwt.claim.sub` session variable (mirroring exactly what Supabase's PostgREST layer would have set from a verified JWT) inside a transaction before every repository query, RLS is genuinely enforced against the app's own backend connection — not just against some hypothetical other client.

**Why bother with RLS at all if the application layer already scopes every query?** Defense in depth: RLS is what stops a bug in a repository function's own `WHERE` clause from becoming a real cross-user data leak. Concretely: `getRoadmap(userId, id)`'s SQL filters **only by `id`** — no `profile_id` condition at all in the query itself. Ownership enforcement there comes **entirely** from RLS. This is deliberate, not an oversight, and it's proven by a real test:

```ts
// tests/integration/rls-isolation.test.ts
const attackerRead = await getRoadmap(USER_B, saved.id); // saved.id belongs to USER_A
expect(attackerRead).toBeNull(); // fails if RLS is ever misconfigured or dropped
```

That test (and its siblings for `deleteRoadmap` and `skill_progress`) runs against a real embedded Postgres (pglite) with the actual migration files applied — see `tests/integration/db.ts`'s header comment for how the test harness avoids the superuser-always-bypasses-RLS trap (pglite's bootstrap connection is a true superuser, which would make every RLS test a false pass; the harness creates and switches to a non-superuser role first, mirroring Supabase's real `postgres` role).

**Reference tables (`careers`, `skill_modules`, `assessments`) are intentionally *not* forced.** They're world-readable (`SELECT ... USING (true)`) and writable only by whatever role owns them — in both the test harness and real Supabase, that's the same role the app/seed-scripts already connect as, so `scripts/seed-reference-data.ts` needs no special bypass path.

## Secrets

| Secret | Where it's read | Never appears in |
|---|---|---|
| `ANTHROPIC_API_KEY` | `lib/ai/anthropic-client.ts` (server-only) | client bundles, API responses |
| `AI_GATEWAY_API_KEY` / automatic `VERCEL_OIDC_TOKEN` | `lib/ai/anthropic-provider.ts` (server-only) | client bundles, API responses, logs |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` (server-only, marked with the `server-only` package so a stray client import fails the build) | client bundles |
| `DEMO_USER_PASSWORD` | `app/api/demo/login/route.ts` (server-only) | client bundles — the "Try Demo" button never sees the password, it just triggers a server-side sign-in |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both client and server | This one is *meant* to be public — it's Supabase's public anon key, safe by design (RLS is what actually protects data, not secrecy of this key) |
| `GITHUB_TOKEN` | `lib/github/client.ts` (server-only, via `server-only` package) | client bundles, API responses — used only to raise the app-wide GitHub API rate limit; carries no elevated access since only public repo data is ever read |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | `lib/github/token-crypto.ts` (server-only) | client bundles, API responses, logs — the raw key itself is never persisted anywhere, only used in-memory to encrypt/decrypt `github_connections.access_token_encrypted` |

## File upload validation (resumes: PDF + DOCX)

Enforced in `app/api/resume/route.ts` via `lib/resume/file-validation.ts`: an early `Content-Length` check rejects (413) requests whose declared size exceeds the cap before the body is buffered, a hard 8MB cap, an extension/MIME-type check, and — the layer that closes the previous known gap — a **magic-byte check** (`%PDF-` for PDF, the zip local-file signature `PK\x03\x04` for DOCX) that the file's actual bytes must match its declared type. A client-declared `Content-Type`/extension is never trusted as proof of file content on its own; a mismatch (including a renamed file of the other type) is rejected with a 422, not silently accepted. Every route that touches a resume also authorizes via `getServerUser()` first — resume upload/list/reanalyze/delete/set-active all require a signed-in session now (previously the upload endpoint was anonymous/stateless).

Validated PDFs are provided directly to the configured server-side AI provider as an in-memory document block so column layout and scanned/image-only pages can be read. The base64 bytes are never logged or returned to the browser; the same authenticated rate limit applies before the provider call. If AI is unavailable and the PDF has no readable text layer, the route returns a specific 422 instead of inventing or misplacing resume records.

## Demo mode

The "Try Demo" button (`components/landing/try-demo-button.tsx`) signs the browser in as a shared, clearly-labeled showcase account — no signup required. Design choices worth knowing:

- The demo password is **never sent to the client**. `app/api/demo/login/route.ts` reads `DEMO_USER_EMAIL`/`DEMO_USER_PASSWORD` from server-only env vars and calls `supabase.auth.signInWithPassword` using the same cookie-aware server client a real login uses — the resulting session is indistinguishable from a normal sign-in.
- The seeded account is flagged `profiles.is_demo = true` and shown with a visible "Demo" badge in the navbar plus a banner on the dashboard ("this data is seeded and reset periodically, not real") — labeled per the product requirement that demo data must never be mistaken for a real user's.
- `scripts/seed-demo.ts` populates the account entirely through the app's own real engines (`matchCareers`, `analyzeGaps`, `generateFallbackRoadmap`) and repositories — the seeded roadmap and career matches are genuinely computed, not hand-written copy, consistent with the project's anti-fabrication rule.
- **Known limitation:** because it's one shared account, concurrent demo visitors see and can modify the same data (e.g. two people clicking "Try Demo" at once share one SkillForge progress state). There's no session-scoped or auto-reset demo sandbox — re-running `npm run db:seed:demo` manually resets it. Acceptable for a portfolio/recruiter demo; would need a real per-visitor ephemeral account if demo traffic ever became meaningful.

## Resume file storage (Supabase Storage)

`lib/supabase/storage.ts` — a private `resumes` bucket (auto-created on first upload via the service-role client if it doesn't exist yet; no manual dashboard step required as long as `SUPABASE_SERVICE_ROLE_KEY` is set). Files are stored at `{profileId}/{resumeId}.{pdf|docx}` and are never served from a public URL — every download goes through `GET /api/resumes/[id]/file`, which re-verifies ownership via the RLS-backed `getResumeById()` lookup before minting a short-lived (5-minute) signed URL. If the service-role key isn't configured, uploads still succeed (text extraction and profile data aren't blocked) — only the original file isn't persisted, following the same optional-infrastructure convention as `ANTHROPIC_API_KEY`/`DATABASE_URL`.

## GitHub OAuth token handling

`github_connections.access_token_encrypted` is AES-256-GCM ciphertext (`lib/github/token-crypto.ts`), captured opportunistically in `app/auth/callback/route.ts` when a `supabase.auth.linkIdentity({ provider: "github" })` flow completes (see `components/github/connect-github-button.tsx`) — this reuses the app's *existing* Supabase Auth architecture rather than standing up a second, separate GitHub OAuth app. Only `read:user` scope is ever requested (no `repo` scope — every analysis, connected or not, only ever reads public GitHub data). The decrypted token is read server-side only (`getDecryptedGithubToken()` in `repositories/github-repository.ts`) to make an outbound GitHub API call on the student's behalf, and is never included in any API response — `GET /api/github/connection` returns only `{ connected, username, connectedAt }`. Full detail: [`github-integration.md`](./github-integration.md).

## Phase 4 hardening

- Resume extraction, job extraction, narrative-roadmap generation, and SkillForge evaluation require a verified session and consume an atomic per-profile database window before any external AI call. Rejections return 429 and `Retry-After`.
- Auth redirects pass through `safeRedirectPath()`; external, protocol-relative, and backslash targets are rejected.
- Next instrumentation emits structured errors to Vercel logs using only route/method/status/request IDs — never resume text, job descriptions, tokens, or request bodies.
- Global framing/sniffing/referrer/permissions headers are enabled. `npm audit --omit=dev` reports zero production vulnerabilities after upgrading Next.js to 16.3.0.

## Known gaps

See `project-state.md` → Known Issues for the full, current list. The security-relevant ones as of this phase:
- Profile-based throttling is not a replacement for Vercel Firewall/IP controls against pre-auth traffic.
- `activity_events` records meaningful product changes for analytics/auditability, not every read as a full access log.

## Privacy limitations

- When AI is enabled and invoked, the minimum required resume/job text or open assessment response is sent through the configured Anthropic endpoint (directly or through Vercel AI Gateway). For a PDF resume, the validated original document may also be sent so the provider can read visual layout or scanned pages. PathFinder does not include those bodies or document bytes in its logs.
- GitHub analysis reads public repository metadata, file paths, language totals, and selected manifests. It does not clone or execute code and never requests private-repository scope.
- Vercel Analytics records aggregate usage. PathFinder's `activity_events` records meaningful account changes, not document contents or a full access history.
- The recruiter demo is a shared account. Visitors should not enter personal information because other demo visitors may see shared changes until the next seed reset.
