import next from "eslint-config-next";
import nextTypeScript from "eslint-config-next/typescript";

// RULE-02 is enforced here, not by convention. The seam only holds if crossing it is a build
// failure — a reviewer's judgement is not a control, and review check R4 exists to catch what this
// rule already made impossible.
//
// Two things are restricted, and the second matters as much as the first:
//   - `@prisma/client`, and anything generated from it. This is the obvious one.
//   - `**/lib/data/prisma/**`. Less obvious, and the one that actually leaks: a component importing
//     the Prisma-backed implementation directly still bypasses the DATA_SOURCE switch, so the mock
//     mode silently stops being exercised even though no Prisma type appears in the file.
const SEAM_MESSAGE =
  "RULE-02: components, pages, and server actions reach data only through `@/lib/data`. " +
  "Import the seam, not an implementation. If the seam lacks what you need, the seam changes — " +
  "and that is a design decision, recorded in `02-design.md` section 3.";

// ADR-006 added the second group. Supabase Auth replaced Better Auth, and the whole of ADR-002's
// decision to leave Row Level Security off rests on `src/lib/data/` staying the only path to data.
// A Supabase client constructed in a client component makes that false — the browser would hold a
// credential that reaches the database directly, past the seam, past `can()`, past R4 and R6.
//
// So the package is restricted everywhere and exempted for exactly one path: `src/lib/auth/**`.
// `src/lib/data/` is deliberately NOT exempted. The data seam has no reason to hold an auth client,
// and the exemption list is the document that says so.
const AUTH_MESSAGE =
  "ADR-006: the Supabase client is constructed server-side only, from `src/lib/auth/**`. " +
  "A Supabase client in a client component reaches the database past the seam, which is the " +
  "condition ADR-002 named as invalidating its decision to leave Row Level Security off.";

const RESTRICTED_SEAM_IMPORTS = [
  "error",
  {
    patterns: [
      {
        group: [
          "@prisma/client",
          "@prisma/client/*",
          "**/generated/prisma",
          "**/generated/prisma/**",
          "@/lib/data/prisma",
          "@/lib/data/prisma/**",
          "**/lib/data/prisma",
          "**/lib/data/prisma/**",
        ],
        message: SEAM_MESSAGE,
      },
      {
        group: ["@supabase/*", "@supabase/*/**"],
        message: AUTH_MESSAGE,
      },
    ],
  },
];

const config = [
  {
    // Generated and build output are not source. `.claude/**` and `scripts/**` are governance
    // tooling, covered by `node --test .claude/hooks/tests/*.test.mjs` and `scripts/check-docs.mjs`
    // rather than by the application lint config, whose React and Next rules do not apply to them.
    ignores: [
      ".next/**",
      "generated/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      ".claude/**",
      "scripts/**",
      "next-env.d.ts",
    ],
  },

  ...next,
  ...nextTypeScript,

  {
    rules: {
      "no-restricted-imports": RESTRICTED_SEAM_IMPORTS,
    },
  },

  {
    // The four places the Prisma side of the seam may be named.
    //
    // `src/lib/data/index.ts` is here because it is the switch itself: it has to name both
    // implementations in order to choose between them.
    //
    // `tests/unit/seam-parity.test.ts` is here because comparing the two sides is its entire
    // purpose. The rule found this file on its own before the exception existed, which is the
    // cleanest evidence available that the restriction is real and not decorative — R4 is a lint
    // failure, not a reviewer's opinion.
    //
    // This block turns the rule OFF entirely, which is why the Supabase exemption below is a
    // separate block rather than another entry in this list: these four files may name Prisma, and
    // they may not name Supabase.
    files: [
      "src/lib/data/prisma/**/*.ts",
      "src/lib/data/index.ts",
      "prisma/seed.ts",
      "tests/unit/seam-parity.test.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  {
    // The one place the Supabase client may be constructed (ADR-006, OQ-4).
    //
    // The seam restriction is re-stated here rather than dropped: turning the whole rule off would
    // let the auth module import `@/lib/data/prisma/**` too, and nothing about holding an auth
    // client earns that. Only the Supabase group is lifted.
    files: ["src/lib/auth/**/*.ts", "src/lib/auth/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@prisma/client",
                "@prisma/client/*",
                "**/generated/prisma",
                "**/generated/prisma/**",
                "@/lib/data/prisma",
                "@/lib/data/prisma/**",
                "**/lib/data/prisma",
                "**/lib/data/prisma/**",
              ],
              message: SEAM_MESSAGE,
            },
          ],
        },
      ],
    },
  },
];

export default config;
