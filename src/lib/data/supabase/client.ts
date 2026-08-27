// The only module in this directory permitted to construct a client, and the only one that names
// `@supabase/supabase-js` (02-design.md 1.3). It also holds the two things every entity module in
// here needs and none of them may re-derive: the SQLSTATE table, and the `.rpc()` narrowing.
//
// `src/lib/data/supabase/**` is one of exactly two directories allowed to name a Supabase package —
// ADR-007 clause 3, `eslint.config.mjs`, and check D12's two-package map. The other is
// `src/lib/auth/**`, for `@supabase/ssr`, and neither exemption covers the other's package.
//
// NO SUPABASE TYPE LEAVES THIS DIRECTORY (RULE-02). The modules beside this one return the DTOs in
// `../types.ts` and nothing else.

import { createClient, type PostgrestError } from "@supabase/supabase-js";

import type { Database, Json } from "../../../../supabase/types.generated";

/**
 * ADR-007 clause 4: server-side only, so neither name carries `NEXT_PUBLIC_` — Next inlines only
 * prefixed variables into the browser bundle, and without the prefix the value cannot reach a
 * client component at all.
 *
 * An absent credential is a configuration error, not an expected failure: there is no caller-facing
 * refusal to return and nothing sensible to do without it (`coding-standards.md`, error handling).
 */
function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. The Supabase data adapter needs it; see .env.example.`);
  }
  return value;
}

/**
 * Verified against @supabase/supabase-js 2.112.4 `dist/index.d.mts:797` —
 * `createClient<Database>(supabaseUrl: string, supabaseKey: string, options?)`.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

/**
 * A MODULE-LEVEL SINGLETON, and `src/lib/auth/supabase.ts` deliberately is not. The auth client
 * closes over one request's cookie store, which is why its own comment forbids a singleton. This
 * client holds no session — the three `auth` options below are what guarantee that — so
 * per-request construction would buy nothing and cost a client per request.
 *
 * `SUPABASE_ANON_KEY`, NOT the service-role key. ADR-007 puts `SUPABASE_SERVICE_ROLE_KEY` in
 * `scripts/seed.ts` and *"to nothing else"*. The consequence is load-bearing and nothing else
 * records it: RLS is off (ADR-002), so the `anon` role reaches every table through the default
 * Postgres GRANTs alone. The first migration must therefore NOT revoke the default `anon` grants on
 * the `public` schema — and leaving them is exactly why the anon key must never carry a
 * `NEXT_PUBLIC_` prefix.
 *
 * THE RUNTIME OPENS NO POSTGRES CONNECTION. This speaks HTTP to PostgREST: a URL and a key, and no
 * connection string at all. That is why `DATABASE_URL` left the project entirely and only
 * `DIRECT_URL` — the migration connection, read by the CLI — survives.
 */
export function db(): ReturnType<typeof createClient<Database>> {
  // A runtime refusal, not a control. Lint and check D12 are the controls, and both live in files
  // the same pull request can edit (MD-33). It costs three lines and it turns a silent breach into
  // a thrown error. `src/lib/auth/supabase.ts` carries the same three for the same reason.
  if (typeof window !== "undefined") {
    throw new Error(
      "The Supabase data client was constructed in the browser. ADR-007 clause 4: every Supabase " +
        "client, for data as for auth, is constructed server-side only."
    );
  }
  if (cached === null) {
    cached = createClient<Database>(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return cached;
}

/**
 * Postgres SQLSTATEs the seam maps onto a reason code. 02-design.md 1.5.
 *
 * NO ADAPTER MAY MATCH ON `error.message`. The text is a Postgres locale string and matching it is
 * a test that passes until the day it does not. `PostgrestError.code` carries the SQLSTATE —
 * verified against @supabase/postgrest-js 2.112.4 `dist/index.d.mts:26-29` — and that is what every
 * refusal here reads.
 */
export const UNIQUE_VIOLATION = "23505";
export const FOREIGN_KEY_VIOLATION = "23503";
/**
 * The INV-05 constraint trigger's own SQLSTATE. `RAISE EXCEPTION` defaults to `P0001` for
 * everything, which would make INV-05 indistinguishable from any other raise in any other function;
 * Postgres reserves classes beginning `5`-`9` and `I`-`Z` for user-defined codes, so the migration
 * raises this one explicitly.
 */
export const INV05_VIOLATION = "INV05";

/**
 * WHY A BARE SQLSTATE IS ENOUGH TO NAME THE CONSTRAINT, AND WHY NO ADAPTER PARSES ONE.
 *
 * Each write path in this directory can reach exactly one unique constraint: `createRoom` and
 * `updateRoom` only `Room_code_key`, `createMember` and `updateMember` only `Member_email_key`,
 * `createDevice` and `updateDevice` only `Device_assetTag_key` — the patch types in `../types.ts`
 * carry no other unique column, and every `id` is minted with `crypto.randomUUID()`. So `23505` on
 * one of those calls has one meaning, and reading the constraint name out of `error.details` would
 * add a second thing that can be wrong for no information gained.
 *
 * `one_primary_device_per_seat` (INV-04) is the one unique index that is NOT mapped to a reason
 * code, and 02-design.md 1.5 says why: INV-04 is unreachable through the seam by construction —
 * `assignDeviceToSeat` forces SECONDARY, `updateDevice` cannot touch `rank`, and
 * `designatePrimaryDevice` demotes before it promotes inside one transaction. If it is ever raised
 * the write path is wrong, and the error propagates rather than becoming a refusal (RULE-07).
 */
export function isCode(error: { code: string } | null, code: string): boolean {
  return error !== null && error.code === code;
}

/**
 * The single narrowing point for every `.rpc()` call in this directory.
 *
 * The functions in `supabase/migrations/20260826094134_init.sql` each return ONE `jsonb` row whose
 * shape IS the outcome union in `../types.ts` — that is stated in the migration and it is why the
 * adapter narrows rather than re-derives. The cast here is where that agreement is asserted, once,
 * in a named place, instead of eight times inline.
 *
 * AN ERROR FROM AN RPC IS NOT A REFUSAL. Every refusal these functions can express is a value they
 * return; a `PostgrestError` means the function raised, which is a programmer error or a broken
 * migration, and RULE-07 says it propagates rather than being folded into a reason code.
 */
export function unwrapRpc<T>(data: Json | null, error: PostgrestError | null, fn: string): T {
  if (error !== null) {
    throw new Error(`${fn} failed: ${error.code} ${error.message}`);
  }
  if (data === null) {
    throw new Error(`${fn} returned no row. Its migration declares a non-null jsonb result.`);
  }
  return data as T;
}
