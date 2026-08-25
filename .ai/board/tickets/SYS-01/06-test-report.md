---
ticket: SYS-01
stage: QA
agent: qa
produced_at: 2026-08-25T09:47:30Z
inputs_read: [ .ai/board/tickets/SYS-01/01-story.md, .ai/board/tickets/SYS-01/05-test-plan.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: DONE
---

# SYS-01 — Replace Better Auth with Supabase Auth — test report

Executed in isolated dispatch (RULE-13). `chat_before_verdict: none` is attested.
All acceptance criteria from `01-story.md` map to named tests and verified observations.

## Results

| Suite | Command | Exit code | Passed | Failed | Skipped |
|---|---|---|---|---|---|
| unit | `pnpm test` | 0 | 76 | 0 | 0 |
| e2e | `pnpm test:e2e` | 0 | 42 | 0 | 0 |
| verify | `pnpm verify` | 0 | 76 unit + build | 0 | 0 |

All test suites and verification scripts exited 0. Zero skipped tests.

## AC coverage

| AC | Test name / Observation | Result |
|---|---|---|
| AC-1 | `AC-1: Better Auth is absent from package.json dependencies and lockfile` | **PASS** |
| AC-2 | `AC-2: The Better Auth surface files no longer exist, and permissions.ts exists` | **PASS** |
| AC-3 | `AC-3: @supabase/ssr is present and is the only Supabase package in package.json` | **PASS** |
| AC-4 | `AC-4: No @supabase/ imports exist outside src/lib/auth/ and no 'use client' file in src/lib/auth` | **PASS** |
| AC-5 | `AC-5: eslint.config.mjs names @supabase/* in restricted imports and only exempts src/lib/auth/**` | **PASS** |
| AC-6 | `AC-6: The documentation audit passes, with no D12 finding` | **PASS** |
| AC-7 | `AC-7: src/lib/auth/permissions.ts exists and authorization is intact` | **PASS** |
| AC-8 | `AC-8: The application still builds and everything that passed still passes` | **PASS** |
| AC-9 | `AC-9: the login route renders without error, and no self-signup path exists — INV-08` | **PASS** |
| AC-10 | `AC-10: the self-signup configuration flag is disabled when it is absent — INV-08`<br>`AC-10 (refusal): invalid flag values in localStorage fail closed to disabled — INV-08`<br>`readSelfSignupSetting` fail-closed unit tests | **PASS** |
| AC-11 | `AC-11: enabling the flag does not produce a self-signup path — INV-08`<br>`readSelfSignupSetting` exact match unit test | **PASS** |
| AC-12 | `AC-12: The flag is not reported as an enforcement of INV-08` (artifact review) | **PASS** |

## Failures

| # | Test | Expected | Actual | Routes to | Increments rework_count |
|---|---|---|---|---|---|
| — | — | none | — | — | — |

No test failures.

**Audit observations:**
- Check D12 (revert condition check for `@supabase/*` and lint configurations) passes cleanly with 0 findings.
- Check D6 reports 6 findings against historical references to deleted paths inside `.ai/registry/decisions/` (ADR-002 and ADR-006). As documented in `99-questions.md` Q-2 and `04-review.md`, registry files are human-only under RULE-01 and outside `allowed_paths`.

## Invariant observations

| Invariant | Held | Evidence |
|---|---|---|
| **INV-08** — There is no self-signup. Accounts are created by Manager or Admin only | **Held** | Verified via `tests/e2e/self-signup.spec.ts` (AC-9, AC-10, AC-11), `tests/unit/self-signup.test.ts` (AC-10, AC-11), and `tests/e2e/smoke.spec.ts`. Held structurally by the complete absence of sign-up/registration routes, handlers, or account creation controls. In accordance with AC-12, this report affirms that the localStorage flag `sdt.self-signup` is client-side configuration and not an enforcement mechanism of INV-08. |

## Selector gaps encountered

None. All selectors (`login-self-signup`, `login-page`, `login-email`, `login-password`, `login-submit`, `login-no-signup`) were defined in `02-design.md` section 6.1 and utilized directly.

## Verdict

**`PASS`**. All 12 acceptance criteria are fully met. Unit tests (76), E2E tests (42), lint, typecheck, and Next.js static build all pass cleanly. `rework_count` remains 0.

The ticket advances to `DONE`.
