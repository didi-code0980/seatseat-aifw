---
doc_version: 2
last_updated: 2026-08-10
governed_by: [RULE-01, RULE-09]
---

# ADR-000 — Template

Copy this file to `ADR-nnn-<kebab-title>.md`. Numbers are sequential and never reused.

**An agent can write one, since 2026-08-23, and should not do so lightly.** `guard-registry.mjs` is
unwired (ADR-004), so the write no longer fails. What still holds is RULE-01 — an ADR and human
approval — and RULE-09, which names ADRs among the permanently human actions. Enforcement is
`.github/CODEOWNERS` review on the pull request rather than a blocked write.

The distinction that matters: an agent may **record** a decision a human made, naming who made it and
when. An agent may not **make** one and write it up as though a human had. The `## Status` line is the
test — if it says `ACCEPTED by the operator`, that has to have happened, in words, somewhere a person
can be shown.

An agent that needs a registry change sets `gate: BLOCKED` on its own artifact, states the requested
decision in `blocking_reason`, and stops. A human writes the ADR. This is the intended flow, not a
limitation to be routed around: the value of an ADR is that a person decided, and an ADR written by
the agent that wanted the exception is not evidence of a decision.

## Status

`PROPOSED` | `ACCEPTED` | `SUPERSEDED by ADR-nnn` | `REJECTED`

State the date the status last changed and who changed it.

## Context

What is true right now that makes a decision necessary. Facts, not preferences. If the decision was
triggered by a specific ticket, name it. If it was triggered by a rule or invariant being unworkable
as written, cite the ID.

## Decision

One paragraph, active voice, present tense. If the decision changes a rule, state the rule ID and the
old and new text. If it changes an invariant, state the ID.

## Rationale

Why this and not the alternatives. Name at least one alternative and say what it costs.

## Consequences

What becomes true, including what becomes harder. An ADR that lists only benefits has not been
thought through.

## Revert condition

**Required. An ADR without one is a preference, not a decision.**

State the observable signal that means this decision was wrong, and what happens when it is observed.
Prefer a number from `.ai/board/metrics.md` over a judgement call.

## Affected documents

Every file whose `governed_by` or content changes as a result, with the `doc_version` each must move
to. Check D9 fails until this list is worked through.

**Then grep `tests/` for every source path in the list, and add what it finds.** A table of documents
records what a decision *changes*; it does not record what *asserts* what it changes, and an assertion
is a test. A test is where a decision is enforced most literally, which makes it the last place that
should be missed and — because a passing suite reads as agreement — the place a stale decision survives
longest.

Added 2026-08-27 after ADR-007 listed `package.json` and did not list
`tests/unit/self-signup.test.ts`, which asserts that `@supabase/ssr` is the *only* Supabase package in
it. The ADR adopts a second one. QA found it by running the suite; the trace was one `grep` away and
nobody made it. MD-36.

The grep is enough. **Do not go looking for tests that assert a decision "in spirit"** — the list is
files that name a path this ADR touches, nothing wider. A speculative entry costs a reader more than a
missing one, because they cannot tell whether it was reasoned or guessed.
