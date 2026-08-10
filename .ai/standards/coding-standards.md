---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-02, RULE-04]
---

# Coding standards

## TypeScript

- `strict` on. No `any`. `unknown` plus a narrowing check where a type is genuinely open.
- No non-null assertion (`!`) to silence the compiler. If a value can be absent, handle absence.
- Exported functions carry explicit return types. Inference is fine internally; at a module boundary
  the type is documentation and a change detector.
- No default exports except where a framework requires one (Next.js pages, layouts, route handlers).

## Naming

- Files: kebab-case. Components: PascalCase. Functions and variables: camelCase.
- Data-access functions read as verbs against an entity: `listRooms`, `getRoomById`, `createRoom`,
  `updateRoom`, `deleteRoom`. Both seam implementations use the same names — this is what
  `tests/unit/seam-parity.test.ts` asserts.
- Booleans read as predicates: `isPrimary`, `canAssign`, `hasOccupant`.
- No abbreviations that are not already in `.ai/registry/glossary.md`.

## Imports

- Absolute via `@/` for anything outside the current directory.
- The `no-restricted-imports` rule enforcing RULE-02 is not to be disabled with an inline comment. An
  `eslint-disable` on that rule is a review failure under R4 regardless of the justification given.

## Server actions

Every server action, in this order:

1. `"use server"`
2. Parse input with the Zod schema named in design section 1
3. Check permission with `can()` against `ROLE_RANK`
4. Call the seam
5. Return a typed result

Never return a raw error object to the client. Never trust a role passed in the payload.

## Error handling

- Throw for programmer errors. Return a typed failure for expected ones — a duplicate name, a seat
  already occupied, a permission denial.
- An invariant that cannot be satisfied is not an expected failure. It means state is already wrong,
  and per RULE-07 it escalates rather than being handled.

## Comments

Comments explain why, not what. A comment restating the line below it is noise. A comment naming an
invariant ID at the point that upholds it is valuable, because the next person to edit that line will
otherwise not know it is load-bearing.

No emoji in source files.

## Formatting

Prettier defaults, with the project's ESLint config as the arbiter on conflict. Line endings are LF,
fixed by `.gitattributes`; do not configure an editor to override it.

## What not to do

- Do not add a dependency without an ADR. Check R9.
- Do not widen a function's responsibility because it was convenient. A function that both reads and
  writes cannot be reasoned about at the seam.
- Do not cache a derived value that an invariant defines as derived. INV-03 makes seat status
  derived; a cached copy is a second source of truth.
- Do not write a `TODO` without a `(verify)` or an owner. An unowned TODO is a comment.
