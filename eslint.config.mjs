import next from "eslint-config-next";
import nextTypeScript from "eslint-config-next/typescript";

// RULE-02 is enforced here, not by convention. The seam only holds if crossing it is a build
// failure — a reviewer's judgement is not a control, and review check R4 exists to catch what this
// rule already made impossible.
//
// AND SINCE ADR-007 THIS FILE CARRIES MORE WEIGHT THAN IT USED TO. `@prisma/client` could not run
// in a browser, so an import of it from a client component failed at build time. That was never
// designed as an enforcement of RULE-02 — it was an accident of Prisma being a Node library — but
// it was one, and it was the only one that could not be edited away. `@supabase/supabase-js` is
// isomorphic and runs in a browser perfectly. After ADR-007 the only things standing between a
// component and the database are this file and check D12, both editable in the same pull request as
// the breach. That loss is recorded as model debt (MD-33); this comment is the other half of it.
//
// Two things are restricted, and the second matters as much as the first:
//   - `**/lib/data/supabase/**`, the data adapter itself. A component importing it directly still
//     bypasses the DATA_SOURCE switch, so mock mode silently stops being exercised even though no
//     vendor type appears in the file.
//   - the `@supabase/*` package group, restricted everywhere and exempted per package below.
const SEAM_MESSAGE =
  "RULE-02: components, pages, and server actions reach data only through `@/lib/data`. " +
  "Import the seam, not an implementation. If the seam lacks what you need, the seam changes — " +
  "and that is a design decision, recorded in `02-design.md` section 3.";

// ADR-006 established the first Supabase package; ADR-007 adds the second. TWO PACKAGES, TWO
// EXEMPTED DIRECTORIES, AND NEITHER EXEMPTION COVERS THE OTHER'S PACKAGE:
//
//   @supabase/ssr          authentication          src/lib/auth/**
//   @supabase/supabase-js  reading and writing     src/lib/data/supabase/**
//
// `src/lib/auth/**` may not import the data client and the data adapter may not import the auth
// client — the separation ADR-006 asked for is preserved, not widened. Check D12 holds the same map
// from outside the build, because two controls that run at different moments catch different
// mistakes.
//
// The whole of ADR-002's decision to leave Row Level Security off rests on `src/lib/data/` being
// the only path to data, which is true only while every Supabase client is constructed server-side.
// A Supabase client in a client component makes it false — the browser would hold a credential that
// reaches the database directly, past the seam, past `can()`, past R4 and R6.
const AUTH_MESSAGE =
  "ADR-006: `@supabase/ssr` is the AUTH client and is constructed server-side only, from " +
  "`src/lib/auth/**`. ADR-007: `@supabase/supabase-js` is the DATA client and belongs to " +
  "`src/lib/data/supabase/**` alone. A Supabase client in a client component reaches the database " +
  "past the seam, which is the condition ADR-002 named as invalidating its decision to leave Row " +
  "Level Security off.";

const SEAM_PATTERNS = [
  "@/lib/data/supabase",
  "@/lib/data/supabase/**",
  "**/lib/data/supabase",
  "**/lib/data/supabase/**",
];

const SUPABASE_PATTERNS = ["@supabase/*", "@supabase/*/**"];

const RESTRICTED_SEAM_IMPORTS = [
  "error",
  {
    patterns: [
      { group: SEAM_PATTERNS, message: SEAM_MESSAGE },
      { group: SUPABASE_PATTERNS, message: AUTH_MESSAGE },
    ],
  },
];

/**
 * Everything under `@supabase/` restricted EXCEPT the one package this directory owns, plus the
 * seam restriction kept.
 *
 * The negated entry is `no-restricted-imports`' own idiom for "this group, minus this member", and
 * it is what makes the map a map rather than two independent permissions: a THIRD Supabase package
 * appearing in either directory is still an error here, without either block having to be edited to
 * name it.
 */
const allowOnly = (pkg) => [
  "error",
  {
    patterns: [
      { group: SEAM_PATTERNS, message: SEAM_MESSAGE },
      { group: [...SUPABASE_PATTERNS, `!${pkg}`, `!${pkg}/**`], message: AUTH_MESSAGE },
    ],
  },
];

const config = [
  {
    // Generated and build output are not source. `.claude/**` and `scripts/**` are governance and
    // operational tooling, covered by `node --test .claude/hooks/tests/*.test.mjs` and
    // `scripts/check-docs.mjs` rather than by the application lint config, whose React and Next
    // rules do not apply to them.
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
    // The two places the data adapter may be named. Neither may name a Supabase package.
    //
    // `src/lib/data/index.ts` is here because it is the switch itself: it has to name both
    // implementations in order to choose between them.
    //
    // `tests/unit/seam-parity.test.ts` is here because comparing the two sides is its entire
    // purpose. The rule found this file on its own before the exception existed, which is the
    // cleanest evidence available that the restriction is real and not decorative — R4 is a lint
    // failure, not a reviewer's opinion. THE EXEMPTION MOVED WITH THE DIRECTORY IT NAMES: before
    // ADR-007 this file was exempted so it could name Prisma.
    //
    // `scripts/seed.ts` is the third module permitted to import the adapter directly (ADR-007
    // OQ-3), and it is deliberately absent from this list: `scripts/**` is ignored above, so an
    // entry here would be dead configuration that reads as a permission.
    files: ["src/lib/data/index.ts", "tests/unit/seam-parity.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: SUPABASE_PATTERNS, message: AUTH_MESSAGE }] },
      ],
    },
  },

  {
    // The one place the AUTH client may be constructed (ADR-006 OQ-4). `@supabase/supabase-js` is
    // still restricted here: holding an auth client earns no route to the data client.
    files: ["src/lib/auth/**/*.ts", "src/lib/auth/**/*.tsx"],
    rules: {
      "no-restricted-imports": allowOnly("@supabase/ssr"),
    },
  },

  {
    // The one place the DATA client may be constructed (ADR-007 clause 3). `@supabase/ssr` is still
    // restricted here: the data seam has no reason to hold an auth client, and this list is the
    // document that says so.
    files: ["src/lib/data/supabase/**/*.ts"],
    rules: {
      "no-restricted-imports": allowOnly("@supabase/supabase-js"),
    },
  },
];

export default config;
