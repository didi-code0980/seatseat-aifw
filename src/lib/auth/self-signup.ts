// The self-signup configuration flag (ADR-006 decision 7, OQ-2).
//
// WHAT THIS IS NOT: a control. `localStorage` is browser storage — the value sits on the machine of
// the person it restrains, and one line in a developer console changes it with no server-side trace.
// ADR-006 records that the operator chose this mechanism against the steward's recommendation, and
// records the consequence in terms: under this decision INV-08 is held by nothing that survives an
// adversary. MD-14 carries the gap and its fix shape. AC-12 forbids any artifact of this ticket from
// reporting otherwise.
//
// WHAT IT IS: configuration, shipped ahead of the thing it configures. Nothing in this repository has
// ever had a self-signup path, INV-08 forbids the route, and the AUT feature table is empty — so the
// enabled branch has nothing to enable. That is 01-story.md A-2 and AC-11 asserts it.
//
// This module carries no React client directive. It is imported BY a client component and is not one
// itself, which keeps `src/lib/auth/**` free of client files — 02-design.md 1.6, rule 1. The
// directive is referred to and never quoted, because AC-4's third clause is a grep for it over this
// directory finding nothing, and a comment quoting it fails the check it would be explaining. The
// exact command is in 02-design.md 6.3.

/**
 * The `localStorage` key. Namespaced so it cannot collide with another origin's key on a shared
 * development host, and a single token so a Playwright `page.evaluate` can write it without quoting
 * games (02-design.md section 6).
 */
export const SELF_SIGNUP_STORAGE_KEY = "sdt.self-signup";

/** The two permitted values. Anything else resolves to `"disabled"`. */
export type SelfSignupSetting = "enabled" | "disabled";

/** The literal that enables. Exported so a test names the same string the reader does. */
export const SELF_SIGNUP_ENABLED: SelfSignupSetting = "enabled";
export const SELF_SIGNUP_DISABLED: SelfSignupSetting = "disabled";

/**
 * Resolves the setting, failing closed on every path.
 *
 * NOT `"true"` / `"false"`, and this is the decision most likely to be undone by accident. A
 * boolean-shaped string invites `Boolean(localStorage.getItem(key))`, which is `true` for the string
 * `"false"` — a fail-open control that reads as a fail-closed one. Two named literals have no such
 * reading.
 *
 * Five ways this returns `"disabled"`, and AC-10 is only the first of them:
 *   - nothing is stored (AC-10, and 01-story.md A-1: an invariant that lapses on a browser that has
 *     never visited the site is not an invariant)
 *   - something other than the exact literal `"enabled"` is stored — including `"ENABLED"`, `"1"`,
 *     `"true"` and the empty string
 *   - there is no `localStorage`, which is every server render
 *   - reading it throws, which a browser with site data blocked does
 *   - the caller passes `null` explicitly
 *
 * The `storage` parameter exists so `tests/unit/self-signup.test.ts` can exercise all five without a
 * browser (02-design.md section 6.1). It is `Pick<Storage, "getItem">` rather than `Storage` because
 * reading is all this function does, and a narrower parameter is a smaller stub.
 */
export function readSelfSignupSetting(
  storage?: Pick<Storage, "getItem"> | null
): SelfSignupSetting {
  let source: Pick<Storage, "getItem"> | null | undefined = storage;

  if (source === undefined) {
    try {
      source = typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
    } catch {
      // Accessing `localStorage` itself throws in some privacy configurations, before any read.
      return SELF_SIGNUP_DISABLED;
    }
  }

  if (source === null) return SELF_SIGNUP_DISABLED;

  try {
    return source.getItem(SELF_SIGNUP_STORAGE_KEY) === SELF_SIGNUP_ENABLED
      ? SELF_SIGNUP_ENABLED
      : SELF_SIGNUP_DISABLED;
  } catch {
    return SELF_SIGNUP_DISABLED;
  }
}
