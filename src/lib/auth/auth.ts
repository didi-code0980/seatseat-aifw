// Better Auth server instance.
//
// Configured against the installed types under `node_modules/better-auth/`, not from memory — the
// `database` option is optional in 1.6.26 (verified in
// `@better-auth/core/dist/types/init-options.d.mts`), which is what lets this file typecheck and run
// before any database exists.
//
// INV-08: there is no self-signup. `signUp` is disabled here, and there is no signup route. Two
// controls rather than one, because the absence of a route is not itself a control — a route can be
// added by accident, and the option is what makes that accident harmless.

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

// TODO(verify): the Prisma adapter (`better-auth/adapters/prisma`) is not wired. It needs a
// generated Prisma client, which needs an approved `prisma/schema.prisma` and a migration —
// both permanently human under RULE-09. Until then Better Auth runs without a configured database,
// which is sufficient for `DATA_SOURCE=mock` and for the routes to render.
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // INV-08. Accounts are created by a Manager or Admin through the account management UI.
    disableSignUp: true,
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
