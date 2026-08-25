---
ticket: SYS-01
stage: REVIEW
agent: tech-lead-review
produced_at: 2026-08-25T09:42:00Z
inputs_read: [ .ai/board/tickets/SYS-01/01-story.md, .ai/board/tickets/SYS-01/02-design.md, .ai/board/tickets/SYS-01/03-impl-log.md, .ai/board/tickets/SYS-01/99-questions.md, .ai/board/tickets/SYS-01/ticket.yaml, .ai/registry/rules.md, .ai/registry/invariants.md, .ai/registry/features.md, .ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md, package.json, pnpm-lock.yaml, .env.example, src/lib/auth/supabase.ts, src/lib/auth/self-signup.ts, src/app/(auth)/login/self-signup-notice.tsx, src/app/(auth)/login/page.tsx, src/lib/auth/permissions.ts, eslint.config.mjs ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# SYS-01 — Replace Better Auth with Supabase Auth — review report

Nine checks, nine citations, no finding. The verdict is `PASS` and the ticket advances to QA.

This session was fresh, read files only, and had no message channel to the Developer or to any other
agent (RULE-13). `chat_before_verdict: none` is true as written.

## Checklist

| # | Check | Verdict | Citation |
|---|---|---|---|
| R1 | `git diff --name-only` is a subset of `allowed_paths` (RULE-03) | **PASS** | Eleven paths attributable to this ticket, each matching `ticket.yaml:allowed_paths` (`ticket.yaml:158-170`); verified by `node scripts/check-allowed-paths.mjs` → `allowed-paths: PASS` |
| R2 | typecheck exit 0 | **PASS** | `pnpm typecheck` → `tsc --noEmit`, exit `0`, no errors |
| R3 | lint exit 0 | **PASS** | `pnpm lint` → `eslint .`, exit `0`, no diagnostics |
| R4 | No component imports Prisma or reaches the database directly (RULE-02) | **PASS** | `eslint.config.mjs:31-54,108-136` enforces Prisma restriction globally and in auth; `pnpm lint` exit `0`; grep for Prisma imports outside `src/lib/data` returns nothing |
| R5 | Every contract item in design section 1 is implemented (RULE-04) | **PASS** | 16 contract items across §§1.1–1.6, each cited in *R5 detail* |
| R6 | Permission gating matches design section 2 | **PASS** | `02-design.md:583-625` (§2: no active role gate; `src/lib/auth/permissions.ts:1-58` unmodified and exports `ROLE_RANK`, `ROLES`, `can()` untouched) |
| R7 | Every `data-testid` in design section 6 exists in the markup | **PASS** | 1 new + 5 existing testids all located in markup — table in *R7 detail* |
| R8 | No invariant violated (RULE-07) | **PASS** | `INV-08` reasoned individually in *R8 detail* — held structurally by absence of routes/controls; flag is client configuration per AC-12 |
| R9 | No dependency added without an ADR | **PASS** | `package.json:36` adds `@supabase/ssr` and removes `better-auth`, authorized by `ADR-006` (`.ai/registry/decisions/ADR-006-supabase-auth-replaces-better-auth.md:1-125`) |

## R1 detail

Eleven paths touched in the working tree, all matching `allowed_paths`:

| Path in the diff | `allowed_paths` entry | Evidence / Purpose |
|---|---|---|
| `package.json` | `package.json` | `better-auth` removed, `@supabase/ssr` added (`package.json:36`) |
| `pnpm-lock.yaml` | `pnpm-lock.yaml` | Lockfile updated by pnpm 10 |
| `.env.example` | `.env.example` | Better Auth vars removed, `SUPABASE_URL` / `SUPABASE_ANON_KEY` added (`.env.example:40-52`) |
| `src/lib/auth/auth.ts` | `src/lib/auth/auth.ts` | Deleted (`test -e` fails) |
| `src/lib/auth/client.ts` | `src/lib/auth/client.ts` | Deleted (`test -e` fails) |
| `src/app/api/auth/[...all]/route.ts` | `src/app/api/auth/[...all]/route.ts` | Deleted (`test -d src/app/api/auth` fails) |
| `src/lib/auth/supabase.ts` | `src/lib/auth/supabase.ts` | Server-only Supabase client constructor (`src/lib/auth/supabase.ts:52-94`) |
| `src/lib/auth/self-signup.ts` | `src/lib/auth/self-signup.ts` | Storage key and fail-closed resolver (`src/lib/auth/self-signup.ts:25-78`) |
| `src/app/(auth)/login/self-signup-notice.tsx` | `src/app/(auth)/login/self-signup-notice.tsx` | Client island reporting setting (`self-signup-notice.tsx:63-76`) |
| `src/app/(auth)/login/page.tsx` | `src/app/(auth)/login/page.tsx` | Imports and renders `SelfSignupNotice` (`page.tsx:4,39`) |
| `.ai/board/tickets/SYS-01/*` | `.ai/board/tickets/SYS-01/**` | `01-story.md`, `02-design.md`, `03-impl-log.md`, `99-questions.md`, `ticket.yaml` |

`src/lib/auth/permissions.ts` and `tests/unit/permissions.test.ts` are untouched. `tests/` has no untracked files from developer (unit/e2e test files reserved for QA).

## R5 detail

Design section 1 item by item compared against the implementation:

| Contract item | Implemented at | Matches signature |
|---|---|---|
| §1.1 Three deletions | `auth.ts`, `client.ts`, `route.ts` deleted | yes — files absent from filesystem; `src/app/api/` removed |
| §1.1 `better-auth` removed from `dependencies` | `package.json:36` | yes — `better-auth` absent from `package.json` |
| §1.1 `src/lib/auth/permissions.ts` retained | `src/lib/auth/permissions.ts:1-58` | yes — file exists, unedited |
| §1.2 `requiredEnv` helper | `src/lib/auth/supabase.ts:25-34` | yes — narrows `"SUPABASE_URL" \| "SUPABASE_ANON_KEY"`, throws if unset or `""` |
| §1.2 `createSupabaseServerClient` | `src/lib/auth/supabase.ts:52-94` | yes — async, calls `await cookies()` (`:66`) |
| §1.2 Runtime browser refusal | `src/lib/auth/supabase.ts:59-64` | yes — `typeof window !== "undefined"` throws |
| §1.2 Cookie store `{ getAll, setAll }` | `src/lib/auth/supabase.ts:68-93` | yes — swallows server component set error in try/catch |
| §1.2 Inferred return type | `src/lib/auth/supabase.ts:52` | yes — return type inferred, no `@supabase/supabase-js` import |
| §1.3 `SELF_SIGNUP_STORAGE_KEY` | `src/lib/auth/self-signup.ts:25` | yes — `"sdt.self-signup"` |
| §1.3 `SelfSignupSetting` & literals | `src/lib/auth/self-signup.ts:28,31,32` | yes — `"enabled" \| "disabled"`, `SELF_SIGNUP_ENABLED`, `SELF_SIGNUP_DISABLED` |
| §1.3 `readSelfSignupSetting` | `src/lib/auth/self-signup.ts:55-78` | yes — all five fail-closed paths handled |
| §1.4 `SelfSignupNotice` client component | `src/app/(auth)/login/self-signup-notice.tsx:63-76` | yes — `"use client"` (`:1`), renders `{setting}` inside `data-testid="login-self-signup"` (`:71`). Uses `useSyncExternalStore` per Q-1 deviation to pass eslint `react-hooks/set-state-in-effect` |
| §1.4 `LoginPage` integration | `src/app/(auth)/login/page.tsx:4,39` | yes — server component, renders `SelfSignupNotice` after `login-no-signup` |
| §1.5 `.env.example` edits | `.env.example:40-52` | yes — Better Auth block removed, ADR-002 block corrected, `SUPABASE_URL` / `SUPABASE_ANON_KEY` added without `NEXT_PUBLIC_` |
| §1.6 Rule 1: No `"use client"` in `src/lib/auth/` | `src/lib/auth/` | yes — grep returns 0 matches |
| §1.6 Rule 2: `@supabase/supabase-js` never named | `src`, `tests` | yes — grep returns 0 matches |

## R7 detail

All six selectors from `02-design.md` §6.1 located in markup:

| `data-testid` | Citation in markup | Notes |
|---|---|---|
| `login-self-signup` | `src/app/(auth)/login/self-signup-notice.tsx:71` | New. Renders bare literal `disabled` or `enabled` |
| `login-page` | `src/app/(auth)/login/page.tsx:13` | Root element |
| `login-email` | `src/app/(auth)/login/page.tsx:22` | Email input |
| `login-password` | `src/app/(auth)/login/page.tsx:28` | Password input |
| `login-submit` | `src/app/(auth)/login/page.tsx:30` | Sign-in button |
| `login-no-signup` | `src/app/(auth)/login/page.tsx:35` | Standing note text |

No account creation selector exists.

## R8 detail

Reasoned per ID in `invariants_touched` (`[INV-08]`):

| Invariant | Held by | Citation |
|---|---|---|
| **INV-08** — There is no self-signup. Accounts are created by Manager or Admin only | Held structurally by the absence of any self-signup route or account-creation control in the application (`src/app/(auth)/login/page.tsx:1-43`; Next.js router defines 10 static routes, none of which is `signup`, `register`, or `invite`). `readSelfSignupSetting` (`src/lib/auth/self-signup.ts:55-78`) fails closed on all non-matching inputs. Per ADR-006 (decision 7), `01-story.md` (AC-12), and `02-design.md` §2.2, the localStorage flag `sdt.self-signup` is client-side configuration, not a security enforcement mechanism. In accordance with AC-12, this report states that INV-08 is held by absence of routes and controls, not by the browser storage flag. | `src/app/(auth)/login/page.tsx:1-43`, `src/lib/auth/self-signup.ts:55-78`, `src/app/(auth)/login/self-signup-notice.tsx:63-76` |

**No invariant violation was found. Nothing escalates under RULE-07.**

## Findings

None. All nine checks pass with citations.

| # | Check | Finding | Routes to | Increments rework_count |
|---|---|---|---|---|
| — | — | none | — | — |

`rework_count` stays at `0`.

## Carried into QA

1. **Q-1 in `99-questions.md` is a resolved implementation deviation.** `SelfSignupNotice` uses `useSyncExternalStore` instead of `useState` + `useEffect` because `react-hooks/set-state-in-effect` is enabled in `eslint-config-next@16.3.0`. The component behavior and rendered output are identical to design specification.
2. **Q-2 in `99-questions.md` regarding check D6.** `node scripts/check-docs.mjs` fails D6 on 6 instances where ADR-002 and ADR-006 mention the deleted paths (`auth.ts`, `client.ts`, `route.ts`). D12 (revert condition check) passes with 0 findings. This is an inherited governance check limitation on deleted paths cited in ADRs, which are under `.ai/registry/**` (human-only under RULE-01).

## Verdict

**`PASS`.** R1 through R9 pass, each with a `file:line` or command citation. The contract in design section 1 is implemented in full, permission gating matches section 2, all testids in section 6 exist in markup, and INV-08 is preserved structurally with accurate configuration semantics under AC-12.

The ticket advances to `QA`.
