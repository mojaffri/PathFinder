// Test-only stand-in for the `server-only` package, aliased in
// vitest.config.mts. The real package throws when imported outside a
// Next.js server-component build (it detects Next's special module
// condition) — under plain Vitest there's no such condition, so importing
// it directly would throw for every test that touches a server-only module
// (lib/github/client.ts, lib/supabase/admin.ts, etc.) even though nothing
// unsafe is actually happening: Vitest only ever runs in a Node test
// process, never a browser bundle. This stub is a no-op.
export {};
