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
];

export default config;
