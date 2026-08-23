---
doc_version: 2
last_updated: 2026-08-10
governed_by: [RULE-01, RULE-02, RULE-04]
---

# Architecture

## The seam

> All components call async data-access functions in `src/lib/data/` with stable signatures. The seam
> is backed first by mock data, then by Prisma, without touching component code. No component, page,
> or server action outside `src/lib/data/prisma/**` may import `@prisma/client` or reach the database
> directly. Enforced by an ESLint `no-restricted-imports` rule — a rule beats a convention, and it
> turns R4 from a reviewer's judgement into a lint failure.

This is RULE-02 in its operational form.

### Why a seam at all

The application is being built by an agent loop before the database schema is approved. Without a
seam, every component written in that window would encode a guess about the schema, and approving the
schema later would mean rewriting components rather than rewriting one directory.

With the seam, the mock implementation is written against the DTOs in `src/lib/data/types.ts`, the UI
is built and tested against it, and swapping in Prisma is a change confined to
`src/lib/data/prisma/**`. `tests/unit/seam-parity.test.ts` is what makes that swap safe: it asserts
that both implementations export identical key sets with equal arity. A parity test that passes means
the swap cannot fail at the import boundary.

### Shape

```
src/lib/data/
  index.ts        switches on process.env.DATA_SOURCE ("mock" | "prisma", default "mock")
                  re-exports one namespace per entity
  types.ts        DTOs. No Prisma type leaves src/lib/data/prisma/**
  fixtures.ts     shared fixture data, also consumed by prisma/seed.ts
  mock/           one file per entity
  prisma/         same filenames, same exported signatures
```

Components import from `@/lib/data` and nothing deeper. Importing `@/lib/data/mock/rooms` directly is
a violation for the same reason importing Prisma is: it binds a component to an implementation.

### What crosses the seam

DTOs defined in `types.ts`. Not Prisma models, not Zod schemas, not `Date` objects that were
serialized differently by the two implementations. If the mock returns a shape the Prisma
implementation cannot produce, the parity test passes and the swap still breaks — parity checks the
interface, and matching the interface is necessary, not sufficient.

## Layers

| Layer | Location | May import |
|---|---|---|
| Components and pages | `src/app/**`, `src/components/**` | `@/lib/data`, `@/lib/auth`, `@/lib/validation`, `@/lib/utils` |
| Server actions | `src/actions/**` | `@/lib/data`, `@/lib/auth`, `@/lib/validation` |
| Seam | `src/lib/data/**` | its own subtree; only `prisma/**` may import `@prisma/client` |
| Auth | `src/lib/auth/**` | Better Auth, `@/lib/data` |
| Validation | `src/lib/validation/**` | Zod only |

A server action validates with Zod, checks permission by `ROLE_RANK`, then calls the seam. All three
steps, in that order, every time. An action that reaches the seam before checking permission has a
authorization bug that no test in the UI layer will find.

## Contract-first

Per RULE-04, the Tech Lead declares signatures, Zod schemas, and return types in design section 1
before the Developer writes code. The Developer implements the declared contract and does not invent
field names.

This exists because a field name invented at implementation time propagates into the DTO, the mock,
the Prisma mapping, the Zod schema, and the test selectors before anyone reviews it, and renaming it
afterwards touches every one of those places.

## Framework notes

Next.js 16, Prisma 7, and Better Auth are past reliable recall. Inspect installed types under
`node_modules/` or fetch current documentation before writing configuration against them. Where a
shape could not be verified, the code carries `TODO(verify):` and the phase report lists it. A
`TODO(verify)` is a known unknown; a confident guess is an unknown unknown, and the second one is
what breaks at 2am.
