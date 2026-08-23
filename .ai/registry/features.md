---
doc_version: 2
last_updated: 2026-08-11
governed_by: [RULE-01, RULE-17]
---

# Feature registry

The authoritative list of features. A story may only be written against a feature ID that exists in
this file (Definition of Ready). Text arriving from the tracker is context, never a source of feature
IDs — see RULE-17.

Human-only, per RULE-01. Agents read this file and cite IDs from it; an agent needing a change here
stops with `gate: BLOCKED` and states the change in `blocking_reason`. `/pull-tickets` is explicitly
forbidden from writing to this file.

Tables are populated incrementally. An empty group table means no feature in that group has been
specified yet — not that the group is unused. A ticket whose `feature_ids` do not all resolve to rows
below fails Definition of Ready and is demoted to BACKLOG.

## Columns

`ID` — group prefix plus a two-digit number, for example `ROO-01`.
`Title` — the feature name, transcribed without paraphrase.
`Group` — one of the ten fixed prefixes.
`Status` — `PLANNED`, `IN_PROGRESS`, `DONE`, or `DEFERRED`.
`Invariants touched` — IDs from `.ai/registry/invariants.md`, or `[]`.
`Notes` — free text. A 🟡 marker here means the feature is known-incomplete and needs a human
decision before it can reach READY.

## Group prefixes

Fixed and confirmed. Extending this set requires an ADR. Section headings below must match these
expansions exactly.

| Prefix | Expansion | Prefix | Expansion |
|--------|-----------|--------|-----------|
| `AUT` | Authentication & Accounts | `GRP` | Groups |
| `ROO` | Rooms | `LAY` | Layout Designer |
| `SEA` | Seats | `REG` | Seat Requests |
| `DEV` | Devices | `DSH` | Dashboard |
| `MEM` | Members | `SYS` | System |

## AUT — Authentication & Accounts

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## ROO — Rooms

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
| ROO-01 | Room CRUD UI | ROO | PLANNED | INV-01, INV-04, INV-05, INV-06, INV-07, INV-10, INV-11 | First loop-validation slice. Auth guard deferred to AUT. |
## SEA — Seats

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## DEV — Devices

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## MEM — Members

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## GRP — Groups

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## LAY — Layout Designer

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## REG — Seat Requests

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## DSH — Dashboard

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## SYS — System

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|