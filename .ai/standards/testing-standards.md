---
doc_version: 1
last_updated: 2026-08-10
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

## What makes a test bad here

- Asserting on a CSS class or a DOM path instead of a `data-testid`. Both break on refactor and
  neither is in the selector contract.
- A snapshot test as the only coverage of a behaviour. A snapshot records what the code did, not what
  it should do, and it is updated by the same agent that broke it.
- A test that mocks the seam inside a component test. The mock seam is already the mock; mocking it
  again tests the mock.
- A skipped test left in the suite. Delete it or fix it; a skip is a passing test that checks
  nothing.
