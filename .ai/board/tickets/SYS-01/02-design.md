---
ticket: SYS-01
stage: DESIGN
agent: tech-lead-design
produced_at: 2026-08-24T08:47:49Z
inputs_read: [ .ai/board/tickets/SYS-01/ticket.yaml, .ai/board/tickets/SYS-01/01-story.md, .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/standards/testing-standards.md, .ai/standards/session-model.md, .ai/01-operating-model.md, .ai/templates/tech-design.md, .ai/board/tickets/SEA-01/02-design.md, CLAUDE.md, package.json, pnpm-workspace.yaml, tsconfig.json, eslint.config.mjs, .env.example, scripts/check-docs.mjs, scripts/check-allowed-paths.mjs, .github/workflows/verify.yml, docker/docker-compose.yml, src/lib/auth/auth.ts, src/lib/auth/client.ts, src/lib/auth/permissions.ts, src/app/api/auth/[...all]/route.ts, src/app/(auth)/login/page.tsx, src/components/shared/PermissionGate.tsx, tests/unit/permissions.test.ts, tests/e2e/smoke.spec.ts, node_modules/next/dist/server/request/cookies.d.ts, node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.d.ts ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---

# SYS-01 — Replace Better Auth with Supabase Auth — technical design

First version. All seven sections complete, `allowed_paths` enumerated and written back to
`ticket.yaml`, `size` set to `M`.

Nine findings are raised and none of them blocks this gate. Section 0 states each in full, because
this document has to stand alone (RULE-16). Four are answers to the questions `01-story.md` asked
DESIGN to answer — `Q-1` through `Q-4` — and every one of them is answered by running something,
not by reasoning about it.

**`schema_delta` stays `none` and `requires_adr` stays `false`.** The registry row is explicit that a
schema conclusion here would be *a finding to raise, not a decision to take*; nothing in this design
needs one. The registry is not amended by this document. `H-1` in the story remains open and is a
human's (RULE-01).

**The one finding that decided whether this ticket is deliverable at all is F-2**, and it was settled
by installing the package in a throwaway directory and typechecking against it rather than by
reading documentation. Read that one first.

---

## 0. Findings, and what they do to this stage

### F-2 — `@supabase/ssr` has a peer dependency on `@supabase/supabase-js`, and AC-3 survives it

**This is the finding that could have blocked the ticket.** AC-3 requires that *no other package
whose name begins `@supabase/` appears in `dependencies`, `devDependencies` or `peerDependencies`*
and names `@supabase/supabase-js` as the one to watch. ADR-006 decision 6 says the same:
*`@supabase/ssr` is the only Supabase package.*

`@supabase/ssr@0.12.4` declares `"peerDependencies": { "@supabase/supabase-js": "^2.111.0" }`. Its
type surface is not optional about it either — `createServerClient` is declared as returning
`SupabaseClient<Database, SchemaName>`, imported from `@supabase/supabase-js`
(`dist/module/createServerClient.d.ts:1`).

pnpm 10 auto-installs peer dependencies. So the question is whether that installation lands somewhere
AC-3, AC-4 and check D12 can see, and whether TypeScript can resolve the types without the package
being declared here.

**Settled by doing it.** A throwaway directory, `pnpm add @supabase/ssr` on the same pnpm 10.15.1 this
repository pins, then a typecheck under this project's exact `compilerOptions`:

| Observation | Result |
|---|---|
| `package.json` after the add | `"dependencies": { "@supabase/ssr": "^0.12.4" }` — and nothing else |
| `node_modules/@supabase/` | contains `ssr` only |
| `node_modules/.pnpm/` | contains `@supabase+supabase-js@2.112.3` and its own dependencies, linked into `@supabase+ssr@0.12.4_@supabase+supabase-js@2.112.3` |
| The lockfile | records `supabase-js`, as it records every transitive package |
| `tsc --noEmit` on a probe calling `createServerClient` | **exit 0**, with 52 supabase type files pulled into the program |

The probe was proved to be genuinely compiled — a deliberate type error was injected and `tsc`
reported it — so the exit 0 is a real result and not an empty program.

**Consequences, all four of them decided here:**

1. **AC-3 holds as written.** `@supabase/supabase-js` never appears in this repository's
   `package.json`. It is a transitive package in pnpm's virtual store, which is where every one of
   the ~400 other transitive packages already lives.
2. **Check D12 passes.** `scripts/check-docs.mjs:552-565` reads `package.json`'s three dependency
   fields and nothing else; `@supabase/ssr` is its `ALLOWED_SUPABASE_PKG`. AC-6 is satisfiable.
3. **The lint restriction still covers the browser client.** `eslint.config.mjs` restricts the group
   `["@supabase/*", "@supabase/*/**"]`, which includes `@supabase/supabase-js` — so even though the
   package is resolvable from the virtual store, importing it anywhere outside `src/lib/auth/**` is a
   build failure, and D12's `src/**` scan (`scripts/check-docs.mjs:604-615`) repeats the same refusal
   in the audit.
4. **A hard rule for the implementation: no source file in this repository may name
   `@supabase/supabase-js`.** The return type of the factory in 1.2 is **inferred, never annotated**.
   Annotating it would require `import type { SupabaseClient } from "@supabase/supabase-js"`, which is
   legal under the lint exemption inside `src/lib/auth/**` and is exactly the drift ADR-006 decision 6
   forbids. `tsconfig.json` sets `noEmit: true` and no `declaration`, so an inferred cross-module
   return type raises none of the "cannot be named" errors that declaration emit would — verified in
   the same probe.

Nothing is routed to `ba` from this finding. AC-3 needs no amendment; it is correct as written and
this design records why it is satisfiable.

### F-1 — `Q-1` answered: the login page never referenced Better Auth, and it changes for a different reason

`01-story.md` `Q-1` asks whether the login page needs any change beyond ceasing to reference
`src/lib/auth/client.ts`, and records that this is a `src/**` fact the story may not read.

Read. `src/app/(auth)/login/page.tsx` imports exactly two things:

```ts
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
```

**It has no import of `src/lib/auth/client.ts`, no `signIn` call, and no `"use client"` directive.**
ADR-006's own description is accurate: *a static form, no handler wired to it*. Deleting `client.ts`
(AC-2) breaks nothing on this page.

The page is nevertheless in `allowed_paths`, **for the flag and not for Better Auth** — AC-10 needs
the resolved self-signup setting to be observable on this route, which is F-7.

Routed to `ba` as a RULE-14 amendment for one word: `Q-1` can be closed as *no*.

### F-3 — `Q-2` answered: the flag's key, storage shape, values, and the hydration constraint

`01-story.md` `Q-2` correctly refuses to name any of these — they are contract items under RULE-04.
Section 1.3 is the contract. Three decisions inside it are worth pulling out here because each one is
a way the criterion could be satisfied wrongly:

1. **The values are `"enabled"` and `"disabled"`, not `true`/`false`.** A boolean-shaped string
   invites `Boolean(localStorage.getItem(key))`, which is `true` for the string `"false"`. AC-10 is a
   fail-closed criterion and the most likely way to break it is a truthiness test on a string.
2. **Anything that is not exactly `"enabled"` resolves to `"disabled"`.** Absent, empty, misspelled,
   `"ENABLED"`, a thrown `SecurityError` from a browser with site data blocked, and server-side
   rendering where there is no `window` — all disabled. That is `A-1` implemented rather than
   assumed.
3. **The notice must not read storage during the first client render.** The server renders with no
   `window`, so it renders `disabled`; a client component that read `localStorage` in its render body
   would produce a different first client render whenever the flag is set, and React 19 treats that
   as a hydration mismatch. AC-10's *the page does not error on the missing value* and AC-11's
   *the page renders* both fail on it. The contract therefore fixes the shape: initial state
   `"disabled"`, resolved in `useEffect`. **This is the single most likely implementation defect in
   this ticket.**

### F-4 — `Q-3` answered: two variables, neither `NEXT_PUBLIC_`, and `.env.example` says something that becomes false

`01-story.md` `Q-3` asks which environment variables the server-side client needs and whether
`.env.example` changes.

Two: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (section 1.2). **Neither carries the `NEXT_PUBLIC_`
prefix, and that is the mechanism for AC-4's fourth clause** — *no Supabase key, URL or token is
emitted to the browser as a data credential*. Next inlines `NEXT_PUBLIC_*` into the client bundle at
build time; a variable without the prefix is unreadable from client code by construction, which makes
that clause a property of the naming rather than a promise about discipline.

`.env.example` changes, and not only by addition. Its ADR-002 block currently reads:

> Supabase Auth, RLS, realtime and storage are out of scope. Authentication is Better Auth. There is
> no SUPABASE_URL and no anon key here on purpose: nothing in this application talks to Supabase
> except Prisma, over Postgres.

Every sentence of that is false after this ticket. It is not stale prose to tidy later: it names the
exact variable this ticket adds and explains why it is absent. A developer reading it would conclude
the new variable was a mistake. Section 1.5 specifies the replacement, and the whole
`BETTER_AUTH_*` block goes with the package (AC-1's spirit — a variable for a package that no longer
exists is a value someone sets and nothing reads).

### F-5 — `Q-4` answered: yes, `pnpm-lock.yaml` is enumerated, and it is not optional

AC-1 requires *the lockfile records no `better-auth`* and AC-3 requires `@supabase/ssr` to be
installed. Neither is reachable without the lockfile changing, and `scripts/check-allowed-paths.mjs`
fails the pull request on any changed file the list does not match. It is entry 2 in section 5.

### F-6 — `docker/docker-compose.yml` carries three `BETTER_AUTH_*` variables, and this ticket does not touch it

`docker/docker-compose.yml:26-28` passes `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and
`NEXT_PUBLIC_BETTER_AUTH_URL` into the application container. After this ticket they name a package
that is not installed, and one of them puts a `NEXT_PUBLIC_` variable for a deleted auth provider
into the production image's environment.

**It is deliberately absent from `allowed_paths`.** No criterion covers it — AC-1 scopes its
assertions to `package.json`, the lockfile, `src/` and `tests/` — and `docker/` is the `devops`
agent's surface by the agent definitions, not the loop's. Widening a ticket into a neighbouring
agent's directory to fix three lines nothing asserts about is scope drift, and the honest form of
noticing it is to say so here.

**Routed to `devops` as a chore, with the change written out so it arrives complete:** delete the
three `BETTER_AUTH_*` lines and add `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the shape section 1.5
gives `.env.example`. It should land *after* SYS-01 merges, because until then the variables are
correct.

### F-7 — AC-10 is vacuous unless the resolved flag state is rendered, so this design renders it

AC-10 reads: *Given a browser with no value stored for the self-signup configuration flag / When I
open the login route / Then the application treats self-signup as disabled / And no control that
creates an account appears / And the page does not error on the missing value.*

Every clause of that is satisfied by a login page that **has never heard of the flag**. There is no
account-creation control today (AC-9 passes against the current page, unedited — verified), and a
page that reads nothing cannot error on a missing value. AC-11 has the same property. So as written,
the criterion set cannot distinguish a flag that defaults closed from a flag that does not exist,
which is precisely the trap `01-story.md` names in its own opening section and then falls into.

**This design closes it by rendering the resolved setting** as `login-self-signup` (section 6), and
by publishing the storage key and its two values to QA so the enabled branch is constructible. AC-10
then asserts *the page reports `disabled` when nothing is stored*, and AC-11 asserts *the page
reports `enabled` and still offers no account-creation control* — two observations that a missing
implementation fails.

The rendered value is the **setting**, never a control and never a claim. AC-12 is not endangered by
it: a page that displays `enabled` while offering nothing to enable is the honest rendering of a
configuration surface that ships ahead of the thing it configures, which is exactly what `A-2` says
this is. Section 7 alternative C is the version that renders nothing, and why it was rejected.

Routed to `ba` as a RULE-14 amendment: AC-10 and AC-11 each gain a clause naming the reported state.
It does not block — the criteria are correct as written and become checkable rather than different.

### F-8 — the sizing rule does not say whether the ticket's own artifact folder counts as a file, and this is the first ticket on the boundary

`allowed_paths` holds thirteen entries. Twelve are files; the thirteenth is
`.ai/board/tickets/SYS-01/**`. The sizing table in `.ai/01-operating-model.md` reads *M — up to 12*
and *L — more than 12, must split at DESIGN*, and does not say which count it means. Twelve is M;
thirteen is L, and L is a mandatory split.

**Position: the artifact glob is not a file for sizing, and the ground is verified rather than
argued.** `scripts/check-allowed-paths.mjs:113` reads:

```js
if (f === ticketDir || f.startsWith(`${ticketDir}/`)) return false;
```

The ticket's own directory is exempt from the check **unconditionally**, before any glob is tested.
Listing it in `allowed_paths` grants no permission the script does not already give; it is
documentation, not a permission. A line that authorises nothing cannot be a unit of work.

Two supporting arguments, neither load-bearing on its own. Every ticket carries the glob, so counting
it would mean the S band's real ceiling is five and the table would never say so. And the operating
model's split heuristics — *by operation, then by surface, then by role* — are all about
implementation; artifacts do not split.

**`size` is therefore `M`, at the ceiling with zero headroom.** Section 5 records what that means for
the Developer.

Routed to the **steward** as model debt, not to `ba`: the sizing table needs one sentence saying which
entries count. SYS-01 is the first ticket to land on the boundary, and the next one to land there will
have to re-derive this from the same script.

### F-9 — `pnpm build` cannot run in the design lane, so AC-8 is the build lane's to verify

`pnpm typecheck`, `pnpm lint` and `pnpm test` were run in `aiw-work` while writing this document and
are green — 61 tests in 4 files, `eslint .` clean, `tsc --noEmit` clean, and `node
scripts/check-docs.mjs` reporting `errors: 0 warnings: 0 pending: 0`. That is the AC-8 baseline and it
is recorded so *no test that passed before this change fails after it* has a before.

`pnpm build` fails here, and not because of the code:

```
Symlink [project]/node_modules is invalid, it points out of the filesystem root
```

`aiw-work/node_modules` is a symlink to `aiw/node_modules`, and Turbopack refuses to resolve through
it. This is a property of the design lane's worktree, not of the repository — the build lane owns a
real `node_modules` at the symlink's target.

**Consequence for QA, and it belongs in section 6.2 rather than in a comment nobody reads:** AC-8's
`pnpm verify` must be run in the **build lane** (`aiw`). A verify run from `aiw-work` fails at the
build step against unmodified `main`, and reporting that as an AC-8 failure would be reporting the
worktree.

---

## 1. Contract

Copy-pasteable and complete. Every name that will appear in the code appears here first (RULE-04);
the Developer may not invent one.

`tsconfig.json` sets `verbatimModuleSyntax: true`, so every type-only import below is written
`import type`. It also sets `strict` and `noUncheckedIndexedAccess`, which is why the environment
reads below narrow rather than assert.

### 1.1 What is deleted

Three files, and the directory one of them lives in:

```
src/lib/auth/auth.ts                 delete   the betterAuth() instance, disableSignUp, nextCookies
src/lib/auth/client.ts               delete   createAuthClient, signIn, signOut, useSession
src/app/api/auth/[...all]/route.ts   delete   toNextJsHandler(auth) — and the empty `api/auth/`
                                              directory goes with it, per AC-2's "no route handler
                                              exists anywhere under src/app/api/auth/"
```

`src/lib/auth/permissions.ts` **stays and is not opened** (AC-2's last clause, AC-7). It is the file a
bulk `rm -rf src/lib/auth` would take, and AC-2 exists because that is the plausible mistake.

`better-auth` leaves `package.json`'s `dependencies`. Nothing else leaves it.

### 1.2 The server-side Supabase client — `src/lib/auth/supabase.ts` (new)

```ts
// The one place a Supabase client is constructed (ADR-006 decision 4, OQ-1, OQ-4).
//
// Server-side only. `src/lib/data/` is still the only path to data, which is the premise ADR-002
// rested on when it left Row Level Security off — and it stays true only while no Supabase client
// exists in the browser. `eslint.config.mjs` exempts exactly this directory from the `@supabase/*`
// restriction; the exemption is a permission to construct the client here, not a permission to ship
// it anywhere.
//
// NO FILE IN THIS REPOSITORY MAY NAME `@supabase/supabase-js` (02-design.md F-2). It arrives as a
// peer of `@supabase/ssr` and resolves from pnpm's virtual store; naming it here would put a second
// Supabase package in `package.json`, which AC-3 forbids and check D12 fails on. The return type of
// `createSupabaseServerClient` is therefore INFERRED and must never be annotated.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** ADR-006 OQ-1: server-side only, so neither name carries `NEXT_PUBLIC_` (02-design.md F-4). */
function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  // An absent credential is a configuration error, not an expected failure: there is no caller-facing
  // refusal to return and nothing sensible to do without it. `coding-standards.md` reserves typed
  // refusals for failures a person can act on at the point of the call.
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. Supabase Auth needs it; see .env.example.`);
  }
  return value;
}

/**
 * Constructs a request-scoped Supabase client.
 *
 * `cookies()` returns a Promise in Next 16 — verified in
 * `node_modules/next/dist/server/request/cookies.d.ts:2` — so this is async, and it may only be
 * called from a server component, a route handler or a server action.
 *
 * A NEW CLIENT PER REQUEST. `@supabase/ssr` says so in terms and the reason is not stylistic: the
 * client closes over one request's cookie store, so a module-level singleton would serve one user's
 * session to the next.
 *
 * THIS FUNCTION HAS NO CALLER IN THIS TICKET, and that is the specified state rather than dead code
 * left behind. `01-story.md` out-of-scope item 2 puts sign-in, sign-out and sessions in the `AUT`
 * group: no session is established, no cookie is set, no route is guarded. What SYS-01 delivers is
 * the constructor and the configuration around it.
 */
export async function createSupabaseServerClient() {
  // The guard the lint exemption cannot give. `src/lib/auth/**` is the one directory permitted to
  // import `@supabase/*`, so a `"use client"` file placed here would put the client in the browser
  // legally — AC-4's third clause, and 01-story.md out-of-scope item 10's second bullet, which
  // records that nothing automatic closes it. This does not close it either: it is a runtime refusal,
  // not a check. It costs three lines and it turns a silent breach into a thrown error.
  if (typeof window !== "undefined") {
    throw new Error(
      "createSupabaseServerClient() was called in the browser. ADR-006 OQ-1: the Supabase client is " +
        "constructed server-side only."
    );
  }

  const store = await cookies();

  return createServerClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        // `ReadonlyRequestCookies` is `Omit<RequestCookies, "set" | "clear" | "delete"> &
        // Pick<ResponseCookies, "set" | "delete">` — verified in
        // node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.d.ts:5 — so
        // `set` exists on the type and throws at runtime when called from a server component.
        // Swallowing that is the documented pattern: a middleware refreshes the session instead, and
        // this ticket has no middleware because it has no session (out-of-scope item 2).
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
        } catch {
          // Called from a server component. Nothing to do and nothing to report.
        }
      },
    },
  });
}
```

**`TODO(verify):` two things, both at implementation time and both against the installed package
rather than against documentation** — `CLAUDE.md` requires this for anything past reliable recall,
and `@supabase/ssr` is:

1. **The `options` type in `store.set(name, value, options)`.** Supabase's `CookieOptions` is
   `Partial<SerializeOptions>` from the `cookie` package; Next's `ResponseCookies.set` takes
   `Partial<ResponseCookie>`. They agree on every field this uses and may disagree on an edge such as
   `priority`. If `tsc` objects, map the fields explicitly — **do not cast to `any`**, which would
   hide a real divergence behind the one construct that stops the compiler asking.
2. **That `createServerClient`'s three-argument shape is still what the installed `.d.ts` declares.**
   It was read at `@supabase/ssr@0.12.4`,
   `dist/module/createServerClient.d.ts` — `createServerClient(supabaseUrl, supabaseKey, options)`
   where `options.cookies` is `{ getAll, setAll }`. The deprecated `{ get, set, remove }` overload is
   also declared and **must not be used**; the package's own type comment says it will be removed.

The probe that produced F-2 compiled exactly this call shape under this project's `compilerOptions`
and exited 0.

### 1.3 The self-signup flag — `src/lib/auth/self-signup.ts` (new)

`01-story.md` `Q-2` leaves the key, the storage shape and the values to DESIGN. This is them.

```ts
// The self-signup configuration flag (ADR-006 decision 7, OQ-2).
//
// WHAT THIS IS NOT: a control. `localStorage` is browser storage — the value sits on the machine of
// the person it restrains, and one line in a developer console changes it with no server-side trace.
// ADR-006 records that the operator chose this mechanism against the steward's recommendation, and
// records the consequence in terms: under this decision INV-08 is held by nothing that survives an
// adversary. MD-14 carries the gap and its fix shape. AC-12 forbids any artifact of this ticket from
// reporting otherwise.
//
// WHAT IT IS: configuration, shipped ahead of the thing it configures. Nothing in this repository has
// ever had a self-signup path, INV-08 forbids the route, and the AUT feature table is empty — so the
// enabled branch has nothing to enable. That is 01-story.md A-2 and AC-11 asserts it.
//
// No `"use client"` directive. This module is imported BY a client component and is not one itself,
// which keeps `src/lib/auth/**` free of client files — see 1.6.

/**
 * The `localStorage` key. Namespaced so it cannot collide with another origin's key on a shared
 * development host, and a single token so a Playwright `page.evaluate` can write it without quoting
 * games (02-design.md section 6).
 */
export const SELF_SIGNUP_STORAGE_KEY = "sdt.self-signup";

/** The two permitted values. Anything else resolves to `"disabled"`. */
export type SelfSignupSetting = "enabled" | "disabled";

/** The literal that enables. Exported so a test names the same string the reader does. */
export const SELF_SIGNUP_ENABLED: SelfSignupSetting = "enabled";
export const SELF_SIGNUP_DISABLED: SelfSignupSetting = "disabled";

/**
 * Resolves the setting, failing closed on every path.
 *
 * NOT `"true"` / `"false"`, and this is the decision most likely to be undone by accident. A
 * boolean-shaped string invites `Boolean(localStorage.getItem(key))`, which is `true` for the string
 * `"false"` — a fail-open control that reads as a fail-closed one. Two named literals have no such
 * reading.
 *
 * Five ways this returns `"disabled"`, and AC-10 is only the first of them:
 *   - nothing is stored (AC-10, and 01-story.md A-1: an invariant that lapses on a browser that has
 *     never visited the site is not an invariant)
 *   - something other than the exact literal `"enabled"` is stored — including `"ENABLED"`, `"1"`,
 *     `"true"` and the empty string
 *   - there is no `localStorage`, which is every server render
 *   - reading it throws, which a browser with site data blocked does
 *   - the caller passes `null` explicitly
 *
 * The `storage` parameter exists so `tests/unit/self-signup.test.ts` can exercise all five without a
 * browser (section 6.1). It is `Pick<Storage, "getItem">` rather than `Storage` because reading is
 * all this function does, and a narrower parameter is a smaller stub.
 */
export function readSelfSignupSetting(
  storage?: Pick<Storage, "getItem"> | null
): SelfSignupSetting {
  let source: Pick<Storage, "getItem"> | null | undefined = storage;

  if (source === undefined) {
    try {
      source = typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
    } catch {
      // Accessing `localStorage` itself throws in some privacy configurations, before any read.
      return SELF_SIGNUP_DISABLED;
    }
  }

  if (source === null) return SELF_SIGNUP_DISABLED;

  try {
    return source.getItem(SELF_SIGNUP_STORAGE_KEY) === SELF_SIGNUP_ENABLED
      ? SELF_SIGNUP_ENABLED
      : SELF_SIGNUP_DISABLED;
  } catch {
    return SELF_SIGNUP_DISABLED;
  }
}
```

### 1.4 The login route

**`src/app/(auth)/login/self-signup-notice.tsx` (new, `"use client"`)**

```tsx
"use client";

// The client island that reports the resolved self-signup setting (02-design.md F-7).
//
// IT LIVES IN THE ROUTE FOLDER AND NOT IN `src/lib/auth/`, deliberately. `src/lib/auth/**` is the one
// directory exempt from the `@supabase/*` lint restriction, and AC-4's third clause names a
// `"use client"` file inside that directory as the door the exemption leaves open. Keeping every
// client file out of it makes the exemption safe by construction rather than by review (1.6).
//
// THE STATE IS RESOLVED IN AN EFFECT, NOT IN RENDER. The server has no `window`, so it renders
// `disabled`; reading `localStorage` in the render body would produce a different first client render
// whenever the flag is set, which React 19 reports as a hydration mismatch — and AC-10's "the page
// does not error on the missing value" and AC-11's "the page renders" both fail on it. The initial
// state is `"disabled"` because that is both what the server rendered and what the flag defaults to,
// so the two agree for the same reason rather than by coincidence.

import { useEffect, useState } from "react";
import type { JSX } from "react";

import { readSelfSignupSetting } from "@/lib/auth/self-signup";
import type { SelfSignupSetting } from "@/lib/auth/self-signup";

export function SelfSignupNotice(): JSX.Element {
  const [setting, setSetting] = useState<SelfSignupSetting>("disabled");

  useEffect(() => {
    setSetting(readSelfSignupSetting());
  }, []);

  return (
    <p className="mt-2 text-xs text-muted">
      Self-registration:{" "}
      {/* The SETTING, never a control and never a claim about enforcement (AC-12). A bare value in
          its own element, so a test reads it without parsing a sentence. */}
      <span className="code" data-testid="login-self-signup">
        {setting}
      </span>
    </p>
  );
}
```

**`src/app/(auth)/login/page.tsx` (edited)**

One import and one element are added. **Nothing else on this page changes** — not the form, not the
`login-no-signup` note, not any testid. That is AC-11's assertion made structural: the page is
identical in both flag states except for the value inside `login-self-signup`.

```tsx
import { SelfSignupNotice } from "./self-signup-notice";
```

rendered immediately after the existing `login-no-signup` paragraph. The page stays a **server
component**: it gains no `"use client"` directive, because a page that becomes a client component to
read one flag has moved the whole form into the browser bundle for a label.

**No account-creation control is added, and no route is created** — AC-9, AC-11, INV-08. Whatever the
flag says, `src/app/(auth)/` gains no `signup`, `register` or `invite` segment, and no control on this
page submits anything to create an account.

### 1.5 `.env.example` (edited)

Two edits, one of which is a correction rather than an addition (F-4).

**Removed** — the whole `Better Auth — unchanged by the Supabase decision` block, with
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL`.

**Corrected** — the ADR-002 block's second paragraph asserts *Supabase Auth ... out of scope*,
*Authentication is Better Auth*, and *There is no SUPABASE_URL and no anon key here on purpose*. All
three are false after this ticket, and the third names the variable being added. Replace with a
statement of what is now true: Supabase is hosted Postgres **and** the identity provider (ADR-006);
RLS, realtime and storage stay out of scope; the two connection strings are unchanged.

**Added** — a Supabase Auth block:

```
# ---------------------------------------------------------------------------------------------
# Supabase Auth (ADR-006)
# ---------------------------------------------------------------------------------------------
# The client is constructed server-side only (ADR-006 OQ-1), so NEITHER of these carries the
# NEXT_PUBLIC_ prefix. Next inlines NEXT_PUBLIC_* into the browser bundle at build time; without the
# prefix the value cannot reach a client component at all, which is how "no Supabase credential
# reaches the browser" is a property of the naming rather than a promise about discipline.
#
# Both are in the dashboard under Project Settings -> API. The anon key is the publishable key and is
# still server-only here: RLS is off (ADR-002), so it is not safe to expose.

SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=
```

`DATA_SOURCE`, `DATABASE_URL` and `DIRECT_URL` are untouched.

### 1.6 Two structural rules the review should check

Neither is enforced by a tool, both are cheap to verify, and each closes a door this ticket would
otherwise leave ajar.

1. **No file under `src/lib/auth/` carries a `"use client"` directive.** That directory is the one
   place `@supabase/*` may be imported, so a client file inside it could construct a Supabase client
   in the browser legally — AC-4's third clause, and the gap `01-story.md` out-of-scope item 10 records
   as closed by nothing automatic. After this ticket the directory holds `permissions.ts` (untouched),
   `supabase.ts` and `self-signup.ts`, none of them client files. `grep -rl "use client" src/lib/auth`
   returning nothing is the check.
2. **No file in the repository names `@supabase/supabase-js`** (F-2). `grep -rn "supabase-js" src
   tests` returning nothing is the check. ESLint enforces it everywhere except `src/lib/auth/**`,
   which is exactly where the temptation is.

---

## 2. Permission model

**No permission gate is implemented by this ticket, no session exists after it, and no role is
readable.** That is the specified state, identical to `ROO-01`, `DEV-01` and `SEA-01`: the `AUT —
Authentication & Accounts` table in `.ai/registry/features.md` is empty. Replacing the identity
provider does not change it, because this ticket delivers no working sign-in — `01-story.md`
out-of-scope item 2.

**`src/lib/auth/permissions.ts` is not opened.** `ROLE_RANK`, `ROLES`, `can()`, `canCreateAccount()`,
`canManageRooms()` and `canApproveRequests()` are unchanged, and `tests/unit/permissions.test.ts` is
unchanged. Both are asserted by AC-7 and both are outside `allowed_paths`, so a change to either fails
`scripts/check-allowed-paths.mjs` in CI before a reviewer sees it. That is a stronger guarantee than
review and it is the reason those two files are absent from section 5 rather than listed and
described as read-only.

`src/components/shared/PermissionGate.tsx` imports `can` from `permissions.ts` and never touched
Better Auth. It is not in `allowed_paths` and does not change.

### 2.1 What must not be true after this ticket

Transcribed from `01-story.md`'s Permissions section, which transcribes `rbac-and-security.md`.
Nothing below is implemented here; the first three rows are already true and this ticket must not
make them false.

| Actor | Must not be able to | Held by |
|---|---|---|
| Unauthenticated visitor | Create an account, from any route, by any control, with the flag in either state | AC-9, AC-10, AC-11 — the absence of a route and of a control, which is INV-08's surviving half |
| `USER` | Create an account | `canCreateAccount()` is `can(role, "MANAGER")`, unchanged by AC-7. Unexercised: nothing calls it yet |
| `MANAGER`, `ADMIN` | Create an account **through this ticket's surface** | The surface does not exist. Account creation is `MEM`/`AUT`, out-of-scope item 6 |
| Any role | Have a permission decision answered by Supabase | AC-7's last clause, and ADR-006 decision 3. `createSupabaseServerClient` has no caller and answers *who is this*; `can()` answers *what may they do* |

### 2.2 The flag is not a permission control, and this document says so once, plainly

AC-12 requires that no artifact of this ticket state or imply that INV-08 is enforced by it. **It is
not.** `localStorage` is browser storage: the check runs on the machine of the person being checked,
and `localStorage.setItem("sdt.self-signup", "enabled")` in a developer console changes it with no
server-side record. ADR-006's Consequences section says the same in stronger words and MD-14 carries
the fix shape.

What holds INV-08 after this ticket is what held it before, minus two controls: **there is no
self-signup route and no control that creates an account.** That is an absence, it is assertable
(AC-9, AC-11), and it is weaker than `disableSignUp: true` was, because an absence can be ended by
adding a file whereas an option had to be edited.

---

## 3. Seam impact

**None.** No function in `src/lib/data/` changes, is added, or is removed. No DTO in
`src/lib/data/types.ts` changes. `tests/unit/seam-parity.test.ts` is unaffected and is not in
`allowed_paths`.

That is not merely an absence of work — it is a criterion. AC-4's second clause requires that **no
file under `src/lib/data/` imports any `@supabase/*` module**, and AC-5's third requires that **no
lint exemption names any path under `src/lib/data/`**. Both are true today
(`eslint.config.mjs` exempts `src/lib/auth/**/*.ts` and `src/lib/auth/**/*.tsx` and nothing else) and
this ticket must leave them true.

`scripts/check-docs.mjs:596-602` fails D12 on any string literal in `eslint.config.mjs` matching both
`/lib\/data/` and `/supabase/i`, which catches the exemption written the obvious way. Its own comment
records the case it cannot catch — `"src/lib/data/**"` added to the auth exemption block, a string
that names no vendor — and points at the `src/**` scan as the backstop. **The seam is untouched in
this ticket, so neither branch has anything to find.** It is stated because *while we are in the lint
config* is how the exemption list grows.

The one file this ticket adds to the seam's neighbourhood, `src/lib/auth/supabase.ts`, imports no
`@/lib/data` path at all. The auth exemption block in `eslint.config.mjs` re-states the Prisma
restriction rather than turning the whole rule off, precisely so that holding an auth client earns no
right to reach the Prisma implementation — that block is unchanged by this ticket.

---

## 4. Schema delta

**`none`.** `requires_adr` stays `false`.

No migration is written, no model is added or edited, `prisma/schema.prisma` is not opened, and no
migrations directory is created. `prisma/schema.prisma` is not in `allowed_paths`.

**`Member.authUserId` is not added here**, and the reason is not that it was forgotten. ADR-006
decision 5 and OQ-3 specify it as a plain `String? @unique` with no relation and no foreign key — but
`prisma/schema.prisma` is a DRAFT under RULE-09 and approving it is permanently human. `ticket.yaml`
records this as the reason SYS-01 exists separately from the seam wiring, and `01-story.md`
out-of-scope items 1 and 3 hold the line. Pulling the column in would put a human signature gate in
the middle of the loop, which is the one thing the ticket was scoped to avoid.

The registry row is explicit about what to do if this design had concluded otherwise: *If DESIGN
concludes otherwise, that is a finding to raise, not a decision to take.* It did not conclude
otherwise. The switch is deliverable with `DATA_SOURCE=mock`, no database, and no user rows, because
`createSupabaseServerClient` is a constructor with no caller and nothing in this ticket reads or
writes an identity.

Better Auth's four tables — `user`, `session`, `account`, `verification` — never entered
`prisma/schema.prisma` and do not enter it now (ADR-006 decision 1). The `Account` name collision
ADR-006 decision 8 voids was never in the schema either; the domain `model Account` stays as it is.

---

## 5. allowed_paths

Enumerated, written back into `ticket.yaml`. Thirteen entries, twelve of which are files — see F-8.

```yaml
allowed_paths:
  - "package.json"
  - "pnpm-lock.yaml"
  - ".env.example"
  - "src/lib/auth/auth.ts"
  - "src/lib/auth/client.ts"
  - "src/app/api/auth/[...all]/route.ts"
  - "src/lib/auth/supabase.ts"
  - "src/lib/auth/self-signup.ts"
  - "src/app/(auth)/login/page.tsx"
  - "src/app/(auth)/login/self-signup-notice.tsx"
  - "tests/unit/self-signup.test.ts"
  - "tests/e2e/self-signup.spec.ts"
  - ".ai/board/tickets/SYS-01/**"
```

Three of those entries are **deletions** — `auth.ts`, `client.ts`, `route.ts`. A deleted file's path
appears in `git diff --name-only`, so it must be enumerated exactly as any edit is.

**The bracketed path is safe as a glob and was checked rather than assumed.**
`scripts/check-allowed-paths.mjs:76` escapes `[`, `]` and `.` in the character class
`/[.+^${}()|[\]\\]/g` before building the regular expression, so
`src/app/api/auth/[...all]/route.ts` compiles to a literal match rather than to a character class
that would match one character out of `.al`. This is the one entry in this list where a glob library
with different semantics would silently fail open.

**Six things deliberately absent**, each of which a Developer might reach for:

- `src/lib/auth/permissions.ts` and `tests/unit/permissions.test.ts` — AC-7. Leaving them out of the
  list means CI refuses the change rather than a reviewer noticing it (section 2).
- `prisma/schema.prisma` — section 4. Human under RULE-09.
- `eslint.config.mjs` and `scripts/check-docs.mjs` — both already carry the ADR-006 shape, verified by
  reading them. AC-5 and AC-6 assert their behaviour; out-of-scope item 9 forbids rewriting them, and
  `H-1` records that ADR-006's own table is stale on this point.
- `docker/docker-compose.yml` — F-6. Three stale `BETTER_AUTH_*` variables, no criterion covering
  them, and `devops`'s directory.
- `tests/e2e/smoke.spec.ts` — **AC-9 passes against it unedited.** Its login test asserts
  `login-no-signup` is visible and that no sign-up/register/create-account link exists, and this
  ticket adds no such link. Leaving the file out makes "the existing test still passes untouched" a
  CI-enforced claim, which is the same discipline AC-7 applies to `permissions.test.ts`.
- `src/components/shared/PermissionGate.tsx` — never referenced Better Auth (it imports `can` from
  `permissions.ts`), so ADR-006 listing it among the Better Auth surface files is descriptive of where
  role code lives, not of a file that changes.

### `size` — **M**

Twelve files, which is the M row of the sizing table in `.ai/01-operating-model.md` (M is up to 12).
**At the ceiling with zero headroom**, and F-8 records that the thirteenth entry is the ticket's own
artifact glob, which `scripts/check-allowed-paths.mjs:113` exempts before any glob is tested and which
therefore authorises nothing.

**What zero headroom means for the Developer:** a thirteenth file is not a small overrun, it is the L
row, and the L row says *must split at DESIGN* — which cannot happen from IN_PROGRESS. If the
implementation needs a file this list does not name, that is a finding raised through
`99-questions.md` to `tech-lead-design`, not a path added to `ticket.yaml`. The two most likely
candidates and their answers are already in this document: `docker/docker-compose.yml` goes to
`devops` (F-6), and `eslint.config.mjs` is already correct (out-of-scope item 9).

**It is not XL**, and all three triggers are checked rather than waved past. `schema_delta` is `none`
(section 4). No `src/lib/data/` signature changes — the seam is not touched at all (section 3).
`src/lib/data/types.ts` is unchanged and is not in the list; `type Role` is what `permissions.ts`
imports from the seam and AC-7 asserts `permissions.ts` does not change.

**It is not L**, on the count above and on F-8's reading of what counts.

**`size_estimate` was `M` and the verdict is `M`. They agree, so nothing routes back to `ba`.** The
gap between the two counts is worth recording even though the band did not move: the story's estimate
enumerated **nine** files and this design enumerates twelve. All three of the extra files come from
one decision the story could not have made, because it is the decision `Q-2` delegated — the flag
needs a pure resolver (`self-signup.ts`), a client island to report it (`self-signup-notice.tsx`), and
a unit test that can exercise the fail-closed paths without a browser
(`tests/unit/self-signup.test.ts`). The story's estimate also assumed the login page might not change
at all, which F-1 confirms for Better Auth and F-7 reverses for the flag. **The estimate was sound;
the band is unchanged; the ticket is tighter than it looked.**

---

## 6. Testability contract

RULE-05 makes this the only channel through which selectors reach QA, and check R7 verifies the
reverse — every testid here appears in the markup.

**This ticket has almost no user interface, so most of this section is not a selector table.** Ten of
the twelve criteria are observed through the dependency tree, the lint configuration, the audit, file
existence, `git diff` and a test run. `01-story.md` establishes that those surfaces are legitimate and
are not the `src/**` channel RULE-05 closes; 6.2 gives the exact command for each, because a criterion
QA cannot run is a criterion QA will approximate.

### 6.1 Selectors

One testid is added. Five existing ones on the login route are republished so QA never has to read
another ticket's artifact or the page itself (RULE-16).

| data-testid | Element | Used by |
|---|---|---|
| `login-self-signup` | **New.** The resolved self-signup setting, rendered as the bare literal `disabled` or `enabled`. Never a control | AC-10, AC-11 |
| `login-page` | The login route's root element | AC-9, AC-10, AC-11 |
| `login-email` | Email input. Unchanged by this ticket | AC-9 |
| `login-password` | Password input. Unchanged by this ticket | AC-9 |
| `login-submit` | The sign-in submit control. **It signs in; it does not register** | AC-9, AC-11 |
| `login-no-signup` | The standing note that accounts are created by a Manager or an Administrator. **Its text is identical in both flag states** | AC-9, AC-10, AC-11 |

**There is no testid for an account-creation control, and that is the point.** AC-9 and AC-11 are
satisfied by absence: `page.getByRole("link", { name: /sign up|register|create account/i })` having
count 0, and no route under the application answering a sign-up path. A testid QA could look for would
make the absence harder to assert, not easier.

**The flag, for QA (`01-story.md` `Q-2` says to take it from here and not from the story):**

| Item | Value |
|---|---|
| Storage | `window.localStorage`, on the application's own origin |
| Key | `sdt.self-signup` |
| Enabled | the exact string `enabled` |
| Disabled | the exact string `disabled`, **and every other value, and absence** |

AC-11's Given is reached by `page.addInitScript(() => localStorage.setItem("sdt.self-signup",
"enabled"))` before navigating, so the value is present on the first render rather than set after it.
AC-10's Given is the default Playwright context, which starts with empty storage — assert it rather
than clearing it, so the test fails if a previous spec leaked state.

### 6.2 The seam and module surface QA may call

`tests/unit/self-signup.test.ts` may import exactly this and nothing else:

```ts
import {
  SELF_SIGNUP_STORAGE_KEY,
  readSelfSignupSetting,
} from "@/lib/auth/self-signup";
import type { SelfSignupSetting } from "@/lib/auth/self-signup";
```

| Call | Returns | What to assert |
|---|---|---|
| `SELF_SIGNUP_STORAGE_KEY` | `string` | equals `"sdt.self-signup"` — the value the e2e spec writes, asserted in one place so the two suites cannot drift |
| `readSelfSignupSetting(storage)` | `SelfSignupSetting` | `"enabled"` **only** when `getItem` returns exactly `"enabled"` |
| `readSelfSignupSetting(null)` | `SelfSignupSetting` | `"disabled"` |
| `readSelfSignupSetting()` | `SelfSignupSetting` | `"disabled"` under vitest's jsdom environment with nothing stored |

**Five fail-closed paths, and AC-10 is only the first.** Pass a stub for each: nothing stored;
`"true"`; `"ENABLED"`; the empty string; and a `getItem` that throws. All five must return
`"disabled"`. A test that covers only the absent case passes against
`Boolean(localStorage.getItem(key))`, which is the implementation this contract exists to refuse.

`src/lib/auth/supabase.ts` is **not** on this list and has no unit test. It has no caller
(out-of-scope item 2), it needs a Supabase project to do anything (out-of-scope item 4), and a test
asserting that a constructor constructs would assert the mock it was given.

### 6.3 The non-selector channels, with the command for each

| AC | Command or observation | Passes when |
|---|---|---|
| AC-1 | `grep -n '"better-auth"' package.json`; `grep -c better-auth pnpm-lock.yaml`; `grep -rn "better-auth" src tests` | all three find nothing |
| AC-2 | `test -e src/lib/auth/auth.ts`; `test -e src/lib/auth/client.ts`; `ls src/app/api/auth`; `test -e src/lib/auth/permissions.ts` | the first three fail, the fourth succeeds |
| AC-3 | read `package.json` | `@supabase/ssr` in `dependencies`; **no other `@supabase/` key in any of the three dependency fields.** F-2: `@supabase/supabase-js` in `pnpm-lock.yaml` and in `node_modules/.pnpm/` is expected and is not a failure — it is a transitive peer, and AC-3 is about this repository's declared dependencies |
| AC-4 | `grep -rn "@supabase/" src \| grep -v "^src/lib/auth/"`; `grep -rn "@supabase/" src/lib/data`; `grep -rln "use client" src/lib/auth`; `grep -rn "NEXT_PUBLIC_SUPABASE" src .env.example` | all four find nothing |
| AC-5 | read `eslint.config.mjs`; `pnpm lint` | `@supabase/*` named in a `no-restricted-imports` group; the only Supabase exemption is `src/lib/auth/**`; no exemption names `lib/data`; lint exits 0 |
| AC-6 | `node scripts/check-docs.mjs` | exits 0, no D12 line in the output |
| AC-7 | `git diff --name-only origin/main...HEAD` | neither `src/lib/auth/permissions.ts` nor `tests/unit/permissions.test.ts` appears. `pnpm test` passes with all 61 baseline tests green |
| AC-8 | `pnpm verify` **in the build lane** | exits 0. **F-9: it cannot be run in `aiw-work`** — `node_modules` there is a symlink out of the worktree and Turbopack refuses it, so `pnpm build` fails against unmodified `main`. That is the worktree, not the change |
| AC-9 | the existing `tests/e2e/smoke.spec.ts` login test, **unedited** | it passes. It is outside `allowed_paths`, so CI refuses a change to it |
| AC-10, AC-11, AC-12 | `tests/e2e/self-signup.spec.ts`, plus reading this ticket's own artifacts | see 6.1 and below |

**The AC-8 baseline, measured in this worktree before the change:** `tsc --noEmit` clean, `eslint .`
clean, `vitest run` — 4 files, 61 tests, all passing — and `node scripts/check-docs.mjs` reporting
`errors: 0  warnings: 0  pending: 0`. *No test that passed before this change fails after it* is
measured against those 61.

**`pnpm hooks:test` is red and stays red, and it is on no criterion.** MD-16 records that ten D12
tests in `scripts/tests/check-docs.test.mjs` assert pre-ADR-006 semantics while `check-docs.mjs`
itself is correct and exits 0. `01-story.md` out-of-scope item 12 names it so an inherited failure is
not reported as a caused one. Neither file is in `allowed_paths`.

**AC-12 is a criterion about this ticket's own artifacts and QA verifies it by reading them.** The
implementation log, the review and the test report must not state or imply that INV-08 is enforced by
this ticket. Section 2.2 of this document is the wording to agree with: the flag is client-side
configuration, what holds INV-08 is the absence of a route and of a control, and that is weaker than
what it replaced. A test report that says *self-signup is disabled* without saying *by browser
storage* has failed AC-12.

---

## 7. Rejected alternatives

### A — Declare `@supabase/supabase-js` in `package.json` alongside `@supabase/ssr`

The shape: add both packages explicitly, on the reasoning that an undeclared peer is a dependency the
repository relies on without saying so, and that pnpm's auto-peer-install is a setting somebody could
turn off.

**Genuinely plausible**, and the argument is the strongest one against the position this design takes:
`@supabase/ssr` cannot function without it, its types import from it, and a `package.json` that hides
that is a `package.json` that under-describes the build. An explicit peer is normally the correct
answer.

**Rejected, and not on preference.** AC-3 forbids it in terms — *no other package whose name begins
`@supabase/` appears in `dependencies`, `devDependencies` or `peerDependencies*, and *in particular
`@supabase/supabase-js` is absent*. Check D12 fails on it (`scripts/check-docs.mjs:558-563`), so the
change would fail AC-6 as well. ADR-006 decision 6 is the source of both and it is registry: changing
it is an ADR and a human, not a design.

There is also a substantive reason the ADR is right and the general rule is wrong here.
`@supabase/supabase-js` **is the browser client** — it is the specific package ADR-002's revert
condition was written about. Declaring it puts it one `pnpm add`-free import away from any file, with
only lint between it and a component. Leaving it transitive means nothing in this repository has ever
asked for it, and the day someone does, the diff says so in one line. The dependency list is a
document about intent, and this one intends `@supabase/ssr`.

**What the rejection costs, stated rather than hidden:** if `auto-install-peers` is ever set to
`false` — it is unset today, and pnpm 10 defaults it to true — the install produces an unresolvable
peer and the build fails loudly at `pnpm install`. That is a noisy failure with an obvious cause, not
a silent one, which is the right side of the trade.

### B — Hold the self-signup setting server-side instead of in `localStorage`

An environment variable, or a value in the seam, read on the server — which is the only place a
control over what the server accepts can live.

**Rejected on authority, not on merit, and the merit is on this alternative's side.** ADR-006 OQ-2
records the question being asked, the steward recommending three server-side controls, and the
operator choosing the `localStorage` flag. The ADR is `ACCEPTED` and it is registry. A design that
quietly implemented the recommendation the operator declined would be overturning a decision through
an implementation choice, which is worse than either option — the operator would have no way to see
that it happened.

The objection is preserved in ADR-006 and in MD-14 with its fix shape, so adopting it later is a
decision rather than a redesign. It is restated in section 2.2 of this document because AC-12 requires
this ticket's artifacts to be honest about what the flag is.

### C — Do not render the flag state; let the flag exist with no visible effect

The shape: ship `self-signup.ts` with its unit test and never call it from the login route. Strictly
smaller — one fewer file, no client island, no hydration question.

**Rejected because it makes AC-10 and AC-11 unfalsifiable** (F-7). Both criteria's remaining clauses —
no account-creation control, no reachable sign-up route, the page does not error — are already true of
the login page as it stands today, before any of this work. A criterion set that a repository passes
before the ticket starts is a criterion set that measures nothing, and this ticket's whole
verification problem is that most of its criteria assert absences. `01-story.md` names that trap in
its opening section; this alternative walks into it.

Rendering the resolved setting costs one client component and one testid, and it converts *the flag
defaults to disabled* from an implementation claim into an observation.

### D — Put the client island inside `src/lib/auth/`

The shape: `src/lib/auth/self-signup-notice.tsx` beside `self-signup.ts`, on the grounds that auth
concerns belong in the auth directory and cohesion is the ordinary rule.

**Rejected because that directory is the one place `@supabase/*` may be imported.** AC-4's third
clause exists for exactly this: *no file carrying the `"use client"` directive imports any
`@supabase/*` module, **including files under `src/lib/auth/`***, and `01-story.md` out-of-scope item
10 records that nothing automatic closes it. The exemption is a hole in a control, and the way to keep
a hole safe is to keep it empty of the thing that could fall through.

Making it a rule rather than a judgement — **no `"use client"` file under `src/lib/auth/`** (1.6) —
turns a review question into a one-line grep. The pure resolver stays in `src/lib/auth/` because it is
auth configuration and it is not a client file; the component that renders it lives with the route
that renders it, which is where `devices-manager.tsx` and `rooms-manager.tsx` already put their client
halves.

### E — Add the `server-only` package to enforce that the Supabase module never reaches the browser

`server-only` makes importing a server module from a client component a **build** error, which is
strictly stronger than the runtime `typeof window` guard in 1.2.

**Rejected on cost against a ticket at its file ceiling.** It is a second new dependency on a ticket
whose acceptance criteria are largely about which packages are and are not in the tree — AC-1 and AC-3
are both dependency-tree assertions, and adding an unrelated package to satisfy an internal preference
muddies the diff those criteria are read against. The runtime guard costs three lines and no
dependency, and the module it protects has no caller at all in this ticket.

Recorded rather than dropped, because the reasoning expires: the moment `createSupabaseServerClient`
gains its first caller — the `AUT` ticket that builds a session — `server-only` becomes the right
answer, and it should be adopted there rather than re-argued.

---

## Changelog

- `2026-08-24T08:47:49Z` — initial version, all seven sections. Raised by `tech-lead-design`. Amended
  by `tech-lead-design`. `consulted` is empty; no clarification was requested and none was needed to
  reach a verdict. `allowed_paths` enumerated with thirteen entries, twelve of them files, and written
  back to `ticket.yaml`; `size` set to `M`, agreeing with the `ba`'s `size_estimate`. Nine findings
  raised, none blocking: F-1 answers `Q-1` (the login page never referenced Better Auth), F-2 settles
  the `@supabase/ssr` peer dependency empirically and is the finding that decided the ticket is
  deliverable, F-3 answers `Q-2` with the flag contract and the hydration constraint, F-4 answers
  `Q-3` and finds a paragraph of `.env.example` that becomes false, F-5 answers `Q-4`, F-6 routes
  three stale `BETTER_AUTH_*` variables in `docker/docker-compose.yml` to `devops`, F-7 records that
  AC-10 and AC-11 are unfalsifiable unless the flag state is rendered and renders it, F-8 takes a
  position on whether the ticket's artifact glob counts toward `size` and routes the gap to the
  steward, F-9 records that `pnpm build` cannot run in the design lane so AC-8 belongs to the build
  lane. F-1, F-7 and the `Q-2` half of F-3 are RULE-14 amendments routed to `ba`; none changes a
  signature here. `schema_delta` stays `none` and `requires_adr` stays `false`. `H-1` is untouched —
  ADR-006 is registry and correcting its "Affected documents" table is a human's (RULE-01).
