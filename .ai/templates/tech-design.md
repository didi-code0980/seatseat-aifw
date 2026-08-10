---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-02, RULE-03, RULE-04, RULE-05, RULE-09, RULE-14, RULE-16]
---

# Template: tech design

Written by `tech-lead-design` as `02-design.md`. Copy everything below the line.

**Gate:** all seven sections complete; `allowed_paths` enumerated and written back to `ticket.yaml`.

All seven are required. A section answered "none" is complete; a section left out is not, and the two
are different because "none" is a decision and an omission is a gap nobody noticed.

---

```yaml
---
ticket: <ID>
stage: DESIGN
agent: tech-lead-design
produced_at: <ISO8601>
inputs_read: [ .ai/board/tickets/<ID>/01-story.md, .ai/registry/invariants.md, .ai/standards/architecture.md ]
consulted:
  - with: ba
    asked: "..."
    answer: "..."
    resulted_in_amendment: true
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: IN_PROGRESS
---
```

## 1. Contract

Exact server action signatures, Zod schemas, and TypeScript return types (RULE-04).

Exact means copy-pasteable. Every field name that will appear in the code appears here first, because
the Developer may not invent one, and a name invented at implementation time propagates into the DTO,
the mock, the Prisma mapping, the schema, and the selectors before anyone reviews it.

```ts
// signatures, schemas, and return types
```

## 2. Permission model

Which `ROLE_RANK` gate applies to each action and each control. Include the denials. State where the
check lives — the server action, always, with `PermissionGate` as a UI affordance only.

## 3. Seam impact

Which functions in `src/lib/data/` change, or "none". If a new function is added it appears in both
the mock and the Prisma implementation with the same name and arity, or `tests/unit/seam-parity.test.ts`
fails.

## 4. Schema delta

`none`, or a description plus a link to an ADR. Anything other than `none` without an approved ADR
fails Definition of Ready, and applying a migration is human-only (RULE-09).

## 5. allowed_paths

An explicit glob list, written back into `ticket.yaml`. This is what
`.claude/hooks/guard-allowed-paths.mjs` reads and what review check R1 and CI check against.

```yaml
allowed_paths:
  - "src/..."
  - "tests/..."
```

Enumerate. A glob broad enough to be convenient is a glob broad enough to make R1 meaningless.

## 6. Testability contract

Every `data-testid`, with the element it identifies.

RULE-05 makes this the only channel through which selectors reach QA. A control missing from this
table does not exist as far as QA is concerned, and check R7 verifies the reverse: every testid here
exists in the markup.

| data-testid | Element | Used by |
|---|---|---|
|  |  | AC-n |

## 7. Rejected alternatives

At least one, with the reason it was rejected. Not a strawman — an approach that was genuinely
plausible.

This section is what makes the design reviewable. A design with one option presented is a design
whose reasoning cannot be checked, only agreed with.

## Changelog

- `<ISO8601>` — section `<n>` `<what changed>`. Raised by `<agent>`. Amended by `<agent>`.
