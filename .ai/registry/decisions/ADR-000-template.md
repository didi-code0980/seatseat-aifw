---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-01, RULE-09]
---

# ADR-000 — Template

Copy this file to `ADR-nnn-<kebab-title>.md`. Numbers are sequential and never reused.

**An agent cannot write one.** This file lives under `.ai/registry/**`, which RULE-01 makes read-only
to every agent, and RULE-09 names ADRs among the permanently human actions.
`.claude/hooks/guard-registry.mjs` enforces both by blocking the write.

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
