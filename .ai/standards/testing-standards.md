---
doc_version: 2
last_updated: 2026-08-12
governed_by: [RULE-05, RULE-07, RULE-08]
---

# Testing standards

## Tools

Vitest with `@vitejs/plugin-react` and Testing Library for unit and component tests. Playwright for
end-to-end. Both run from `pnpm verify` in CI, and `pnpm test:e2e` locally.

## The selector contract

RULE-05 governs this section, and `.claude/hooks/guard-read-scope.mjs` enforces it.

This is not a restriction on QA's curiosity. It is what makes the QA gate mean something. A QA agent
that reads the implementation writes tests that pass against the implementation, including against
the parts of it that are wrong. A QA agent that can only see the story and the selector contract
writes tests against the specified behaviour, and the difference between the two is exactly the
defect the gate exists to catch.

The consequence is that a `data-testid` missing from design section 6 does not exist. QA cannot
address it, cannot test it, and must not go looking for it. Check R7 verifies the reverse direction:
every testid in section 6 exists in the markup.

## Test naming

Every acceptance criterion has an ID (`AC-1`, `AC-2`). Every AC maps to at least one named test, and
the test name contains the AC ID:

```
test("AC-3: a manager assigning an occupied seat is refused", ...)
```

The Definition of Done requires this mapping to be complete. A story with five ACs and four mapped
tests is not done, and the unmapped AC is the one that will break.

## What each level covers

| Level | Covers | Does not cover |
|---|---|---|
| Unit | Pure logic, permission rank comparisons, seam parity | Rendering, routing |
| Component | A component against the mock seam | Real data, auth session |
| E2E | A full acceptance criterion through the UI | Anything that needs a schema not yet approved |

## The two mandatory unit tests

**`tests/unit/seam-parity.test.ts`.** Imports both seam implementations and asserts identical
exported key sets and equal arity per export. This is what makes the mock-to-Prisma swap safe, and it
is the reason the swap can be a configuration change rather than a rewrite.

Parity is necessary and not sufficient. Matching names and arity does not prove matching return
shapes; a mock that returns a field the Prisma implementation cannot produce passes parity and breaks
at runtime. Where a shape is subtle, assert it.

**`tests/unit/permissions.test.ts`.** Asserts `ROLE_RANK` ordering and the `can()` truth table across
all three roles. Every role, every action, both directions — including the denials. A permission test
that only asserts the allow cases is a test that passes when the check is deleted.

## Invariants in tests

An invariant is not an acceptance criterion and is not tested by a single happy-path case. Where a
test exercises an invariant, it asserts the *refusal*: that the second occupant is rejected (INV-01),
that the second primary device is rejected (INV-04), that the primary device downgrades on exit
(INV-06).

Per RULE-07 an actual invariant violation escalates rather than entering rework, so a test that
detects one is reporting a modelling problem, not a bug to be fixed in place.

## Fixtures

Unit and E2E share fixture data with the seed, via `src/lib/data/fixtures.ts`. Tests must not invent
entities inline — a test fixture that exists only in one test file drifts from the seed and produces
failures that reproduce in CI and not locally.

## Fixtures that share the implementation's assumptions

A fixture is written by the person who wrote the code, from the same understanding of the input. When
that understanding is wrong, the fixture is wrong in the same direction, and the tests pass.

**This has already happened here.** Check D12 in `scripts/check-docs.mjs` looks for a Supabase entry
in the `no-restricted-imports` list of `eslint.config.mjs`. Its first implementation stripped comments
with a regular expression before searching. That is wrong on exactly one file — the one it exists to
read: the pattern list contains `"@prisma/client/*"`, whose `/*` opened a block comment that then
closed at the `*/` inside `"**/generated/prisma"`, deleting every entry between them. A Supabase entry
placed there vanished before the search ran.

Fourteen tests covered D12. All fourteen passed. The check was inert against the only file it will
ever run on, and the tests could not see it, because every fixture used simple patterns like
`"@supabase/supabase-js"` and none contained a glob with `/*` or `*/` in it. The fixtures were built
from the same mental model as the implementation — "patterns are plain package names" — so they
confirmed the model rather than testing the code. It was found by running the check against the real
file and watching it report nothing.

**The rule.** Any check whose target is a specific real file in this repository gets at least one
test built from that file's actual content, not from a simplified fixture. Read the real file in the
test. If the check is meant to fire, inject the triggering content into a copy of the real file and
assert it fires; if it is meant to stay quiet, assert that against the file as it stands.

Simplified fixtures are still worth having — they isolate the case and they name the intent. They are
not sufficient on their own, because the thing they cannot test is whether you understood the input.

**This is the same reasoning as RULE-05.** QA does not read `src/**`; it works from design section 6,
so the test is not derived from the implementation it judges. A fixture hand-written by the author of
the check is derived from the check, in the same way and with the same failure: it agrees with the
code about what the world looks like. The real file is the independent source, and it is the only one
available for a check that reads a specific file.

Applies to `scripts/check-docs.mjs` and every `.claude/hooks/*.mjs` guard that resolves a real path —
`guard-registry.mjs`, `guard-allowed-paths.mjs`, `guard-tracker-scope.mjs`, `guard-read-scope.mjs`,
`guard-project-root.mjs`, `chat-guard.mjs`.

## What makes a test bad here

- Asserting on a CSS class or a DOM path instead of a `data-testid`. Both break on refactor and
  neither is in the selector contract.
- A snapshot test as the only coverage of a behaviour. A snapshot records what the code did, not what
  it should do, and it is updated by the same agent that broke it.
- A test that mocks the seam inside a component test. The mock seam is already the mock; mocking it
  again tests the mock.
- A skipped test left in the suite. Delete it or fix it; a skip is a passing test that checks
  nothing.
