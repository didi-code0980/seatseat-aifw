---
doc_version: 1
last_updated: 2026-08-10
governed_by: [RULE-05]
---

# UI design system

## Direction

Light SaaS. Calm, dense, and legible; this is an internal tool that people will keep open all day,
not a marketing surface.

## Tokens

| Token | Value | Use |
|---|---|---|
| Accent | `#FB5729` | Primary action emphasis, active state, focus ring |
| Near-black | `#1C1C1C` | Text, and the fill of pill buttons |
| Canvas | light gray | Page background |
| Surface | white | Cards, tables, dialogs |

`TODO(verify):` exact canvas and surface hex values, border color, and the full gray ramp were not
specified by any source document. They are listed under OPEN QUESTIONS rather than chosen here.

Accent is for emphasis, not for area. A large orange region on a light canvas fights the content;
the accent belongs on a focus ring, an active tab underline, a badge, and the occasional icon.

## Type

Gilroy or Manrope for UI. IBM Plex Mono for codes and IDs — seat codes, device identifiers, port
numbers, ticket IDs. Anything a person might read character by character or copy is monospace,
because that is what makes a transposed character visible.

`TODO(verify):` font licensing and loading strategy are not specified. Whether Gilroy is available or
Manrope is the fallback is an operator decision.

## Components

Primitives live in `src/components/ui/`: Button, Input, Select, Dialog, Table, Badge.

Composites live in `src/components/shared/`: EntityFormDialog, DataTable, PermissionGate, EmptyState.

A composite that is used once is not a composite. `EntityFormDialog` earns its place because the CRUD
surfaces are near-identical; the pattern is expected to originate from the device CRUD ticket and be
generalized, not designed up front against surfaces that do not exist yet.

## Buttons

Black pill buttons for primary actions. Secondary actions are text or outline; there is one primary
action per view. A view with three primary buttons has no primary action.

## Cards and canvas

White cards on a light-gray canvas, with generous internal padding and restrained borders. Separation
comes from the surface change, not from a heavy border plus a shadow plus a rule.

## Density

Tables are the main surface of this application. Prefer a compact row height, a clear header, and
right-aligned numerics. Do not truncate an identifier to fit — wrap the row or let the column be
wide, because a truncated device ID is worse than no column.

## Empty states

Every list has one, and it says what to do next rather than only that there is nothing. An empty
state that also lacks the action needed to leave it is a dead end.

## Permission-aware UI

`PermissionGate` hides controls the current role cannot use. It is a usability affordance and never a
security control — see `.ai/standards/rbac-and-security.md`.

Prefer hiding an unusable control to disabling it. A disabled button with no explanation reads as a
bug; an absent one reads as "not your role", which is the true statement.

## Testability

Every interactive element that an acceptance criterion touches carries a `data-testid`, and every one
of them is listed in design section 6. RULE-05 makes that section the only channel through which
selectors reach QA, so a control that is not listed is a control QA cannot exercise.

Naming: `<entity>-<element>-<qualifier>`, lowercase, hyphenated. Stable across refactors — a testid
that changes because a component was extracted breaks the test for no behavioural reason.

## Accessibility

Labels on every input. Focus visible, using the accent. Dialogs trap focus and restore it on close.
Color is never the only carrier of meaning — a status badge has a word in it, because a red dot and a
green dot are the same dot to a large minority of users.
