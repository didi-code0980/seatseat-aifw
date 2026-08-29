// The one module in the `pnpm test:db` lane that holds a database handle. `02-design.md` section
// 6.4.
//
// IT SITS UNDER `scripts/` RATHER THAN UNDER `tests/`, AND THAT IS THE POINT OF IT. AC-11 asserts
// that the DATABASE refuses a write, not only that the application does, so it needs a path that is
// not the seam; AC-10 inspects the catalogue, which PostgREST cannot reach at all. Both need SQL. A
// file under `tests/db/` importing `@supabase/supabase-js` or a Postgres driver would be a LINT
// ERROR — `no-restricted-imports` restricts `@supabase/*` across the repository and
// `.ai/standards/integrations.md` exempts "the two paths in the table above and nothing else", a
// human-owned sentence this ticket may not edit. `eslint.config.mjs:92-101` already ignores
// `scripts/**` entirely, which is the same plane `scripts/seed.ts` uses for the same reason
// (ADR-007 OQ-3). So no lint exemption is added, D12's two-package map is untouched, and
// `integrations.md` stays true as written.
//
// EVERY EXPORT REFUSES A NON-LOOPBACK HOST, AND THAT REFUSAL IS A CONTROL RATHER THAN A COMMENT.
// `01-story.md` out-of-scope item 12 forbids any automated run and any CI job from reaching the
// live project. A mis-set URL therefore fails the lane instead of writing into a database whose
// migration carries no RULE-09 signature.
//
// The environment is put here by `scripts/test-db.mjs`, which reads it from the CLI's own
// `supabase status` and never hard-codes it. Nothing in this module reads `.env.local`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";

/** Set by `scripts/test-db.mjs` step 3. Not `.env.local`, and not a default. */
const URL_VAR = "SUPABASE_URL";
const SERVICE_KEY_VAR = "SUPABASE_SERVICE_ROLE_KEY";
const DB_URL_VAR = "SUPABASE_DB_URL";

/**
 * The whole of out-of-scope item 12, enforced. Loopback only — the CLI's local stack binds
 * 127.0.0.1, and every hosted Supabase project resolves to something else.
 *
 * It parses rather than pattern-matches: `https://evil.test/?x=127.0.0.1` contains the loopback
 * literal and is not a loopback host, and a substring check would let it through.
 */
function requireLoopback(raw: string, varName: string): string {
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new Error(
      `${varName} is not a URL: ${raw}. The test:db lane reads this from \`supabase status\`; ` +
        `if it is empty, the local stack was not running when scripts/test-db.mjs read it.`
    );
  }
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error(
      `${varName} points at ${host}, which is not the local stack. The test:db lane may only ever ` +
        `reach 127.0.0.1 — 01-story.md out-of-scope item 12 forbids any automated run from ` +
        `touching the live project, whose migration carries no RULE-09 signature.`
    );
  }
  return raw;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `${name} is not set. This module is only ever imported by a test the \`pnpm test:db\` runner ` +
        `started; running a file under tests/db/ with plain \`vitest\` skips step 3 and leaves the ` +
        `environment empty.`
    );
  }
  return value;
}

/**
 * A `@supabase/supabase-js` client on the LOCAL stack's service-role key.
 *
 * For the writes the seam refuses to make. With RLS off (ADR-002) the service-role key is simply
 * full read and write on every table, which is what lets AC-11 put a row past the application and
 * watch the database reject it on its own.
 *
 * The key belongs to a container that is recreated by `supabase db reset` on every run; it is not a
 * credential in the sense `.env.local` uses the word.
 */
export function serviceClient(): SupabaseClient {
  const url = requireLoopback(requiredEnv(URL_VAR), URL_VAR);
  return createClient(url, requiredEnv(SERVICE_KEY_VAR), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * One connection, opened on first use and reused. `postgres` pools internally; opening a second
 * handle per query would exhaust the local stack's connection limit across a file's worth of
 * catalogue assertions.
 */
let handle: ReturnType<typeof postgres> | undefined;

function db(): ReturnType<typeof postgres> {
  if (handle === undefined) {
    const url = requireLoopback(requiredEnv(DB_URL_VAR), DB_URL_VAR);
    handle = postgres(url, { max: 4, onnotice: () => {} });
  }
  return handle;
}

/**
 * A parameterised statement over the stack's DIRECT connection, returning its rows.
 *
 * `sql.unsafe` is the driver's parameterised raw-query entry point — verified against the installed
 * types, `postgres@3.4.9/types/index.d.ts:691`,
 * `unsafe<T>(query: string, parameters?: ..., queryOptions?: ...): PendingQuery<T>`. "Unsafe" names
 * the fact that the QUERY TEXT is not a tagged template, not that the PARAMETERS are interpolated:
 * `params` still travels out of band. Callers pass `$1`-style placeholders and never build a
 * predicate by concatenation.
 *
 * AC-10 reads the catalogue with it; AC-11 attempts the writes the invariants must refuse.
 */
export async function sql<Row extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<Row[]> {
  const rows = await db().unsafe(text, params as never);
  return rows as unknown as Row[];
}

/**
 * Empties the APPLICATION tables — each test file's starting point.
 *
 * It enumerates `public` from the catalogue rather than naming the eight tables, so a later
 * migration that adds one does not leave a stale list here reporting a clean database that is not.
 *
 * `auth.users` IS DELIBERATELY LEFT ALONE. Those rows belong to the identity provider, ADR-003 is
 * explicit that a Member outlives its login, and truncating a schema the CLI's own stack manages is
 * a way to break the container rather than to reset the fixture. `scripts/seed.ts` creates its auth
 * users through the admin API and is idempotent over them (AC-12).
 *
 * CASCADE because the eight tables reference each other; RESTART IDENTITY so a re-seeded row gets
 * the id the previous run's assertions named.
 */
export async function reset(): Promise<void> {
  const tables = await sql<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await sql(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * Closes the pooled connection. Vitest holds the process open on an idle socket, so a file that
 * called `sql()` and did not call this hangs the lane instead of failing it.
 */
export async function close(): Promise<void> {
  if (handle !== undefined) {
    await handle.end({ timeout: 5 });
    handle = undefined;
  }
}
