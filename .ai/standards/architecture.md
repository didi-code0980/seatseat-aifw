---
doc_version: 3
last_updated: 2026-08-25
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

**Read "Prisma" above as "the real implementation" from 2026-08-25.** ADR-007 replaced it with
`@supabase/supabase-js`, so `src/lib/data/prisma/**` becomes a `supabase/` sibling and the restricted
import becomes `@supabase/supabase-js` outside it. The quotation is left verbatim because it is the
bootstrap wording RULE-02 was written from, and because **nothing about the seam itself changed** —
that is the point of having had one. Every sentence in this section is true with the adapter's name
swapped, and the rest of this file is written that way deliberately: where it says Prisma, the
argument is about the implementation behind the seam, not about the vendor.

**One sentence in it does become weaker, and only one.** *"Enforced by an ESLint
`no-restricted-imports` rule — a rule beats a convention"* was backed up by something stronger than a
rule: `@prisma/client` cannot run in a browser, so a component importing it failed at build time.
`@supabase/supabase-js` is isomorphic. The lint rule and check D12 are now the whole enforcement, and
both live in files a pull request can edit. MD-33 carries the gap; R4 is the human half.

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

Next.js 16, `@supabase/ssr` and `@supabase/supabase-js` are past reliable recall — as were Prisma 7
and Better Auth, which ADR-007 and ADR-006 removed and which are still in `package.json` on `main`
until the implementing tickets land. Inspect installed types under
`node_modules/` or fetch current documentation before writing configuration against them. Where a
shape could not be verified, the code carries `TODO(verify):` and the phase report lists it. A
`TODO(verify)` is a known unknown; a confident guess is an unknown unknown, and the second one is
what breaks at 2am.
