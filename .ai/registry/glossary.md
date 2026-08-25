---
doc_version: 3
last_updated: 2026-08-25
governed_by: [RULE-01]
---

# Glossary

Terms whose meaning is fixed by this system. Where a term is a process term its definition lives in
`.ai/01-operating-model.md`; this file records what the word denotes, not how the stage works.


## Process terms

**Registry plane.** `.ai/registry/` and `.ai/standards/`. Permanent. The statements a ticket is
judged against. **Human-*owned*, no longer human-*only*** — since ADR-004 an agent can write here,
and RULE-01 is enforced by CODEOWNERS review on the pull request rather than by a blocked write.

**Board plane.** `.ai/board/`. Transient, agent-writable. The record of one unit of work moving
through the lifecycle.

**Ticket.** A unit of work with a folder at `.ai/board/tickets/` plus a `ticket.yaml`. The ticket ID
equals the feature ID in the 1:1 case.

**Artifact.** A numbered markdown file inside a ticket folder, produced by exactly one agent at
exactly one stage, carrying front-matter that records what it read and who it consulted.

**Gate.** The condition an artifact must satisfy for the ticket to advance. Gates are pass or fail;
there is no partial credit and no "pass with comments".

**Seam.** The `src/lib/data/` boundary. Every read and write of domain data crosses it. Its purpose
is that the mock implementation and the real one are interchangeable without touching a component
(RULE-02). The real one was Prisma until ADR-007 (2026-08-25) and is `@supabase/supabase-js` after
it — that the definition did not have to change is the seam doing its job.

**Invariant.** A statement that must hold in every reachable state of the data. See
`.ai/registry/invariants.md`. Distinct from an acceptance criterion, which describes one scenario.

**Rule.** A statement about how the process operates, held in `.ai/registry/rules.md`. Distinct from
an invariant, which is about the domain.

**Rework.** A return to an earlier stage after a failed gate. Only Developer-caused failures count
toward the budget (RULE-08).

**Escalation.** Handing a ticket to a human and halting it. Not a retry.

**Clarification.** A question from a downstream agent to an upstream agent about intent. Bounded by
RULE-15 and recorded in the `consulted` front-matter block.

**Adjudication.** A negotiation between an agent and whoever judges its work. Forbidden before the
verdict exists (RULE-12).

**Amendment.** An edit to an upstream artifact triggered by a clarification that revealed the
artifact was incomplete (RULE-14). The amendment, not the chat, is the binding output.

**Attestation.** The `chat_before_verdict: none` field on a review or test report. A claim by the
agent about its own process, which is checkable against the transcript if ever disputed.

## Domain terms

**Room.** An organizational space containing seats. The unit that Admin manages layouts for.

**Seat.** A physical position within a room that a person may occupy. Has at most one occupant
(INV-01) and a derived status (INV-03).

**Occupant.** The person currently assigned to a seat. A person may occupy more than one seat
(INV-02).

**Device.** A piece of equipment with an owner. May be assigned to a seat or sit unassigned in
inventory (INV-07).

**Primary device.** The one device designated primary for a seat (INV-04), which must be owned by
that seat's occupant (INV-05).

**Secondary device.** Any non-primary device assigned to a seat. What a primary device becomes when
its occupant leaves the seat (INV-06).

**Member.** A person recorded in the system. Accounts are created by Manager or Admin only (INV-08).

**Role.** One of `USER`, `MANAGER`, `ADMIN`, ordered by `ROLE_RANK`.

### Group
A grouping of **people**, not of seats — a department, a sales team, or similar.
Groups nest: a parent group contains child groups (e.g. a class contains several teams).
A Member belongs to a Group. Group membership is independent of seat occupancy;
two members of the same group need not sit near each other.

### Network port
A physical network port belongs to a **seat**, not to a device or a room.
A seat has **one or two** ports. A seat with zero ports is not valid.
Ports are identified by a port code and are part of the seat's fixed physical
description — they do not move when an occupant changes.

### Layout
A room's spatial arrangement, rendered on a **grid**. The grid is deliberately finer
than one cell per seat so that seats can be placed close to their real-world position:
a seat occupies a block of several cells (for example 2x2), not a single cell.
A seat's placement is a grid coordinate plus its footprint. Freeform (arbitrary pixel)
placement is explicitly out of scope.

### Request (seat request)
A Member asking to occupy a seat. Two forms:
- **Targeted** — the requester names a specific seat.
- **Open** — the requester names only a room and asks for any free seat in it.
Both forms go to a Manager or Admin for approval.

### Self-release
An occupant vacating a seat they currently occupy, **without approval**. It takes effect
immediately. Releasing a seat is an occupant exit, so INV-06 applies: the seat's primary
device auto-downgrades to secondary.
