# Seat and Device Tracking System

An internal web application for managing physical seat assignments, network port mapping, and device
ownership across organizational rooms. Three roles: Admin, Manager, User.

## Read these before doing anything

| File | What it is |
|------|------------|
| [.ai/00-charter.md](.ai/00-charter.md) | What this system is for and what it refuses to do |
| [.ai/01-operating-model.md](.ai/01-operating-model.md) | Lifecycle, stage ownership, gates, chat topology, dispatch loop |
| [.ai/registry/rules.md](.ai/registry/rules.md) | All 18 process rules, each stated exactly once |
| [.ai/registry/invariants.md](.ai/registry/invariants.md) | The 8 domain invariants |
| [.ai/registry/features.md](.ai/registry/features.md) | The only valid source of feature IDs |
| [.ai/standards/](.ai/standards/) | Architecture, coding, data model, RBAC, testing, UI, git, integrations |
| [.claude/PERMISSIONS.md](.claude/PERMISSIONS.md) | Why each permission and hook exists |
| [.ai/steward/context.md](.ai/steward/context.md) | **How the operator wants to be worked with.** Standing instructions, and the log of what changed and why |

**Read the standing instructions in `.ai/steward/context.md` before your first reply in a session,
whichever agent you are.** They are durable operator preferences — autonomy, answer length, language,
what to verify before speaking — and they apply whether or not the current message repeats them. The
operator named "having to explain the same preference again" as a standing cost; that file is the
mechanism against it. It is board plane and agent-writable, but only the steward appends to it.

## Three rules reproduced here

These are copied verbatim from `.ai/registry/rules.md` because they are too important to sit one
indirection away. `scripts/check-docs.mjs` check D7 verifies the copies match character-for-character.
Every other rule is cited by ID, never restated.

- **RULE-01** — Changing `.ai/registry/**` requires an ADR and human approval. Enforcement is CODEOWNERS review on the pull request, not a hook.
- **RULE-02** — No component may bypass the `src/lib/data/` seam. Enforced by ESLint, not convention.
- **RULE-03** — An agent may not edit any file outside the active ticket's `allowed_paths`.

## Two planes

`.ai/registry/` and `.ai/standards/` are permanent and human-only. `.ai/board/` is transient and
agent-writable. A ticket's working directory is `.ai/board/tickets/` — never under the registry.

## Stack

Next.js 16 App Router, TypeScript, Supabase (Postgres, data client, and auth), Tailwind, dnd-kit,
Vitest, Playwright, Docker Compose. Package manager is pnpm. All of Next.js 16, `@supabase/ssr` and
`@supabase/supabase-js` are past reliable recall — inspect installed types or current docs before
writing config against them, and write `TODO(verify):` rather than guessing.

**Half of this has landed and half has not.** The auth half is done — ADR-006 was implemented by
`SYS-01` and merged on 2026-08-25, so `better-auth` is gone and `@supabase/ssr` is in. The data half
is decided and not built: `prisma` and `@prisma/client` are still in `package.json`, and ADR-007
(2026-08-25) removes them. Read `.ai/standards/integrations.md` for which package may be imported from
which directory; there are exactly two and they do not overlap.

## Visual direction

Light SaaS. Accent `#FB5729`. Near-black `#1C1C1C`. Black pill buttons. White cards on a light-gray
canvas. Gilroy or Manrope for UI, IBM Plex Mono for codes and IDs. Details in
[.ai/standards/ui-design-system.md](.ai/standards/ui-design-system.md).

## Working agreements

- **Windows-native.** No `.sh` files, no `chmod`, no shebang execution. Every hook is `.mjs` run via
  `node`.
- **No invention.** No invented feature IDs, acceptance criteria, database fields, or invariants.
  Missing information becomes a placeholder plus an entry under `OPEN QUESTIONS`.
- **Additive only.** Do not delete or rewrite a file you did not create in the current run.
- **Humans merge. The `orchestrator` commits, at `/handoff` and `/ship` only.** Every stage leaves
  the tree dirty. `/handoff` persists a finished lane and releases the branch so the next worktree can
  take it; `/ship` adds the state transition and opens the pull requests. Both classify the tree and
  keep ticket work and chore work on separate branches. Merging is permanently human — RULE-09. Scope
  and limits in [.ai/standards/git-conventions.md](.ai/standards/git-conventions.md).
- **Three worktrees, one travelling branch.** `aiw-design` holds `orchestrator`, `tech-lead-design`
  and `ba`; `aiw-implement` holds `developer`, `tech-lead-review` and `qa`; `aiw-steward` maintains
  the model. `feat/<ID>` moves `aiw-design -> aiw-implement -> aiw-design` by `/handoff`.
  Confirm `pwd` and `git branch --show-current` before the first instruction of a session — since
  ADR-004 nothing stops a session writing to the wrong folder's branch.
  [.ai/standards/session-model.md](.ai/standards/session-model.md).

## Replying — the sign-off is the reply

**Default to the sign-off block and nothing else.** A command that ran and passed is four lines. This
is a rule about the operator's time: they read every reply, and a wall of confirmed-fine detail buries
the one line that was not.

Add prose *above* the block only when one of these is true, and only as much as it takes:

- **You stopped.** What stopped you, and what would unblock it. Here the detail is the whole value.
- **You found something the operator has to decide**, or something true that nobody asked about and
  nobody would otherwise notice. One or two sentences.
- **You did something other than what was asked**, or did nothing where something was expected.

**Never include:**

- A narration of the steps you ran. Git, the artifacts and the gate front-matter are the record; a
  transcript of them in chat is a second, worse copy that goes stale immediately.
- A table of checks that all passed. *Passed* is one word.
- The file classification you already acted on — `git show --stat` holds it, and the commit has
  happened, so printing it invites review of something already done.
- A restatement of what the command file says the command does. The operator can read it, and it is
  in the repository where it stays true.

**Evidence belongs in the repository, not in the reply.** If a claim you want to make cannot be
checked from a file or a commit, that is a reason to write the file — not a reason to write more chat.

### The block

**End every reply to the operator with this block, whoever you are.** Four lines, this order, nothing
else in it. Labels are in the conversation language per `.ai/steward/context.md`; this file shows the
Vietnamese form because that is the conversation language today.

```
---
**Tôi là `<agent>`.** Vừa <what you did> — <TICKET-ID>, gate <PASS | FAIL | BLOCKED | n/a>.
**Xong lúc:** <output of `date '+%Y-%m-%d %H:%M %Z'`>
**Ở:** <basename of `pwd`> — branch <output of `git branch --show-current`, or `detached @ <sha>`>
**Tiếp theo:** <what is left that you cannot run>, or `không có — <what this folder is waiting on>`
```

- **Read the time, the folder and the branch. Never supply them from context.** `date`, `pwd` and
  `git branch --show-current`, every time, even when you are confident. A sign-off is a claim about a
  machine's state, and an invented one is worse than none because it looks measured.
- **No `Bash` tool means `unavailable — no Bash tool`**, not a guess. `product` is the only agent in
  this position today.
- **Quote the gate from your artifact's front-matter.** If your reply completes no command, write
  `gate n/a` and say what you are waiting on in the *Tiếp theo* line.
- **On a FAIL, the routed command is the next thing you run** — per the routing table in
  `.ai/01-operating-model.md`, not the next happy-path stage, and not a line for the operator to type
  when it runs here. On `ESCALATED`, it is a human decision and there is no command; say so.
- **Never put this block in an artifact.** It is conversation. Artifacts carry front-matter, and that
  is the record.

#### If you can run it, run it. *Tiếp theo* is what is left over.

**Added 2026-08-27 on the operator's instruction: *"tại sao tôi phải tự chạy command? từ đầu config
tôi là sếp, sẽ chỉ giao tiếp vs cô để cô tự run."*** The section below answers *which folder* a
command belongs to. It never answered *who types it* — so an agent standing in the right folder, with
the right role, holding the tools, printed the command instead of running it, and the operator became
the runtime for their own project.

- **Before you write a command into *Tiếp theo*, run it.** If it runs in the folder on your *Ở* line
  and your role owns it, the turn is not over until it has run. *Tiếp theo* then names what came
  after — which, done properly, is usually something you genuinely cannot do.
- **Three things you cannot do. They are the only reasons to hand a command back:**

  | | Why it is not yours | Cite |
  |---|---|---|
  | **Another folder** | A session's folder is fixed at launch and it cannot see the others | the section below |
  | **A loop stage in another session** | The orchestrator prints and does not dispatch, *by decision* — a subagent cannot open a fresh top-level session, so RULE-13 would become an agent's good behaviour instead of how sessions are actually started | `.ai/01-operating-model.md` §*Orchestrator loop* |
  | **A human-only act** | A merge, an ADR the operator accepts in their own words, an `ESCALATED` verdict, an open question with no default | RULE-09, RULE-06, RULE-07 |

- **Everything else is yours, including the unglamorous half.** Cutting the branch, running the
  audit, opening the pull request, fixing the small defect you found on the way. None of that is a
  stage dispatch and no rule reserves it for a human. An agent that lists these for the operator has
  turned a preference for being informed into a queue of chores.
- **A gate FAIL is not a stopping point.** Route it per `.ai/01-operating-model.md` and run the
  routed command. RULE-06 already bounds this — two failed cycles escalate — so stopping early to
  report a FAIL adds nothing the rule does not already guarantee.
- **What you hand back arrives complete.** Never a branch name where a pull request URL belongs; the
  link, the title and the body, every time. Where a rule or a permission means the operator presses
  the key, the thinking is still yours. Standing instruction, `.ai/steward/context.md` §*How to
  answer*.
- **The failure this is written from is the reply directly above it.** On 2026-08-27 a `steward`
  session in `aiw-steward`, having just opened PR #58, signed off with *"Tiếp theo: ở folder
  `aiw-steward` chạy `git switch -c ops/<slug> origin/main` — hoặc `/thuki MD-16`."* Both run in
  `aiw-steward`. The session was in `aiw-steward`. It had `Bash`. It owned both. Every word of the
  section below was obeyed, and the reply was still homework.

#### *Tiếp theo* is for the folder you are standing in. Only `steward` may answer for another.

**Added 2026-08-26 on the operator's instruction, replacing *"name the folder, not just the
command."*** That rule made every reply name a folder; it did not stop a reply naming a folder the
session could not see, which turned out to be the more expensive failure.

- **Name a command only if it runs in the folder on your *Ở* line.** If the next move belongs to
  another lane, the honest answer is `không có — <what this folder waits on>`. *"Waiting on `<ID>` to
  merge"* is a complete answer; it tells the operator to go somewhere else without pretending to know
  what they will find there.
- **Only `steward` may report across all three worktrees**, and only when asked — that is what
  `/status` is. Every other role answers for one folder: its own.
- **The reason is that a session's folder is fixed at launch and it cannot see the others.** A
  command named for a folder you are not in is a guess about a branch that may have moved, a tree
  that may be dirty, and a branch another worktree may be holding — `git switch` refuses a branch
  checked out elsewhere, and the refusal surfaces in the folder the operator walked to, not in yours.
- **This is written from a real failure, not a precaution.** On 2026-08-25 a `steward` session in
  `aiw-steward` signed off with *"Tiếp theo: `/spec GRP-01` — trong folder `aiw-design`."* GRP-01 was
  already past SPEC and past DESIGN, in flight in `aiw-implement`. The advice was confident,
  correctly formatted, named the folder as the old rule required, and was wrong — because the session
  giving it had no way to see the folder it was sending the operator to.

## Commands

**The loop**, which builds the product — `/idea` `/triage` `/next-ticket` `/spec` `/design`
`/handoff` `/implement` `/review` `/qa` `/handoff` `/ship` `/sprint-status` `/pull-tickets`
`/sync-tracker` `/docs-audit`

**The model**, which maintains the loop — `/thuki` (steward: rules, hooks, checks, registry; never
ticket work) and `/status` (reads the board; reports what is true and what waits on a human).

One file each in [.claude/commands/](.claude/commands/); policy lives in the operating model.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
