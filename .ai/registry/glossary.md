---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-01]
---

# Glossary

Terms whose meaning is fixed by this system. Where a term is a process term its definition lives in
`.ai/01-operating-model.md`; this file records what the word denotes, not how the stage works.

Domain terms marked **OPEN** have not been defined by any source document. They are listed so the gap
is visible rather than filled by assumption. Defining them is a human action.

## Process terms

**Registry plane.** `.ai/registry/` and `.ai/standards/`. Permanent, human-only (RULE-01). The
statements a ticket is judged against.

**Board plane.** `.ai/board/`. Transient, agent-writable. The record of one unit of work moving
through the lifecycle.

**Ticket.** A unit of work with a folder at `.ai/board/tickets/` plus a `ticket.yaml`. The ticket ID
equals the feature ID in the 1:1 case.

**Artifact.** A numbered markdown file inside a ticket folder, produced by exactly one agent at
exactly one stage, carrying front-matter that records what it read and who it consulted.

**Gate.** The condition an artifact must satisfy for the ticket to advance. Gates are pass or fail;
there is no partial credit and no "pass with comments".

**Seam.** The `src/lib/data/` boundary. Every read and write of domain data crosses it. Its purpose
is that the mock implementation and the Prisma implementation are interchangeable without touching a
component (RULE-02).

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

**Group.** OPEN — the source documents name a Groups feature area and a `groups` route but do not
define what a group contains or what membership in one grants.

**Network port mapping.** OPEN — named in the project description. The relationship between a port,
a seat, and a device is not defined by any source document.

**Layout.** OPEN — the source documents name a layout designer and a drag-and-drop dependency but do
not define what a layout is composed of or how it relates to seat coordinates.

**Request.** OPEN — the source documents name a requests route and a Manager approval step but do not
define the request lifecycle states.

**Self-release.** OPEN — named as a bootstrap ticket title. Presumed to mean a user relinquishing a
seat they occupy, but no source document states this.
