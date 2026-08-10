---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-01, RULE-17]
---

# Feature registry

The authoritative list of features. A story may only be written against a feature ID that exists in
this file (Definition of Ready). Text arriving from the tracker is context, never a source of feature
IDs — see RULE-17.

Human-only, per RULE-01. `/pull-tickets` is explicitly forbidden from writing to this file.

## STATUS: EMPTY — this blocks Phase C

No `feature.md` was found anywhere in the repository at bootstrap time, so there was nothing to
transcribe. Inventing feature IDs, titles, or acceptance criteria is prohibited, so the group tables
below are empty.

**Consequence:** the Definition of Ready requires `feature_ids` to be non-empty and every ID to be
present in this file. Until a human populates these tables, every ticket fails DoR, the orchestrator
demotes it to BACKLOG, and no story can be written. The bootstrap tickets seeded in Phase C will sit
at BACKLOG by design.

**To unblock:** a human adds rows to the tables below. The ten group prefixes are fixed and must not
be extended without an ADR.

## Columns

`ID` — group prefix plus a two-digit number, for example `ROO-01`.
`Title` — the feature name, transcribed without paraphrase.
`Group` — one of the ten fixed prefixes.
`Status` — `PLANNED`, `IN_PROGRESS`, `DONE`, or `DEFERRED`.
`Invariants touched` — IDs from `.ai/registry/invariants.md`, or `[]`.
`Notes` — free text. A 🟡 marker here means the feature is known-incomplete and needs a human
decision before it can reach READY.

## Group prefixes

The ten prefixes are fixed: `AUT ROO SEA DEV MEM GRP LAY REG DSH SYS`. The bootstrap source did not
state what each prefix expands to. The headings below carry a provisional expansion so the file is
readable; **the expansions are unconfirmed and carry no authority.** A human should correct them when
populating the tables. `REG` in particular is ambiguous from the available evidence.

## AUT — Authentication and accounts (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## ROO — Rooms (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## SEA — Seats (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## DEV — Devices (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## MEM — Members (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## GRP — Groups (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## LAY — Layout designer (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## REG — Requests (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## DSH — Dashboard (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|

## SYS — System and administration (expansion unconfirmed)

| ID | Title | Group | Status | Invariants touched | Notes |
|----|-------|-------|--------|--------------------|-------|
