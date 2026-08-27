// The one place the Supabase AUTH client is constructed (ADR-006 decision 4, OQ-1, OQ-4). Since
// ADR-007 there is a second Supabase client in this repository and it is not this one — see below.
//
// Server-side only. `src/lib/data/` is still the only path to data, which is the premise ADR-002
// rested on when it left Row Level Security off — and it stays true only while no Supabase client
// exists in the browser. `eslint.config.mjs` exempts this directory for `@supabase/ssr` and for
// nothing else; the exemption is a permission to construct the AUTH client here, not a permission to
// ship it anywhere and not a route to the data client.
//
// ADR-007 REVERSES THIS FILE'S OLD PROHIBITION, AND THE REVERSAL IS WHY `src/lib/auth/supabase.ts`
// IS IN SYS-02's `allowed_paths` AT ALL. Until 2026-08-26 this block read *"NO FILE IN THIS
// REPOSITORY MAY NAME THE CORE SUPABASE CLIENT PACKAGE"*, because under ADR-006 `@supabase/ssr` was
// the only Supabase package permitted and a second one would have failed check D12. ADR-007 adopts
// `@supabase/supabase-js` for data. There are now TWO packages and TWO exempted directories:
//
//   @supabase/ssr          authentication          src/lib/auth/**            <- this file
//   @supabase/supabase-js  reading and writing     src/lib/data/supabase/**
//
// NEITHER EXEMPTION COVERS THE OTHER'S PACKAGE, and that is the part worth keeping in mind here
// rather than the part that changed: this directory still may not name the data client, the data
// adapter still may not name this one, and `eslint.config.mjs` and check D12 hold both halves. The
// separation ADR-006 asked for is preserved, not widened.
//
// The return type of `createSupabaseServerClient` stays INFERRED. That was originally a workaround
// for not being able to name the peer package; it is kept because annotating it would pin a vendor
// type in a signature, and the seam's rule is that no vendor type leaves the directory that owns it.
//
// THE CODE IN THIS FILE IS UNCHANGED BY SYS-02. Comment text only.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** ADR-006 OQ-1: server-side only, so neither name carries `NEXT_PUBLIC_` (02-design.md F-4). */
function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_ANON_KEY"): string {
  const value = process.env[name];
  // An absent credential is a configuration error, not an expected failure: there is no caller-facing
  // refusal to return and nothing sensible to do without it. `coding-standards.md` reserves typed
  // refusals for failures a person can act on at the point of the call.
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set. Supabase Auth needs it; see .env.example.`);
  }
  return value;
}

/**
 * Constructs a request-scoped Supabase client.
 *
 * `cookies()` returns a Promise in Next 16 — verified in
 * `node_modules/next/dist/server/request/cookies.d.ts:2` — so this is async, and it may only be
 * called from a server component, a route handler or a server action.
 *
 * A NEW CLIENT PER REQUEST. `@supabase/ssr` says so in terms and the reason is not stylistic: the
 * client closes over one request's cookie store, so a module-level singleton would serve one user's
 * session to the next.
 *
 * THIS FUNCTION HAS NO CALLER IN THIS TICKET, and that is the specified state rather than dead code
 * left behind. `01-story.md` out-of-scope item 2 puts sign-in, sign-out and sessions in the `AUT`
 * group: no session is established, no cookie is set, no route is guarded. What SYS-01 delivers is
 * the constructor and the configuration around it.
 */
export async function createSupabaseServerClient() {
  // The guard the lint exemption cannot give. This directory is the one permitted to import the
  // Supabase package group, so a file carrying React's client directive placed here would put the
  // client in the browser legally — AC-4's third clause, and 01-story.md out-of-scope item 10's
  // second bullet, which records that nothing automatic closes it. This does not close it either: it
  // is a runtime refusal, not a check. It costs three lines and it turns a silent breach into a
  // thrown error.
  if (typeof window !== "undefined") {
    throw new Error(
      "createSupabaseServerClient() was called in the browser. ADR-006 OQ-1: the Supabase client is " +
        "constructed server-side only."
    );
  }

  const store = await cookies();

  return createServerClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        // `ReadonlyRequestCookies` is `Omit<RequestCookies, "set" | "clear" | "delete"> &
        // Pick<ResponseCookies, "set" | "delete">` — verified in
        // node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.d.ts:5 — so
        // `set` exists on the type and throws at runtime when called from a server component.
        // Swallowing that is the documented pattern: a middleware refreshes the session instead, and
        // this ticket has no middleware because it has no session (out-of-scope item 2).
        //
        // TODO(verify) resolved at implementation, against the installed package and not against
        // documentation (02-design.md 1.2). `tsc --noEmit` accepts this call with no mapping and no
        // cast: Supabase's `CookieOptions` and Next's `Partial<ResponseCookie>` agree on every field
        // reached here, so the divergence the design warned about does not occur at @supabase/ssr
        // 0.12.5. The three-argument `createServerClient(url, key, options)` shape with
        // `options.cookies` as `{ getAll, setAll }` is what the installed declaration still declares;
        // the deprecated `{ get, set, remove }` overload is not used.
        try {
          for (const { name, value, options } of cookiesToSet) store.set(name, value, options);
        } catch {
          // Called from a server component. Nothing to do and nothing to report.
        }
      },
    },
  });
}
