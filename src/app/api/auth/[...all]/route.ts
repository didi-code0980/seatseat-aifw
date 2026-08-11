// Better Auth's catch-all handler. `toNextJsHandler` returns GET, POST, PATCH, PUT and DELETE
// (verified in better-auth/dist/integrations/next-js.d.mts); only GET and POST are re-exported
// because nothing in this application uses the others, and an unused exported route method is
// surface area with no caller.

import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
