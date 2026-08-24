---
ticket: MEM-01
stage: IN_PROGRESS
agent: developer
produced_at: 2026-08-24T08:40:28Z
inputs_read: [ .ai/board/tickets/MEM-01/02-design.md, .ai/board/tickets/MEM-01/01-story.md, .ai/board/tickets/MEM-01/ticket.yaml, .ai/board/tickets/MEM-01/99-questions.md, .ai/board/tickets/MEM-01/06-test-report.md, .ai/steward/context.md, .ai/standards/coding-standards.md, .ai/standards/architecture.md, next.config.ts, playwright.config.ts, node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md ]
consulted: []
chat_before_verdict: none
gate: PASS
blocking_reason: ""
next_state: REVIEW
---

# MEM-01 — implementation log

**Version 3, 2026-08-24 — the REWORK cycle for finding F-9. One line, in one file.** Everything from
the *Version 2* paragraph down is unchanged and describes the two earlier cycles. Read this section
first: it is the whole of what changed, and it is a single `export` statement.

`rework_count` stays 0 and this log does not ask for it to move. `06-test-report.md` pass 3 routed
**one** item — F-9, to `tech-lead-design` — and `02-design.md` version 4 answered it by adding
contract item **§1.6** and putting `src/app/(app)/layout.tsx` into `allowed_paths`. A contract item in
a file the design enumerates is the Developer's work whoever caused it (RULE-08), and nothing in the
routed item was this agent's.

**The cumulative list of files this ticket has touched is the union of three tables**, following the
shape version 2 set rather than editing a section a passed review already read: the eight source files
under *Files touched* below (version 1), `src/actions/members.ts` under *Rework cycle 1* (version 2),
and `src/app/(app)/layout.tsx` under *Rework cycle 2* immediately below (version 3). Nine source files
in total, every one inside `allowed_paths`.

**On the `produced_at` above, because it reads as going backwards.** It is `date -u` on the machine
that ran this cycle, `2026-08-24T08:40:28Z`, and it is *earlier* than version 2’s `09:26:00Z` in the
same field and earlier than several stage stamps in `ticket.yaml`. The real clock is recorded rather
than a value invented to sort after the last one. Order the cycles by their headings, not by these
fields.

## Rework cycle 2 — F-9, and one line

### What the design changed

`02-design.md` version 4 (`2026-08-24T05:36:58Z`) added a section that did not exist before. Section
**1.6, Route rendering**, states its contract as *"the whole of it"* and then gives one statement:

```ts
export const dynamic = "force-dynamic";
```

at module scope in `src/app/(app)/layout.tsx`, below the existing `import Link from "next/link";` and
above `const NAV`. `allowed_paths` gained that path in the same version, with the constraint attached
to it in `ticket.yaml`: *"ONE LINE ONLY … any other edit in this file is an R1 finding."*

That is the entire `src/**` delta of version 4. Section 1.4's three `revalidatePath("/devices")` calls
from version 2 are correct, are still there, and were not touched — section 1.6 is explicit that they
are *not sufficient* rather than wrong.

### What was changed

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/app/(app)/layout.tsx` | modified | Every `(app)` route was prerendered at build time and served from the incremental cache, so `/devices` could serve a copy older than a member write that had already landed — which is AC-11 failing at `tests/e2e/members.spec.ts:782`. One `export` moves all seven `(app)` routes to per-request rendering | §1.6 |

Nothing else was touched. The eight version 1 files and the version 2 change to `src/actions/members.ts`
are byte-identical to what `tech-lead-review` passed on R1 to R9 at pass 3.

### Contract items, version 3

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.6 Route rendering | `src/app/(app)/layout.tsx:3` | The one statement section 1.6 specifies, at module scope between the `next/link` import and `const NAV`. No other line of that file differs from `HEAD` |

Section 1.6 is the only item added since version 2. Every item of §1.1 through §1.5 is where the
tables further down this log say it is, and none was re-derived this cycle.

### The line is one line, and a comment explaining it was written and then removed

A four-line comment naming F-9 and AC-11 was added above the `export` first, on the general working
practice this log records at version 1 — *where a comment in the design states a reason, the reason
travels into the code with it.* **It was removed before the gate was run.** `ticket.yaml`'s
`allowed_paths` entry for this file does not say *one contract item*, it says *ONE LINE ONLY … any
other edit in this file is an R1 finding*, and a constraint written that specifically is not a
constraint to improve on at IN_PROGRESS. `git diff` on the path is three lines: the `export`, and the
blank line around it.

The reason is therefore in this log and in design 1.6, and not in the file. A reader of the diff alone
sees an unexplained one-line export; that is a deliberate consequence of the constraint and is named
here so `tech-lead-review` does not read it as an omission.

### The two observables section 1.6 names, both measured

Section 1.6 ends by telling the Developer what to check rather than assume. Both were checked.

**One — the build's rendering modes.** `rm -rf .next && pnpm build`, exit 0:

| Route | Before | After |
|---|---|---|
| `/devices`, `/groups`, `/layout-designer`, `/members`, `/requests`, `/rooms`, `/seats` | `○ (Static)` | **`ƒ (Dynamic)`** |
| `/`, `/login` | `○ (Static)` | `○ (Static)` — unchanged |
| `/_not-found` | `○ (Static)` | `○ (Static)` — unchanged |

Exactly what 1.6 predicts: seven `(app)` routes move, the two routes outside the group do not.

**Two — `pnpm test:e2e` exits 0, and 1.6 says one green run demonstrates less than it appears to.**
So it was run **eight times**, each run against a fresh server process with port 3100 cleared and the
process killed between runs — the condition design 0.0 records as load-bearing, because the mock store
is process-global and a reused server passes vacuously.

| Runs | Exit 0 | Exit 1 | Tests per run |
|---|---|---|---|
| **8** | **8** | **0** | 54 passed, 0 failed, 0 skipped, 0 retried |

Every run is a distinct server process, confirmed from the `[WebServer]` start timestamps in the eight
captured logs (`08:37:00Z` through `08:39:07Z`, roughly one a minute). `retries` is `0` on this
configuration — `playwright.config.ts:10` sets `2` only under `CI`, which was not set — so no run was
rescued by a retry. AC-11 at `tests/e2e/members.spec.ts:749` passed in all eight, including the
assertion at `:779-782` that design 0.0 quotes as the failure that moved F-9's instrument inside this
ticket.

Added to version 3's 16 clean runs and version 4's 8, that is **32 clean runs across three sessions**
against 6 failures in 18 without the line.

### The baseline was not re-measured, deliberately

Reverting the line and running the suite six more times would reproduce a measurement `02-design.md`
section 0.0 already took **on this same tree** at version 4 — 3 exit-0 in 6 — and that QA independently
took at pass 3, 6 in 12 and 5 in 12. Three sessions have measured the failing baseline. What was owed
here was the *after* state, and it is above.

### What this does not do, and what it does not claim

**It does not close F-8.** Design 1.6 says so and it is true of the tree: `/groups`,
`/layout-designer`, `/requests` and `/seats` are revalidated by nothing at all, `src/actions/rooms.ts`
and `src/actions/devices.ts` are outside `allowed_paths`, and neither was opened. F-8's *rendering*
half stops being reachable through a stale surface; F-8 stays open and stays a human's.

**It does not verify F-9's cause, only its repair.** This cycle measured that the suite is green with
the line and relied on three prior sessions for the fact that it is not green without it.

**Four routes with no MEM-01 acceptance criterion change rendering mode.** That is `ground 1` in design
section 0.0, accepted there as a real cost with the narrower instruments rejected in section 7
alternatives J, K and L. It is restated here because the diff does not show it: one line in a layout
changes seven routes, and only three of them are this ticket's.

### `dynamic` was verified against the installed Next, not recalled

`CLAUDE.md` requires it for Next 16 and design 1.6 cites the source, so the citation was opened rather
than trusted. `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md:80-97`
documents `export const dynamic = 'auto' | 'force-dynamic' | 'error' | 'force-static'` on a layout for
this configuration, and `next.config.ts` sets only `reactStrictMode` and `typedRoutes` — Cache
Components is not enabled, which is the one condition under which the route-segment docs record
`dynamic` as removed.

### Gate re-run for this cycle

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | `tsc --noEmit`, clean |
| `pnpm lint` | 0 | `eslint .`, clean, no warnings |
| `pnpm test` | 0 | 5 files, 79 tests, no skips — unchanged by this cycle, run because a layout export can break a render path a unit test imports |
| `pnpm build` | 0 | Clean `.next`, 11 routes, seven now `ƒ (Dynamic)` |
| `pnpm test:e2e` | 0 | **8 runs, 8 exit 0, 54 tests each.** Run this cycle and not the last two, because §1.6 makes it the acceptance test for the contract item |
| `git diff --name-only` subset of `allowed_paths` | yes | One source file this cycle, `src/app/(app)/layout.tsx`, added to `allowed_paths` at design version 4 |

`.ai/board/metrics.md` is still dirty and is still not this ticket's — the same two `ba` rows the note
under *Files touched* describes and `tech-lead-review` confirmed at review passes 2 and 3.

### One pre-existing audit failure, named so it is not read as this cycle’s

`pnpm docs:audit` exits **1** with three D11 errors — `02-design.md`, `99-questions.md` and
`ticket.yaml` each reference `ADR-006`, which has no file in `.ai/registry/decisions/` **on this
branch**. It exists on `origin/main`; `feat/MEM-01` was cut from `55054cb`, which predates it.
This is the merge-ordering item `02-design.md` section 0 has carried since DESIGN, and the rebase that
section already requires before `/ship` clears it. Nothing this cycle wrote references ADR-006, and
`docs:audit` is not part of the IN_PROGRESS gate. Two D8 warnings are advisory and also predate this
cycle.

### F-7's repair and QA's two spec files were not touched

`tests/e2e/devices.spec.ts:373` still carries QA's one-line retrying assertion, and
`tests/unit/members.test.ts` and `tests/e2e/members.spec.ts` are QA's artifacts. All three were **run**
this cycle and none was **written**. `git diff` on the three is empty relative to the state review pass
3 and QA pass 3 left them in.

---

**Version 2, 2026-08-24 — the REWORK cycle for finding F-6.** Everything after the *Rework cycle 1*
section is version 1 and is unchanged; it describes the implementation `tech-lead-review` passed on
R1 to R9 and `qa` covered with twenty-one green tests. Read the rework section first — it is the
whole of what changed, and it is three lines of code.

`rework_count` stays 0 and this log does not ask for it to move. `06-test-report.md` routed three
items and none was the Developer's: F-1 to F-3 went to `ba`, F-6 and F-7 to `tech-lead-design`. F-6
came back as a contract change to design section 1.4 step 5, and a contract change to a file already
in `allowed_paths` is the Developer's work whoever caused it.

Ten files in `allowed_paths` were available; **eight were touched and two were not**. The two are
`tests/unit/members.test.ts` and `tests/e2e/members.spec.ts`, which belong to QA — the Developer's
artifacts out are code plus this log, and `.ai/01-operating-model.md` gives the test plan, the tests
and the test report to the QA stage. They are listed under Files **not** touched below so that a
diff shorter than `allowed_paths` is not read as an omission.

`02-design.md` was read first and in full. Section 1 is copy-pasteable and was treated as literal:
every type, every schema, every function signature and every one of the six seam rules is
transcribed rather than re-derived. Where a comment in the design states a reason, the reason
travels into the code with it, because the reviewer sees the diff and the design but the next
developer sees only the diff.

## Rework cycle 1 — F-6, and nothing else

### What the design changed

`02-design.md` version 2 (`2026-08-24T01:59:07Z`) rewrote one step. Section 1.4 step 5 read
*`revalidatePath("/members")` on the three write actions*; it now reads **`revalidatePath("/members")`
and `revalidatePath("/devices")`**.

That is the entire `src/**` delta of version 2, and the design says so in terms: *"This is the only
`src/**` change in version 2 and it returns the ticket to the Developer."*

### What was changed

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/actions/members.ts` | modified | Adds `revalidatePath("/devices")` to `createMember`, `updateMember` and `deleteMember`, and the block comment that says why two paths and not the whole layout | §1.4 step 5, version 2 |

Nothing else was touched. Seven of the eight version 1 source files are byte-identical to what passed
review, and that is deliberate: F-6 is a one-line contract change, and widening the diff would cost
`tech-lead-review` the ability to see that at a glance.

### Why the reasoning sits on the import rather than at the three call sites

The design's justification runs to three paragraphs — what QA measured, why both paths and no third,
and why not `revalidatePath("/", "layout")`. Repeating it three times would be three copies to keep
true. It sits once at `src/actions/members.ts:17-33`, beside the `next/cache` import it explains, and
each call site carries a one-line pointer at it (`:144`, `:175`, `:225`). The `getMemberReferences`
exemption is stated in the same block, because the reason it does *not* revalidate belongs with the
reason the other three do.

The grep the design cites was re-run rather than transcribed: `grep -rln "members" src/app` returns
`(app)/layout.tsx`, `(app)/members/members-manager.tsx`, `(app)/members/page.tsx` and
`(app)/devices/page.tsx`. Two routes render member data and `layout.tsx` holds nav labels only, so the
two enumerated paths are exhaustive.

### F-6 re-measured, by the three steps that found it

Not asserted. A production build was served on port 3100 with `DATA_SOURCE=mock` and driven with
Playwright, repeating `99-questions.md` F-6's own measurements:

| Step | QA measured, version 1 | Measured now |
|---|---|---|
| `/devices` owner options before any write | 4 | **4** |
| Create a member on `/members`, navigate to `/devices`, open the dialog | 4 — new member absent | **5 — new member present** |
| Hard-reload `/devices` and reopen — rules out the client router cache | 4 — still absent | **5 — still present** |
| Force a refresh by creating an unrelated device | 5 | not needed |

The third row is the one that matters: a hard reload bypasses the client router cache, so a pass
there is the server's own cache being correctly invalidated and not a rendering artefact.

`DEV-01`'s AC-2 — an owner *chosen from the members the system holds* — is observably true again.

### Gate re-run for this cycle

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | |
| `pnpm lint` | 0 | |
| `pnpm test` | 0 | 5 files, 79 tests — QA's `tests/unit/members.test.ts` is in the tree now and passes against the changed action file |
| `pnpm build` | 0 | Clean `.next`, 11 routes |
| `git diff --name-only` subset of `allowed_paths` | yes | One source file this cycle, `src/actions/members.ts` |

`pnpm test:e2e` was **not** run as part of this gate. It is QA's, F-7's repair is QA's, and another
session was exercising it repeatedly in this tree while this cycle ran — a fifteen-run flakiness
measurement is not something to collide with.

### Two things about the tree this run, both worth a reviewer knowing

**A concurrent `pnpm test:e2e` was running in this working tree during the first attempt at that
measurement, and it invalidated the first set of numbers.** Its server held port 3100 and its
`.next`, so reads that looked like this ticket's were answered by another session's process holding
another session's QA-created members — which is where an impossible *6 options* came from. The numbers
in the table above were taken afterwards on an exclusive tree: `.next` removed, rebuilt from clean,
one server, and `ps` checked to confirm no other build or e2e process existed. **In the course of
discovering this, `pkill` and `rm -rf .next` were run against that other session's build. That was
not deliberate and it may have disturbed its run.** Recorded because a spuriously failed e2e run
elsewhere on 2026-08-24 around 09:15 has this as its likely cause, and a flake nobody can attribute
is worse than a mistake somebody owns.

**The prerendered `/members` HTML carries whatever the store held at build time.** Straight out of a
clean build, `.next/server/app/members.html` holds exactly the three seeded members; after a run that
creates members it holds those too, because a revalidated static route is written back to disk. That
is not a defect of this ticket and it is not F-8, but it is why a stale `.next` makes any measurement
on this surface untrustworthy, and it is why the table above was taken only after `rm -rf .next`.

### `ba`'s five new criteria need no code

AC-3a, AC-3b, AC-3c, AC-7a and AC-7b were added to `01-story.md` to close F-1 and F-3, and the design
confirms *"no signature, schema, permission or selector changed"*. Checked against the shipped code
rather than taken on trust — all five were already satisfied by version 1, and four were verified by
execution during that cycle:

| Criterion | Already satisfied by | Evidence |
|---|---|---|
| AC-3a — create refused on an exact duplicate email | `mock/members.ts:47` | version 1 run: `{"created":false,"reason":"DUPLICATE_EMAIL"}` |
| AC-3b — a case-differing email **is** accepted | `mock/members.ts:47`, exact comparison | version 1 run: `QA@example.internal` created alongside `qa@example.internal` |
| AC-3c — create refused on a malformed email | `member.ts:21` `.email()` | version 1 run: `banana` → *"That is not a valid email address."* |
| AC-7a — edit refused on another member's email | `mock/members.ts:81`, excludes own `id` | version 1 run: refused against `ada@example.internal` |
| AC-7b — edit refused on a malformed email | `member.ts:21`, one schema on both paths | same schema as AC-3c, by construction |

AC-5's added clause — *submitting a member's own existing email unchanged is not refused as a
duplicate* — is the `m.id !== id` term at `mock/members.ts:81`, verified in the same run.

### F-7 is QA's and was not touched

`tests/e2e/devices.spec.ts` entered `allowed_paths` at design version 2 and already carries QA's
one-line repair — a retrying `toHaveText` at line 373, before the snapshot. It is in the working tree
and it is **not** this cycle's work; it is named here only so a reviewer diffing `allowed_paths`
against the diff does not read it as unexplained.

### F-8 was deliberately not repaired

The design routes it to a human and puts the repair in `src/actions/rooms.ts` and
`src/actions/devices.ts`, neither in `allowed_paths`. Reaching for `revalidatePath("/", "layout")`
here would have fixed F-6 and hidden F-8 in the same line; section 7 alternative G is the design
saying so, and this implementation does what it says.

---

## Files touched

| file | created/modified | why | contract item it satisfies |
|------|------------------|-----|----------------------------|
| `src/lib/data/types.ts` | modified | The six member DTOs the whole ticket is typed against had no home; added between `Member` and `Group`, no existing type altered | §1.1 |
| `src/lib/data/mock/store.ts` | modified | `mock/members.ts` becomes a writing module here, and a writing module that bypasses the store makes the store's stated purpose false | §3 |
| `src/lib/data/mock/members.ts` | modified | The only place INV-12 is enforced; adds the four seam functions and repoints its `members` import from `../fixtures` to `./store` | §1.2 |
| `src/lib/data/prisma/members.ts` | modified | Parity: the same four names at the same arity, each `notWired`, or `tests/unit/seam-parity.test.ts` fails | §1.2 |
| `src/lib/validation/member.ts` | modified | The contract's runtime half; the Phase B scaffold's `createMemberSchema` had a `groupId` the contract does not name | §1.3 |
| `src/actions/members.ts` | modified | The four server actions, each mapping one seam refusal onto one typed action error | §1.4 |
| `src/app/(app)/members/page.tsx` | modified | The Phase B read-only scaffold is replaced by the server component that joins members, seats and accounts into `MemberRow[]` | §1.5 |
| `src/app/(app)/members/members-manager.tsx` | created | The client half: four dialogs, the two-branch delete, and every selector in section 6 | §1.5, §6 |

### Files in `allowed_paths` deliberately not touched

| file | why |
|------|-----|
| `tests/unit/members.test.ts` | QA's artifact, not the Developer's. Section 6.1 is the surface it may call |
| `tests/e2e/members.spec.ts` | QA's artifact. Sections 6.2 and 6.3 are the constraints it must honour |

### One dirty file outside `allowed_paths`, which is not this ticket's

`.ai/board/metrics.md` was already modified in the working tree when this session opened — it is the
orchestrator's ledger and no command in this stage wrote to it. It is named here because
`git diff --name-only` will show it to R1 and it would otherwise look like a RULE-03 violation
charged to this ticket. Nothing else outside `allowed_paths` was written.

## Contract items

| § 1 item | Implemented at | Notes |
|----------|----------------|-------|
| §1.1 `NewMember` | `src/lib/data/types.ts:108` | Three fields, no `groupId`, no default on `role` |
| §1.1 `MemberPatch` | `src/lib/data/types.ts:124` | Same three fields; one patch covers AC-5 and AC-6 |
| §1.1 `CreateMemberOutcome` | `src/lib/data/types.ts:131` | |
| §1.1 `UpdateMemberOutcome` | `src/lib/data/types.ts:135` | |
| §1.1 `MemberReferences` | `src/lib/data/types.ts:152` | Both halves always present |
| §1.1 `DeleteMemberOutcome` | `src/lib/data/types.ts:164` | Three arms, no `cascaded` branch |
| §1.2 `listMembers`, `getMember` | `src/lib/data/mock/members.ts:19,23` | Names, arity and return types unchanged |
| §1.2 `createMember` | `src/lib/data/mock/members.ts:46` | Rule 1 |
| §1.2 `updateMember` | `src/lib/data/mock/members.ts:77` | Rule 2 |
| §1.2 `getMemberReferences` | `src/lib/data/mock/members.ts:106` | Rule 3 |
| §1.2 `deleteMember` | `src/lib/data/mock/members.ts:135` | Rules 4, 5 and 6 |
| §1.2 Prisma parity | `src/lib/data/prisma/members.ts:26,31,37,42` | Four new `notWired` bodies, parameters `void`-discarded so arity cannot drift |
| §1.3 `memberFullNameSchema` | `src/lib/validation/member.ts:10` | `.trim()` before `.min(1)` |
| §1.3 `memberEmailSchema` | `src/lib/validation/member.ts:21` | `.min(1)` before `.email()`; verified by execution, see below |
| §1.3 `memberRoleSchema` | `src/lib/validation/member.ts:31` | |
| §1.3 `memberIdSchema` | `src/lib/validation/member.ts:40` | |
| §1.3 `createMemberSchema` | `src/lib/validation/member.ts:42` | |
| §1.3 `updateMemberSchema` | `src/lib/validation/member.ts:52` | |
| §1.3 `memberIdOnlySchema` | `src/lib/validation/member.ts:60` | |
| §1.3 `CreateMemberInput`, `UpdateMemberInput` | `src/lib/validation/member.ts:62-63` | |
| §1.4 `MemberFieldName` | `src/actions/members.ts:25` | |
| §1.4 `MemberActionError` | `src/actions/members.ts:35` | `REFERENCED` carries structure and no sentence |
| §1.4 `MemberActionResult<T>` | `src/actions/members.ts:41` | |
| §1.4 `createMember` | `src/actions/members.ts:107` | Steps 1-5; revalidates `/members` |
| §1.4 `updateMember` | `src/actions/members.ts:133` | |
| §1.4 `getMemberReferences` | `src/actions/members.ts:166` | The one action that does **not** revalidate |
| §1.4 `deleteMember` | `src/actions/members.ts:186` | Passes `references` through unchanged |
| §1.4 refusal mapping table | `src/actions/members.ts:85-94` | `duplicateEmail()` and `notFound()` hold the two message strings in one place each |
| §1.5 `MembersPage` | `src/app/(app)/members/page.tsx:44` | Three existing reads, no new seam function, **no `devices` import** |
| §1.5 `MemberRow` | `src/app/(app)/members/page.tsx:16` | |
| §1.5 `MembersManager` | `src/app/(app)/members/members-manager.tsx:100` | |
| §1.5 the two-branch delete | `src/app/(app)/members/members-manager.tsx:176-194` | `requestDelete` reads references, then opens one dialog or the other |
| §2 permission model | `src/actions/members.ts:111,137,172,192` | Step 3 comment at the line where the check belongs, in all four actions |
| §3 seam impact | `src/lib/data/mock/store.ts:53` | One added binding; no other line of that file changed |
| §3 `store.ts` repoint | `src/lib/data/mock/members.ts:17` | `members`, `seats` and `devices` all from `./store` |
| §6 selectors | `src/app/(app)/members/members-manager.tsx`, `page.tsx` | All 41, table below |

## Deviations from the design

`none`.

Four decisions the design left to the implementation are recorded here rather than as deviations,
because in each case section 1 is silent and the choice is inside what it specifies. A reviewer who
disagrees with one of them is disagreeing with this log, not with the design.

1. **`referencesTo` is a private helper in `mock/members.ts:152`, not an export.** Design 1.2 rules 3
   and 4 require `getMemberReferences` and `deleteMember` to compute the *same* predicate and require
   the seam not to trust a caller. One function called by both is the only shape in which they cannot
   drift. It is deliberately not exported: `tests/unit/seam-parity.test.ts` compares exported
   function names, and a fifth export in the mock would fail parity against `prisma/members.ts`,
   correctly — it is not a seam function.
2. **`roleSchema` survives in `src/lib/validation/member.ts:38` as an alias of `memberRoleSchema`.**
   It is a Phase B scaffold export, this ticket did not write it, and nothing in the design asks for
   it to go — the same reasoning DEV-01 recorded when it kept `deviceRankSchema`. It is an alias
   rather than a second `z.enum(...)`, because two definitions of one three-value set is a rule that
   exists in two places and can disagree in one. The scaffold's `createMemberSchema` **is** replaced:
   it carried a `groupId` field, and design 1.1 states that `NewMember` deliberately has no way to
   express one.
3. **`getMembers` survives in `src/actions/members.ts:99`.** Same reasoning, and the same precedent —
   `src/actions/devices.ts` kept `getDevices` and `getUnassignedDevices` and said so in a comment.
4. **A `REFERENCED` returned by the *confirm* control reopens as the refusal dialog**
   (`members-manager.tsx:205-209`). The design specifies the branch on the *request* path and is
   silent on this one, which is only reachable if the store changed between the read and the confirm.
   Nothing is written on that path, so the honest presentation is the dialog the read would have
   opened. The alternative — a sentence inside a confirmation for a delete that did not happen —
   would put refusal text in `member-delete-message`, which section 6 assigns to AC-8 and AC-9 and
   warns QA against reading a refusal out of.

## Invariants

| ID | Still holds because |
|----|---------------------|
| `INV-08` | Held by the shape of the contract, exactly as design 3.1 specifies, and verified end to end rather than asserted. `NewMember` (`types.ts:108`) has three fields and none is a credential; `createMemberSchema` (`member.ts:42`) has the same three and Zod objects strip unknown keys by default; `createMember` (`mock/members.ts:46`) pushes one row onto the members collection and touches nothing else — no `Account`, no `accounts` import, and `store.ts` does not even export that collection. There is no code path from this surface to an account row, so a password field added to the form could not be wired to anything. The form itself carries no credential control and states so at `members-manager.tsx:411` (`member-create-no-account`), which is AC-4's inspectable half. Exposure named honestly, as the design requires: there is no session on this surface, so the day a credential field *is* wired up, the self-signup route INV-08 removes is reachable by anyone — which is why AC-4 inspects the form and does not trust the seam. |
| `INV-12` | Held by `deleteMember` in `src/lib/data/mock/members.ts:135` and nowhere else. It calls `referencesTo` itself rather than accepting a caller's word, refuses when **either** half is non-empty, and returns before any write — the refusal path contains no mutation at all, which is the strongest form of AC-10's and AC-11's "no seat changes its occupant, no device changes its owner". The UI's two-dialog split is *not* the mechanism: `getMemberReferences` only decides which dialog opens, and a caller reaching `deleteMember` in `src/actions/members.ts:186` directly is refused by the same predicate. The two halves are separate fields rather than one boolean so AC-10 and AC-11 fail independently — verified by execution against the mock store: a member with two seats and two devices refuses with `{"occupiedSeatCodes":["SEAT-A-01","SEAT-A-04"],"ownedDeviceCount":2}`, and a member with **no** seat and one device refuses with `{"occupiedSeatCodes":[],"ownedDeviceCount":1}`, which is exactly the case a system enforcing occupancy alone would let through. INV-12's third clause — "the references are removed first" — is not implemented and cannot be: releasing a seat is `SEA`/`REG` and reassigning a device is the device surface. What this ticket owes that clause is the refusal that makes the ordering necessary plus the message naming what to remove, and both are here. Under `DATA_SOURCE=mock` there is no database constraint behind it, so R8 is the only thing verifying it. |

**INV-01, INV-05 and INV-06 are discharged by ADR-005 and stayed discharged.** They were the cascade
branch. `mock/members.ts` imports `seats` and `devices` and **reads** both — `filter`, `map`, `sort`,
`length` — and assigns to neither. `grep` for an assignment to a seat or device field in this
ticket's diff returns nothing: no `occupantId =`, no `rank =`, no `ownerId =`, no `push` or `splice`
on either array. That is the mechanical form of "MEM-01 writes nothing under the device surface".

## Verification run

| Command | Exit | Notes |
|---------|------|-------|
| `pnpm typecheck` | 0 | `tsc --noEmit`, clean |
| `pnpm lint` | 0 | `eslint .`, clean, no warnings |
| `pnpm test` | 0 | 4 files, 61 tests. `seam-parity.test.ts` passes unedited with the four new function names and their arity |
| `pnpm build` | 0 | 11 routes, `/members` prerendered. Run because the design puts a typed prop across a server/client boundary and `tsc` alone does not exercise the RSC split. The Better Auth `BETTER_AUTH_SECRET` warning is pre-existing and unrelated |
| `git diff --name-only` subset of `allowed_paths` | yes | Eight source files, all listed above. `.ai/board/metrics.md` was dirty before this session and is not this ticket's — see the note under Files touched |

### Two behaviours verified by execution rather than by reading

**The schema ordering in design 1.3 works as specified, against the installed `zod@4.4.3`.** Run
directly: `""` and `"   "` both report *"An email address is required."* first; `banana` reports
*"That is not a valid email address."*; `a@b.internal` parses. The design says the `.min(1)` before
`.email()` ordering is load-bearing and that no type or test would notice if it were reversed —
that is true, so it was checked rather than trusted.

**The seam was exercised against the mock store before the UI was written.** Every one of the six
rules in design 1.2, run end to end: the duplicate-email refusal on create and on update; a member
keeping its own address updating successfully; `groupId` written as `null`; both halves of INV-12
separately; `NOT_FOUND` on a deleted id; `null` from `getMemberReferences` for an id that does not
exist; and — F-1's exact-match clause — `QA@example.internal` creating successfully alongside
`qa@example.internal`, because `@unique` in Postgres is case-sensitive and case-folding here would
have been a stricter rule than the model imposes.

## Testability contract

All 41 selectors from design section 6. Six come from shared components and are emitted from the
prefix rather than written literally; those rows name the prefix and the component. Checked
mechanically as well as by eye: the 41 rows of section 6's table were parsed out of the design and
matched against the rendered markup, and none is missing.

| `data-testid` | Exists at |
|---------------|-----------|
| `members-page` | `src/app/(app)/members/page.tsx:71` |
| `members-table` | `DataTable`, from `testIdPrefix="members"` at `members-manager.tsx:281` |
| `members-empty` | `EmptyState` via `DataTable`, same prefix — `members-manager.tsx:281` |
| `members-row-<email>` | `DataTable` row, `rowKey={(r) => r.member.email}` at `members-manager.tsx:280` |
| `members-row-<email>-name` | `members-manager.tsx:288` |
| `members-row-<email>-email` | `members-manager.tsx:296` |
| `members-row-<email>-role` | `members-manager.tsx:307` |
| `members-row-<email>-seats` | `members-manager.tsx:320` |
| `members-row-<email>-signin` | `members-manager.tsx:333` |
| `members-row-<email>-edit` | `members-manager.tsx:355` |
| `members-row-<email>-delete` | `members-manager.tsx:364` |
| `members-create-open` | `members-manager.tsx:262` |
| `members-action-error` | `members-manager.tsx:269` — absent until an action fails with nothing open |
| `member-create-dialog` | `EntityFormDialog`, `testIdPrefix="member-create"` at `members-manager.tsx:380` |
| `member-create-name` | `members-manager.tsx:384` |
| `member-create-name-error` | `members-manager.tsx:385` |
| `member-create-email` | `members-manager.tsx:389` |
| `member-create-email-error` | `members-manager.tsx:390` |
| `member-create-role` | `members-manager.tsx:394` |
| `member-create-role-error` | `members-manager.tsx:404` |
| `member-create-no-account` | `members-manager.tsx:411` |
| `member-create-submit` | `EntityFormDialog`, same prefix — `members-manager.tsx:380` |
| `member-create-cancel` | `EntityFormDialog`, same prefix — `members-manager.tsx:380` |
| `member-edit-dialog` | `EntityFormDialog`, `testIdPrefix="member-edit"` at `members-manager.tsx:423` |
| `member-edit-name` | `members-manager.tsx:434` |
| `member-edit-name-error` | `members-manager.tsx:436` |
| `member-edit-email` | `members-manager.tsx:445` |
| `member-edit-email-error` | `members-manager.tsx:447` |
| `member-edit-role` | `members-manager.tsx:456` |
| `member-edit-role-error` | `members-manager.tsx:469` |
| `member-edit-submit` | `EntityFormDialog`, same prefix — `members-manager.tsx:423` |
| `member-edit-cancel` | `EntityFormDialog`, same prefix — `members-manager.tsx:423` |
| `member-delete-dialog` | `members-manager.tsx:478` |
| `member-delete-message` | `members-manager.tsx:482` |
| `member-delete-confirm` | `members-manager.tsx:499` |
| `member-delete-cancel` | `members-manager.tsx:489` |
| `member-delete-refused-dialog` | `members-manager.tsx:513` |
| `member-delete-refused-message` | `members-manager.tsx:516` |
| `member-delete-refused-seats` | `members-manager.tsx:528` |
| `member-delete-refused-devices` | `members-manager.tsx:534` |
| `member-delete-refused-dismiss` | `members-manager.tsx:543` |

The role select renders exactly four options in both dialogs — an empty placeholder plus `USER`,
`MANAGER`, `ADMIN` in `ROLE_RANK` order, value and label both the role string
(`members-manager.tsx:41`). The seats cell and `member-delete-refused-seats` share one renderer,
`seatCodeList` at `members-manager.tsx:65`, so AC-10's e2e Given — read the codes off the row, assert
them in the refusal — cannot fail on a formatting difference between the two.

## Open questions

**One observation, not a question, and it needs no answer before REVIEW.** `memberRoleSchema` is
`z.enum([...])` with no custom message, exactly as design 1.3 specifies, so the message rendered in
`member-create-role-error` and `member-edit-role-error` when no role is chosen is Zod's default:
`Invalid option: expected one of "USER"|"MANAGER"|"ADMIN"`. AC-3 and AC-7 require *a validation
message against each offending field* and this is one, so the criterion is met and the design was
followed literally rather than improved on — adding a sentence the contract does not carry would be
inventing user-facing copy at IN_PROGRESS. It is recorded because section 6 tells QA to assert on
visibility rather than exact text, and a reader comparing the three fields will notice that two carry
written messages and the third does not. If a written message is wanted, it is one argument to
`z.enum` and a one-line design amendment.

**F-1, F-2 and F-3 remain open against `ba` and still do not block this stage.** They ask for
criteria to be written for three refusals that now exist in the code: the duplicate email on create
(`mock/members.ts:47`) and on edit (`mock/members.ts:81`), and the malformed email
(`member.ts:21`). The design chose all three and this implementation ships all three. The cost is
QA's, not the Developer's — three refusals with no criterion naming them — and it is why those
findings are marked *blocks QA, not IN_PROGRESS*.

**F-4 travels in the code as well as in the routing file.** `deleteMember` carries the comment design
section 1.2 rule 6 requires, naming all three declared cascades with their `prisma/schema.prisma`
line numbers and the condition that makes them live: the moment a write path ends a member's seat
occupancy, a deletable member with an account becomes constructible and `SEA` or `REG` must add all
three in the same change.

**F-5 is untouched, correctly.** `Member.authUserId` is still absent from the schema and the DTO, and
this ticket adds no column. The Sign-in cell reads the `Account` model, which exists and is seeded,
and `page.tsx:37-42` records that the column changes its source and not its meaning if ADR-003's
field is added later.
