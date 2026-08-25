---
ticket: SYS-01
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-25T09:40:00Z
inputs_read: [ .ai/board/tickets/SYS-01/02-design.md, .ai/board/tickets/SYS-01/01-story.md, .ai/board/tickets/SYS-01/ticket.yaml, .ai/standards/coding-standards.md, .ai/standards/git-conventions.md, .ai/standards/session-model.md, eslint.config.mjs, scripts/check-docs.mjs, scripts/check-allowed-paths.mjs, .claude/hooks/chat-guard.mjs, node_modules/@supabase/ssr, node_modules/next/dist/server/request/cookies.d.ts ]
consulted:
  - with: tech-lead-design
    asked: "02-design.md 1.4 specifies useState plus a useEffect calling setSetting. Those exact lines fail eslint under react-hooks/set-state-in-effect, and pnpm lint exiting 0 is a gate item. useSyncExternalStore was shipped instead. Amend 1.4?"
    answer: "pending — raised in 99-questions.md Q-1, unanswered at the time this log was written"
    resulted_in_amendment: false
  - with: tech-lead-design
    asked: "Deleting the three files in 1.1 makes check D6 report six errors against ADR-002 and ADR-006, so node scripts/check-docs.mjs exits 1 and AC-6's first clause fails. Every candidate fix is under .ai/registry/**, which is outside allowed_paths and human under RULE-01. Which of the three shapes, and by whom, before /qa?"
    answer: "pending — raised in 99-questions.md Q-2, unanswered at the time this log was written"
    resulted_in_amendment: false
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# SYS-01 — implementation log

**What this ticket delivers is a provider swap with no caller.** `createSupabaseServerClient` is
constructed and never invoked, no session is established, no route is guarded, and the login form is
as static after this change as it was before it. That is the specified state, not an unfinished one —
`01-story.md` out-of-scope item 2 puts sign-in, sign-out and sessions in the `AUT` group, whose
feature table is empty. A reviewer looking for the thing that uses the new module will not find one.

**Two findings are open and neither blocks this stage.** Both are in `99-questions.md`, both routed
to `tech-lead-design`, and Q-2 will fail an acceptance criterion at QA if nobody acts on it before
then. They are summarised under *Deviations* and *Open questions* below rather than left for the
reviewer to rediscover from the diff.

## Files touched

Eleven paths. Every one is inside `allowed_paths`; `node scripts/check-allowed-paths.mjs` reports
`PASS`. Three are deletions, which appear in `git diff --name-only` and are enumerated exactly as an
edit is.

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/auth/auth.ts` | deleted | The `betterAuth()` instance, `disableSignUp` and `nextCookies`. ADR-006 replaces the provider, so the instance has no successor | §1.1 |
| `src/lib/auth/client.ts` | deleted | The browser client — `createAuthClient`, `signIn`, `signOut`, `useSession`. Nothing imported it: F-1 established the login page never referenced it | §1.1 |
| `src/app/api/auth/[...all]/route.ts` | deleted | `toNextJsHandler(auth)`. The empty `src/app/api/auth/` directory went with it, which AC-2's *no route handler exists anywhere under `src/app/api/auth/`* requires. `src/app/api/` held nothing else and is now gone too | §1.1 |
| `package.json` | modified | `better-auth` out of `dependencies`, `@supabase/ssr` in. One line, and it is the only dependency change | §1.1, §1.2 |
| `pnpm-lock.yaml` | modified | The install's record. `better-auth` and its tree leave; `@supabase/ssr` and its transitive peer arrive. Not hand-edited — written by `pnpm` | §1.1, §1.2 |
| `src/lib/auth/supabase.ts` | created | The one place a Supabase client is constructed, server-side only. The whole of §1.2 | §1.2 |
| `src/lib/auth/self-signup.ts` | created | The flag's key, its two literals, and the resolver that fails closed on all five paths. No React, no client directive | §1.3 |
| `src/app/(auth)/login/self-signup-notice.tsx` | created | The client island that renders the resolved setting, so AC-10 and AC-11 measure something (F-7). In the route folder and not in `src/lib/auth/`, deliberately — §1.6 rule 1 | §1.4 |
| `src/app/(auth)/login/page.tsx` | modified | One import and one element. Nothing else on the page changes — not the form, not `login-no-signup`, not any existing testid | §1.4 |
| `.env.example` | modified | The `BETTER_AUTH_*` block removed, the `SUPABASE_URL` / `SUPABASE_ANON_KEY` block added, and the ADR-002 block corrected because three of its sentences became false (F-4) | §1.5 |
| `.ai/board/tickets/SYS-01/99-questions.md` | created | The two findings below, routed to `tech-lead-design` through the file transport the session model uses | — (process artifact) |

**`src/lib/auth/permissions.ts` was not opened**, and neither was `tests/unit/permissions.test.ts`.
Both are absent from `allowed_paths`, so CI refuses a change to either. AC-7 holds structurally rather
than by my restraint. `tests/e2e/smoke.spec.ts` is likewise untouched, and its login test passes
unedited.

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 — three deletions | files absent; `src/app/api/` removed | `test -e` fails for `auth.ts` and `client.ts`; `ls src/app/api` reports no such directory; `permissions.ts` present |
| §1.1 — `better-auth` leaves `dependencies` | `package.json:36` | Replaced in place by `@supabase/ssr`, which keeps the block alphabetical |
| §1.2 — `createSupabaseServerClient` | `src/lib/auth/supabase.ts:52` | `async`, because `cookies()` returns a Promise in Next 16 |
| §1.2 — `requiredEnv` narrowing, not asserting | `src/lib/auth/supabase.ts:25` | Throws on `undefined` and on `""`. Neither name carries `NEXT_PUBLIC_` |
| §1.2 — the browser refusal | `src/lib/auth/supabase.ts:59` | `typeof window !== "undefined"` throws. A runtime refusal, not a check — it does not close the gap `01-story.md` out-of-scope item 10 records |
| §1.2 — `{ getAll, setAll }`, return type inferred | `src/lib/auth/supabase.ts:68-71` | The deprecated `{ get, set, remove }` overload is not used. No return annotation anywhere |
| §1.3 — `SELF_SIGNUP_STORAGE_KEY` | `src/lib/auth/self-signup.ts:25` | `"sdt.self-signup"`, exactly as §6.1 publishes it to QA |
| §1.3 — `SelfSignupSetting` | `src/lib/auth/self-signup.ts:28` | `"enabled" \| "disabled"` |
| §1.3 — `SELF_SIGNUP_ENABLED` / `_DISABLED` | `src/lib/auth/self-signup.ts:31-32` | Named literals, not `"true"`/`"false"` |
| §1.3 — `readSelfSignupSetting` | `src/lib/auth/self-signup.ts:55` | All five fail-closed paths present: absent storage, wrong value, no `localStorage`, a throwing read, explicit `null`. `Pick<Storage, "getItem">` so a unit test can stub it |
| §1.4 — the client island | `src/app/(auth)/login/self-signup-notice.tsx:63` | Renders the setting only; no control, no claim about enforcement. **Hook mechanism deviates — see below** |
| §1.4 — `data-testid="login-self-signup"` | `src/app/(auth)/login/self-signup-notice.tsx:71` | A bare literal in its own element |
| §1.4 — page import and placement | `src/app/(auth)/login/page.tsx:4`, `:39` | Rendered immediately after `login-no-signup`. The page stays a server component — no client directive was added |
| §1.4 — no signup control, no signup route | `src/app/(auth)/` unchanged apart from the two files above | No `signup`, `register` or `invite` segment exists. `pnpm build` lists ten routes and none is one |
| §1.5 — `.env.example` | `.env.example:40-51` | Better Auth block removed; ADR-002 block corrected; `SUPABASE_URL` and `SUPABASE_ANON_KEY` added, neither prefixed. `DATA_SOURCE`, `DATABASE_URL`, `DIRECT_URL` untouched |
| §1.6 rule 1 — no client directive under `src/lib/auth/` | verified by grep | Returns nothing. See *Verification run* |
| §1.6 rule 2 — the core client package is never named | verified by grep | Returns nothing. See *Verification run* |

**`TODO(verify)` — both items in §1.2 resolved against the installed package, not against
documentation**, as `CLAUDE.md` requires. (1) The cookie `options` type needs no field mapping and no
cast: `tsc --noEmit` accepts `store.set(name, value, options)` as written, so the `CookieOptions` /
`Partial<ResponseCookie>` divergence the design warned about does not occur at this version. (2) The
three-argument `createServerClient(url, key, options)` shape with `options.cookies` as
`{ getAll, setAll }` is what the installed declaration still declares. Recorded in the code at
`src/lib/auth/supabase.ts:72-85` so the next reader does not re-derive it.

**One version drift, and it is not a deviation in shape.** F-2 was measured at `@supabase/ssr@0.12.4`;
what installed is `0.12.5`. The property F-2 turned on holds unchanged: `package.json` declares
`@supabase/ssr` alone, the core client package appears only in `pnpm-lock.yaml` and pnpm's virtual
store as a transitive peer, and `node_modules/@supabase/` contains `ssr` and nothing else. AC-3 reads
`package.json`, so it passes.

## Deviations from the design

**Two, both declared, both routed to `tech-lead-design` in `99-questions.md` before this log was
written.**

**1. `useSyncExternalStore` in place of `useState` + `useEffect`** — `02-design.md` §1.4, raised as
`99-questions.md` Q-1. The design's literal lines are a lint error:
`eslint-config-next@16.3.0` enables `react-hooks/set-state-in-effect`, which fails on
`setSetting(readSelfSignupSetting())` inside an effect body. This was measured rather than assumed —
the design's code was written to the file verbatim and `eslint` was run over it, reporting
`13:5 error ... react-hooks/set-state-in-effect`, before it was replaced. `pnpm lint` exiting 0 is an
IN_PROGRESS gate item, so those lines cannot ship. `useSyncExternalStore` preserves every clause of
the design's stated reasoning instead of working around it: `getServerSnapshot` returns
`SELF_SIGNUP_DISABLED`, so the server render and the flag default agree for the same reason the
design gives rather than by coincidence, and the client snapshot is taken only after hydration. The
alternative — an `eslint-disable` comment keeping the design's lines — was rejected because it
suppresses a real rule about a real hazard. **Nothing observable changed**: same file, same client
directive, same single testid, same markup, same two literals. Section 6.1's selector table is
unaffected.

**2. Three comments were rewritten so they stop failing the greps they describe.** Not a deviation
from section 1 but from the state this ticket was in when the session resumed, and a reviewer diffing
intent against code should know why the comments read the way they do. `02-design.md` §1.6 and §6.3
make three greps the test of the two structural rules and of AC-4's first and third clauses. Comments
that quoted the searched strings — the client directive, the core client package name, the restricted
package prefix — matched those greps from inside the files whose compliance they were asserting. All
three now describe the token and cite `02-design.md` §6.3 for the exact command instead of
reproducing it. **The code is unchanged by this; only comment text moved**, and all six greps now
return nothing where the design says they must.

## Invariants

| ID | Still holds because |
|----|---------------------|
| `INV-08` | **Held by less than it was held by before this ticket, and this log says so rather than reporting it as enforced (AC-12).** What survives on its own is structural: there is no route that creates an account — `pnpm build` enumerates ten routes and none is `signup`, `register` or `invite` — and the login page presents no control and no link that creates one, in either flag state. What was removed is `disableSignUp: true` and the catch-all handler. What replaced them is `sdt.self-signup` in `localStorage`, which is **client-side configuration and not a control**: the value sits on the machine of the person it would restrain, and one developer-console line changes it with no server-side trace. The resolver fails closed on all five paths, so the flag never *weakens* the position further — but a flag that fails closed is still browser storage. MD-14 carries the gap and its fix shape; `01-story.md` out-of-scope item 10 records that this ticket knowingly does not apply it. **Nothing in this implementation makes INV-08 enforceable, and the flag's enabled branch has nothing to enable.** |

No other invariant is engaged. `01-story.md` reasons all eleven others individually; this ticket
writes no seat, no occupancy, no device, no room and no member, and it adds no link between an
identity and a `Member` (`schema_delta: none`).

## Verification run

Commands actually executed, in this worktree, on this branch. Exit codes, not intentions.

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | `tsc --noEmit`, clean |
| `pnpm lint` | 0 | `eslint .`, clean |
| `pnpm test` | 0 | `vitest run` — 4 files, 61 tests passed. Identical to the baseline in `02-design.md` §6.3. No test deleted, skipped or marked pending |
| `pnpm build` | 0 | Ten routes, all static. `/login` prerenders, so the `useSyncExternalStore` server snapshot works as specified |
| `pnpm verify` | 0 | typecheck, lint, test, build in one pass. **AC-8 holds in this lane** — F-9 assigned it here because `pnpm build` cannot run in `aiw-work` |
| `node scripts/check-docs.mjs` | **1** | **6 D6 errors, 0 D12.** Caused by this change and unfixable from inside `allowed_paths` — `99-questions.md` Q-2, and *Open questions* below |
| `node scripts/check-allowed-paths.mjs` | 0 | `allowed-paths: PASS` |
| `git diff --name-only` subset of `allowed_paths` | yes | Eleven paths, every one enumerated in §5 or under the ticket's own glob |
| `grep -rl "<client directive>" src/lib/auth` | — | returns nothing (§1.6 rule 1, AC-4 third clause) |
| `grep -rn "<core client package>" src tests` | — | returns nothing (§1.6 rule 2) |
| `grep -rn "@supabase/" src \| grep -v "^src/lib/auth/"` | — | returns nothing (AC-4 first clause) |
| `grep -rn "@supabase/" src/lib/data` | — | returns nothing (AC-4 second clause) |
| `grep -rn "NEXT_PUBLIC_SUPABASE" src .env.example` | — | returns nothing (AC-4 fourth clause) |
| `grep -rn "better-auth" src tests package.json` | — | returns nothing (AC-1) |

The four `grep` rows are written with the searched token described rather than spelled out, for the
same reason the code comments are: this log lives under `.ai/board/`, which `check-docs.mjs` does not
scan, but the habit is what stopped the greps failing in the first place. `02-design.md` §6.3 holds
every command in literal form.

**`pnpm hooks:test` was not run and is on no criterion.** MD-16 records it as red on ten pre-ADR-006
D12 tests, `01-story.md` out-of-scope item 12 names it so an inherited failure is not reported as a
caused one, and neither file is in `allowed_paths`.

## Testability contract

Every `data-testid` in `02-design.md` §6.1, and where it now exists. One is new; five are republished
and unchanged.

| `data-testid` | Exists at |
|---------------|-----------|
| `login-self-signup` | `src/app/(auth)/login/self-signup-notice.tsx:71` — **new** |
| `login-page` | `src/app/(auth)/login/page.tsx:13` |
| `login-email` | `src/app/(auth)/login/page.tsx:22` |
| `login-password` | `src/app/(auth)/login/page.tsx:28` |
| `login-submit` | `src/app/(auth)/login/page.tsx:30` |
| `login-no-signup` | `src/app/(auth)/login/page.tsx:35` |

The five existing testids are at the same lines and with the same text as before this change, apart
from `login-no-signup` moving no lines and gaining a sibling after it. **There is no testid for an
account-creation control**, which §6.1 states is the point.

The module surface §6.2 permits `tests/unit/self-signup.test.ts` to import is exactly what
`src/lib/auth/self-signup.ts` exports: `SELF_SIGNUP_STORAGE_KEY`, `readSelfSignupSetting`, and the
type `SelfSignupSetting`. **No test file was written by this stage** — `tests/unit/self-signup.test.ts`
and `tests/e2e/self-signup.spec.ts` are in `allowed_paths` for QA and are still absent.

## Open questions

**Q-2 in `99-questions.md` is the one that matters, and it will fail AC-6 at QA.** Stated in full so
the reviewer does not have to open another file: `node scripts/check-docs.mjs` now exits 1 with six
D6 errors, all of them ADR-002 and ADR-006 naming the three files §1.1 deletes. The audit was clean
before this change — reproduced by stashing the tree, running it, and restoring. D6
(`scripts/check-docs.mjs:231-268`) scans governed documents only and fires on a path-shaped token
that is not on disk, so the fix is in `.ai/registry/decisions/`, which is outside `allowed_paths` and
human under RULE-01. **No agent in this loop is permitted to make the audit green.** The finding is
structural rather than specific to SYS-01: any future ticket deleting a file an ADR cites will fail
D6 the moment it succeeds. Three possible shapes — amend AC-6, edit the two ADRs, or change D6 — are
set out in `99-questions.md`; choosing between them belongs to `tech-lead-design`, the steward and a
human, not here.

**Q-1 is answered by this implementation and needs only the amendment.** The deviation shipped, the
gate is green, and nothing observable differs.

**One observation about the chat guard, recorded so a reviewer does not read it as a bypass.**
`ticket.yaml`'s `chat_budget` still shows `developer->tech-lead-design: { used: 0, max: 6 }` while
`99-questions.md` holds two entries addressed to that agent. That is the guard working as written,
not a guard that did not fire: `chat-guard.mjs` increments `used` only on the **tool** transport, and
for the **file** transport it counts the `to:` entries in the file itself each time
(`chat-guard.mjs:214-240`). Two of six are spent. The comment at `ticket.yaml:272` describes only the
tool transport and reads as though it covers both. That is the steward's to reconcile, not this
ticket's.

## Changelog

- `2026-08-25T09:40:00Z` — initial version. Written by `developer` at IN_PROGRESS. No rework cycles;
  `rework_count` is 0.
