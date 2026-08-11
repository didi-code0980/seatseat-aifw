"use client";

// Browser-side auth client. Login only — there is no signUp call anywhere in this application by
// design (INV-08), and adding one would need an ADR rather than an import.

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signOut, useSession } = authClient;
