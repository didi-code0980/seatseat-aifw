---
ticket: SYS-01
stage: QA
agent: qa
produced_at: 2026-08-25T09:47:00Z
inputs_read: [ .ai/board/tickets/SYS-01/01-story.md, .ai/board/tickets/SYS-01/02-design.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: QA
---

# SYS-01 — Replace Better Auth with Supabase Auth — test plan

Written from `01-story.md` and `02-design.md` section 6 only (RULE-05). `src/**` was not read.
Isolated dispatch (RULE-13), `chat_before_verdict: none`.

## Coverage map

Every AC from `01-story.md` maps to at least one named test.

| AC | Test name | Level | Selectors used |
|---|---|---|---|
| AC-1 | `AC-1: Better Auth is absent from package.json dependencies and lockfile` | unit / non-selector | none (package.json, lockfile) |
| AC-2 | `AC-2: The Better Auth surface files no longer exist, and permissions.ts exists` | unit / non-selector | none (file existence) |
| AC-3 | `AC-3: @supabase/ssr is present and is the only Supabase package in package.json` | unit / non-selector | none (package.json) |
| AC-4 | `AC-4: No @supabase/ imports exist outside src/lib/auth/ and no 'use client' file in src/lib/auth` | unit / lint / non-selector | none (source tree scan) |
| AC-5 | `AC-5: eslint.config.mjs names @supabase/* in restricted imports and only exempts src/lib/auth/**` | unit / lint | none (eslint.config.mjs) |
| AC-6 | `AC-6: The documentation audit passes, with no D12 finding` | audit | none (`scripts/check-docs.mjs`) |
| AC-7 | `AC-7: src/lib/auth/permissions.ts exists and authorization is intact` | unit | none (`tests/unit/permissions.test.ts`) |
| AC-8 | `AC-8: The application still builds and everything that passed still passes` | build & verify | none (`pnpm verify`) |
| AC-9 | `AC-9: the login route renders without error, and no self-signup path exists — INV-08` | e2e | `login-page`, `login-email`, `login-password`, `login-submit`, `login-no-signup` |
| AC-10 | `AC-10: the self-signup configuration flag is disabled when it is absent — INV-08`<br>`AC-10: SELF_SIGNUP_STORAGE_KEY matches contractual key`<br>`AC-10: readSelfSignupSetting defaults to disabled when storage is absent or null`<br>`AC-10: fail-closed paths return disabled` | e2e & unit | `login-page`, `login-self-signup`, `login-no-signup` |
| AC-11 | `AC-11: enabling the flag does not produce a self-signup path — INV-08`<br>`AC-11: readSelfSignupSetting returns enabled ONLY when storage returns exact string 'enabled'` | e2e & unit | `login-page`, `login-self-signup`, `login-no-signup`, `login-submit` |
| AC-12 | `AC-12: The flag is not reported as an enforcement of INV-08` | inspection | none (ticket artifacts: `03-impl-log.md`, `04-review.md`, `05-test-plan.md`, `06-test-report.md`) |

## Refusal cases

1. **AC-10 Fail-closed paths:** Storage key values that are absent, boolean-like (`"true"`), case-differing (`"ENABLED"`), empty (`""`), error-throwing, or arbitrary (`"1"`, `"false"`, `"yes"`) all evaluate strictly to `"disabled"`.
2. **AC-10 (e2e refusal):** Injected invalid value `"true"` into `localStorage` resolves `login-self-signup` to literal `"disabled"`.
3. **AC-9 & AC-11 Absence of registration:** No account creation button or link exists on `/login` in either flag state (`count: 0`).
4. **AC-4 Client-side Supabase refusal:** No `@supabase/*` imports outside `src/lib/auth/**` and no `"use client"` within `src/lib/auth/**`.

## Invariant probes

For each ID in `invariants_touched` (`[INV-08]`):

| Invariant | Probe test | If absent, why |
|---|---|---|
| INV-08 | `tests/e2e/self-signup.spec.ts` (`AC-9`, `AC-10`, `AC-11`) & `tests/unit/self-signup.test.ts` (`AC-10`, `AC-11`) | Asserts absence of sign-up route, absence of account-creation controls, and fail-closed flag behavior. Held structurally by lack of sign-up route/actions; per AC-12, the browser storage flag is client-side configuration and not security enforcement. |

## Fixtures

None needed. SYS-01 changes auth infrastructure and client-side configuration, operating without backend data entities.

## Out of scope for this plan

1. Database schema migrations or wiring (`Member.authUserId`, Prisma).
2. Live Supabase authentication sessions and network calls.
3. Provider dashboard configuration.
4. Pre-existing script test failures in `scripts/tests/check-docs.test.mjs` (MD-16, outside `allowed_paths`).

## Selector gaps

None. All required testids (`login-self-signup`, `login-page`, `login-email`, `login-password`, `login-submit`, `login-no-signup`) were specified in `02-design.md` section 6.1 and are present in markup.
