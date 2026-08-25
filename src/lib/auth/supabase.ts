// The one place a Supabase client is constructed (ADR-006 decision 4, OQ-1, OQ-4).
//
// Server-side only. `src/lib/data/` is still the only path to data, which is the premise ADR-002
// rested on when it left Row Level Security off — and it stays true only while no Supabase client
// exists in the browser. `eslint.config.mjs` exempts exactly this directory from the restriction on
// the Supabase package group; the exemption is a permission to construct the client here, not a
// permission to ship it anywhere.
//
// NO FILE IN THIS REPOSITORY MAY NAME THE CORE SUPABASE CLIENT PACKAGE (02-design.md F-2, and rule 2
// of 1.6). It arrives as a peer of `@supabase/ssr` and resolves from pnpm's virtual store; naming it
// here would put a second Supabase package in `package.json`, which AC-3 forbids and check D12 fails
// on. The return type of `createSupabaseServerClient` is therefore INFERRED and must never be
// annotated — `tsc` resolves the peer's types through the store without this repository declaring it.
//
// THE PACKAGE NAME IS DESCRIBED RATHER THAN WRITTEN, here and in every comment below, BECAUSE THE
// CHECK IS A GREP. 02-design.md 1.6 makes a grep for that package name over `src` and `tests`
// returning nothing the test of this rule, so a comment that spells it out fails the check it is
// explaining. The same applies to React's client directive, which rule 1 greps for over this
// directory: it is referred to and never quoted. 02-design.md 6.3 holds both exact commands.

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
