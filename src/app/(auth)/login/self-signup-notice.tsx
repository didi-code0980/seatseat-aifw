"use client";

// The client island that reports the resolved self-signup setting (02-design.md F-7).
//
// IT LIVES IN THE ROUTE FOLDER AND NOT IN `src/lib/auth/`, deliberately. That directory is the one
// place exempt from the lint restriction on the Supabase package group, and AC-4's third clause names
// a client-directive file inside it as the door the exemption leaves open. Keeping every client file
// out of it makes the exemption safe by construction rather than by review (02-design.md 1.6).
//
// NOTHING IN THIS FILE NAMES THE RESTRICTED PACKAGE GROUP, and that is a constraint on the comments
// as much as on the code. AC-4's first clause is a grep over `src/` excluding `src/lib/auth/`, and
// this file is outside `src/lib/auth/` — so a comment that spells the group out fails the check it
// would be explaining. 02-design.md 6.3 holds the exact command.
//
// THE STATE IS RESOLVED AFTER HYDRATION, NOT IN RENDER — 02-design.md 1.4, and its reasoning is
// carried out here unchanged. The server has no `window`, so it renders `disabled`; reading
// `localStorage` in the render body would produce a different first client render whenever the flag
// is set, which React 19 reports as a hydration mismatch, and AC-10's "the page does not error on the
// missing value" and AC-11's "the page renders" both fail on it.
//
// DEVIATION FROM THE LITERAL CODE IN 02-design.md 1.4, in mechanism only. The design writes this as
// `useState("disabled")` plus an effect calling `setSetting`. That exact shape is a LINT ERROR under
// the installed config: `eslint-config-next@16.3.0` enables the React Compiler rule
// `react-hooks/set-state-in-effect`, which fails on `setSetting(readSelfSignupSetting())` in an
// effect body — verified by running `eslint` over the design's lines before replacing them. `pnpm
// lint` exiting 0 is an IN_PROGRESS gate item, so the prescribed lines cannot ship as written. This
// is the repository's first effect hook, which is why nothing caught it before now.
//
// `useSyncExternalStore` is React's own answer to exactly this problem — an external store read on
// the client, with a separate server snapshot — and it satisfies every clause of the design's
// reasoning rather than working around it. `getServerSnapshot` returns `disabled`, which is both what
// the server renders and what the flag defaults to, so the two agree for the same reason rather than
// by coincidence; React then re-renders with the client snapshot after hydration. The alternative
// considered and rejected was an `eslint-disable` comment, which would have kept the design's lines
// by suppressing a real rule about a real hazard. Raised to `tech-lead-design` as a RULE-14 amendment
// in 99-questions.md, item 1.

import { useSyncExternalStore } from "react";
import type { JSX } from "react";

import { SELF_SIGNUP_DISABLED, readSelfSignupSetting } from "@/lib/auth/self-signup";
import type { SelfSignupSetting } from "@/lib/auth/self-signup";

/**
 * Module scope, so the reference is stable and React does not resubscribe on every render.
 *
 * `storage` fires on OTHER tabs of the same origin, never on the tab that wrote the value. That is
 * the whole subscription this flag needs: it is configuration read once per page, and the developer
 * console that sets it is the case MD-14 records as the reason it enforces nothing.
 */
function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

/**
 * Both snapshots return one of two string literals, compared by `Object.is`, so repeated calls are
 * stable and React does not loop. `readSelfSignupSetting` fails closed on every path it can take.
 */
const getSnapshot = (): SelfSignupSetting => readSelfSignupSetting();
const getServerSnapshot = (): SelfSignupSetting => SELF_SIGNUP_DISABLED;

export function SelfSignupNotice(): JSX.Element {
  const setting = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <p className="mt-2 text-xs text-muted">
      Self-registration:{" "}
      {/* The SETTING, never a control and never a claim about enforcement (AC-12). A bare value in
          its own element, so a test reads it without parsing a sentence. */}
      <span className="code" data-testid="login-self-signup">
        {setting}
      </span>
    </p>
  );
}
