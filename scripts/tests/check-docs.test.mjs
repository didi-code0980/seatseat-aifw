// Tests for check-docs.mjs — the reference checks D2, D11 and D12.
//
// **D2, unissued IDs.** A document explaining why a number is missing has to be able to write that
// number. Before this, check-docs.mjs forced the author of `.ai/registry/invariants.md` to split the
// ID across two code spans to get past its own audit — a check editing the prose it is supposed to
// be measuring.
//
// **D11, ADRs cited by ID.** D6 only sees references written as paths. An ADR is cited as "ADR-002",
// so a decision could be cited by three documents while the file recording it did not exist — and
// the citation reads as evidence that somebody decided.
//
// **D12, the second door.** ADR-002 left Row Level Security off because `src/lib/data/` is the only
// authorization point, and named a revert signal. ADR-006 narrowed that signal to one package and
// one directory; ADR-007 makes it a two-package map, and these tests were rewritten with it — the
// ten that had been red since ADR-006, recorded as MD-16, are among them.
//
// These build a throwaway project and run the real script against it as a child process, the same
// way the hook tests do. They assert on findings for one check at a time: a minimal fixture trips
// several unrelated checks, so asserting on the exit code alone would pass for the wrong reason.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = path.join(REPO, "scripts", "check-docs.mjs");

const FRONT = ["---", "doc_version: 1", "last_updated: 2026-08-11", "governed_by: [RULE-01]", "---", ""].join("\n");

const LEDGER = [
  "## Ledger",
  "",
  "| ID | Invariant |",
  "|----|-----------|",
  "| INV-01 | A seat has at most one occupant. |",
  "| INV-10 | No two seats overlap within a room. |",
  "",
].join("\n");

const UNISSUED = [
  "## Unissued IDs",
  "",
  "| ID | Status |",
  "|----|--------|",
  "| INV-09 | Never issued. Never will be. |",
  "",
].join("\n");

/**
 * @param invariantsBody sections of .ai/registry/invariants.md, after the front-matter
 * @param docBody        a document under .ai/standards/ that cites invariant IDs
 * @param extra          any further files, keyed by repo-relative path, written verbatim
 */
function project(invariantsBody, docBody, extra = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moo-docs-"));
  const write = (rel, body) => {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  };

  write(".ai/registry/invariants.md", FRONT + "# Domain invariants\n\n" + invariantsBody);
  write(".ai/registry/rules.md", FRONT + "| RULE-01 | Registry is read-only. | 1 | CLAUDE.md |\n");
  write(".ai/registry/features.md", FRONT + "| ID | Title |\n|----|-------|\n");
  write(".ai/standards/probe.md", FRONT + docBody + "\n");
  for (const [rel, body] of Object.entries(extra)) write(rel, body);
  return root;
}

function run(root) {
  const res = spawnSync(process.execPath, [SCRIPT], { cwd: root, encoding: "utf8" });
  const stdout = res.stdout ?? "";

  // Findings grouped by check, so an unrelated check failing in a minimal fixture cannot make a
  // test pass or fail for a reason it is not about. Asserting on the exit code alone would.
  const byCheck = new Map();
  let current = null;
  for (const line of stdout.split("\n")) {
    // PENDING is a header too. Without it, a PENDING block's entries were appended to whichever
    // check was last opened — so a fixture that happens to mention a Phase B path could add a
    // finding to an unrelated check and decide an assertion.
    const header = /^(?:FAIL|WARN|PENDING)\s+(D\d+)\b/.exec(line);
    if (header) {
      current = header[1];
      byCheck.set(current, []);
      continue;
    }
    if (current && line.trim().startsWith("- ")) byCheck.get(current).push(line.trim());
    else if (line.trim() === "") current = null;
  }

  return {
    code: res.status,
    stdout,
    findings: (check) => byCheck.get(check) ?? [],
    d2: (byCheck.get("D2") ?? []).filter((l) => /INV-\d{2}/.test(l)),
  };
}

// A decisions directory with the two ADRs that exist in the real repo, plus whatever a test adds.
const decisions = (...ids) =>
  Object.fromEntries(
    ids.map((id) => [`.ai/registry/decisions/${id}-something.md`, FRONT + `# ${id}\n`])
  );

// --- the unissued path -------------------------------------------------------------------------

test("citing an unissued ID does not fail D2", () => {
  const r = run(project(LEDGER + UNISSUED, "The ledger skips INV-09 deliberately."));
  assert.deepEqual(r.d2, [], "INV-09 is listed under Unissued IDs and must resolve");
});

test("an unissued ID is not treated as issued", () => {
  // The Unissued table uses the same row shape as the ledger. A file-wide regex would read INV-09
  // as a real invariant, which is the precise opposite of what that section declares.
  const r = run(project(LEDGER + UNISSUED, "x"));
  assert.match(r.stdout, /docs-audit/);
  assert.ok(
    !r.stdout.includes("INV-09 is in both"),
    "a clean file must not report the both-tables contradiction"
  );
});

test("an issued ID still resolves alongside an unissued one", () => {
  const r = run(project(LEDGER + UNISSUED, "See INV-01 and INV-10, and note the gap at INV-09."));
  assert.deepEqual(r.d2, []);
});

test("prose mentions inside the Unissued section do not become unissued IDs", () => {
  // "The next invariant issued will be INV-11" is a forward-looking sentence, not a row. Citing
  // INV-11 from another document must still fail.
  const unissuedWithProse = UNISSUED + "\nThe next invariant issued will be INV-11.\n\n";
  const r = run(project(LEDGER + unissuedWithProse, "Depends on INV-11."));
  assert.equal(r.d2.length, 1);
  assert.match(r.d2[0], /references INV-11, absent from invariants\.md/);
});

// --- a genuinely dangling reference ------------------------------------------------------------

test("citing an ID that is neither issued nor unissued fails D2", () => {
  const r = run(project(LEDGER + UNISSUED, "Held by INV-42."));
  assert.equal(r.code, 1);
  assert.equal(r.d2.length, 1);
  assert.match(r.d2[0], /probe\.md: references INV-42, absent from invariants\.md/);
});

test("the unissued table does not whitelist every ID", () => {
  const r = run(project(LEDGER + UNISSUED, "INV-09 is fine but INV-08 was never added to this ledger."));
  assert.equal(r.d2.length, 1, `expected only INV-08 to fail, got: ${r.d2.join(" | ")}`);
  assert.match(r.d2[0], /INV-08/);
});

test("with no Unissued section at all, D2 behaves as it did before", () => {
  const r = run(project(LEDGER, "The gap at INV-09."));
  assert.equal(r.code, 1);
  assert.equal(r.d2.length, 1);
  assert.match(r.d2[0], /references INV-09, absent from invariants\.md/);
});

test("invariants.md may cite anything, including a future ID", () => {
  // The registry file is exempt from D2 against itself; that predates this change and must survive
  // it, because the file has to be able to discuss IDs it does not list.
  const body = LEDGER + UNISSUED + "\nThe next invariant issued will be INV-11.\n";
  const r = run(project(body, "x"));
  assert.deepEqual(r.d2, []);
});

// --- the contradiction guard -------------------------------------------------------------------

test("an ID in both tables is reported rather than silently dropped", () => {
  const contradiction = [
    "## Ledger",
    "",
    "| ID | Invariant |",
    "|----|-----------|",
    "| INV-01 | A seat has at most one occupant. |",
    "| INV-09 | Something. |",
    "",
  ].join("\n");
  const r = run(project(contradiction + UNISSUED, "x"));
  assert.equal(r.code, 1);
  assert.match(r.stdout, /INV-09 is in both the ledger and the Unissued IDs table/);
});

// --- D11: ADRs cited by ID resolve to a file ---------------------------------------------------

test("citing an ADR that exists passes D11", () => {
  const r = run(project(LEDGER + UNISSUED, "The provider decision is ADR-002.", decisions("ADR-002")));
  assert.deepEqual(r.findings("D11"), []);
});

test("citing an ADR with no file fails D11", () => {
  const r = run(project(LEDGER + UNISSUED, "The provider decision is ADR-002.", decisions("ADR-001")));
  assert.equal(r.code, 1);
  assert.equal(r.findings("D11").length, 1);
  assert.match(r.findings("D11")[0], /probe\.md: references ADR-002, which has no file in \.ai\/registry\/decisions\//);
});

test("D11 covers ticket.yaml, where a schema_delta links its approved ADR", () => {
  const r = run(
    project(LEDGER + UNISSUED, "x", {
      ...decisions("ADR-001"),
      ".ai/board/tickets/ROO-01/ticket.yaml": "id: ROO-01\nschema_delta: see ADR-007\n",
    })
  );
  assert.equal(r.findings("D11").length, 1);
  assert.match(r.findings("D11")[0], /ticket\.yaml: references ADR-007/);
});

test("D11 matches an ADR by its file prefix, not the whole filename", () => {
  const r = run(
    project(LEDGER + UNISSUED, "See ADR-002.", {
      ".ai/registry/decisions/ADR-002-supabase-hosted-postgres.md": FRONT + "# ADR-002\n",
    })
  );
  assert.deepEqual(r.findings("D11"), []);
});

test("templates are exempt from D11 — they carry example IDs by definition", () => {
  const r = run(
    project(LEDGER + UNISSUED, "x", {
      ...decisions("ADR-001"),
      ".ai/templates/tech-design.md": FRONT + "Link the ADR, e.g. ADR-042.\n",
    })
  );
  assert.deepEqual(r.findings("D11"), []);
});

test("the ADR-nnn placeholder is not a reference", () => {
  const r = run(project(LEDGER + UNISSUED, "Copy this to ADR-nnn-title.md.", decisions("ADR-001")));
  assert.deepEqual(r.findings("D11"), []);
});

test("an ADR citing its own ID resolves", () => {
  const r = run(project(LEDGER + UNISSUED, "x", decisions("ADR-001")));
  assert.deepEqual(r.findings("D11"), []);
});

test("with no decisions directory at all, every citation fails", () => {
  const r = run(project(LEDGER + UNISSUED, "See ADR-001."));
  assert.equal(r.findings("D11").length, 1);
  assert.match(r.findings("D11")[0], /ADR-001/);
});

// --- D12: the seam has not grown a second door -------------------------------------------------
//
// REWRITTEN FOR ADR-007, WITH SYS-02, WHICH IS WHAT MD-16 ASKED FOR. MD-16 declined to add further
// checks to a suite nobody could run green and named this rewrite as the moment to clear it: the ten
// tests below were written for ADR-002's rule, where any Supabase package at all was the finding,
// and they stayed red through ADR-006's narrowing.
//
// What they assert now is the MAP:
//
//     { "@supabase/ssr": "src/lib/auth/", "@supabase/supabase-js": "src/lib/data/supabase/" }
//
// A package outside it is an error; a mapped package outside its own directory is the same error by
// a different route — including inside the OTHER mapped directory, which is the case the old
// one-package check could not express at all.

const ESLINT = (patterns, files = '["src/lib/data/supabase/**/*.ts"]') => `
const RESTRICTED = ["error", { patterns: [{ group: ${patterns}, message: "seam" }] }];
export default [
  { rules: { "no-restricted-imports": RESTRICTED } },
  { files: ${files}, rules: { "no-restricted-imports": "off" } },
];
`;

const PKG = (deps = {}) => JSON.stringify({ name: "p", version: "1.0.0", ...deps }, null, 2);

/** Both mapped packages, restricted — the arrangement ADR-007 authorises. */
const MAPPED = {
  "package.json": PKG({
    dependencies: { "@supabase/ssr": "0.12.5", "@supabase/supabase-js": "2.112.4" },
  }),
  "eslint.config.mjs": ESLINT('["@supabase/*", "@supabase/*/**"]'),
};

const src = (rel, body) => ({ [`src/${rel}`]: body });

test("both mapped packages, each restricted, pass D12", () => {
  const r = run(project(LEDGER + UNISSUED, "x", { ...decisions("ADR-002", "ADR-007"), ...MAPPED }));
  assert.deepEqual(r.findings("D12"), []);
});

test("a third @supabase package is a second door", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "package.json": PKG({
      dependencies: {
        "@supabase/ssr": "0.12.5",
        "@supabase/supabase-js": "2.112.4",
        "@supabase/realtime-js": "2.0.0",
      },
    }),
  }));
  assert.equal(r.code, 1);
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /dependencies includes @supabase\/realtime-js/);
  assert.match(r.findings("D12")[0], /second door/);
});

for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
  test(`D12 checks ${field}`, () => {
    const r = run(project(LEDGER + UNISSUED, "x", {
      ...decisions("ADR-002", "ADR-007"),
      "package.json": PKG({ [field]: { "@supabase/realtime-js": "2.0.0" } }),
    }));
    assert.equal(r.findings("D12").length, 1, `${field} was not checked`);
    assert.match(r.findings("D12")[0], new RegExp(`${field} includes @supabase/realtime-js`));
  });
}

test("D12 is case-insensitive on the package name", () => {
  // npm normalises package names to lower case, so a mixed-case entry does not resolve — but an
  // audit that silently skipped an entry a reader can plainly see is the wrong way to be wrong.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": PKG({ dependencies: { "@Supabase/REALTIME-js": "2.0.0" } }),
  }));
  assert.equal(r.findings("D12").length, 1);
});

test("the bare `supabase` CLI package is not an SDK and does not fail D12", () => {
  // ADR-002 is about what can talk to the database from application code. The CLI is tooling, and
  // ADR-007 makes it a devDependency of this project.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": PKG({ devDependencies: { supabase: "2.115.0" } }),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("a clean package.json passes D12", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": PKG({ dependencies: { next: "16.3.0" } }),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("a package.json that is not valid JSON is reported, not skipped", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": "{ this is not json",
  }));
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /not valid JSON/);
});

// --- D12 via eslint.config.mjs: the finding is an ABSENCE ---------------------------------------

test("a Supabase dependency with nothing restricting it is the dangerous ordering", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": PKG({ dependencies: { "@supabase/ssr": "0.12.5" } }),
    "eslint.config.mjs": ESLINT('["@/lib/data/supabase/**"]'),
  }));
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /does not name/);
  assert.match(r.findings("D12")[0], /unrestricted/);
});

test("no eslint config at all is not a D12 failure", () => {
  // Before Phase B there is no lint config. Absence is not a second door.
  const r = run(project(LEDGER + UNISSUED, "x", decisions("ADR-002", "ADR-007")));
  assert.deepEqual(r.findings("D12"), []);
});

test("a `lib/data` path exempted for the AUTH package is a finding", () => {
  // The one case ADR-007 left of the old always-wrong branch. The data seam holding an auth client
  // is still the drift ADR-006 exists to prevent.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "eslint.config.mjs":
      ESLINT('["@supabase/*"]') +
      `\nexport const authExemption = ["src/lib/data/supabase/** @supabase/ssr"];\n`,
  }));
  assert.equal(r.findings("D12").length, 1, r.stdout);
  assert.match(r.findings("D12")[0], /exempts a `lib\/data` path for `@supabase\/ssr`/);
});

test("a `lib/data` path exempted for the DATA package is NOT a finding", () => {
  // The branch ADR-007 retired. Under ADR-006 this literal was always an error; it is now the
  // arrangement, and a check that still fired on it would make its own ticket unimplementable.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "eslint.config.mjs":
      ESLINT('["@supabase/*"]') +
      `\nexport const dataExemption = ["src/lib/data/supabase/** @supabase/supabase-js"];\n`,
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("a comment mentioning Supabase does not fail D12", () => {
  // A check that fired on its own rationale would teach people to delete the rationale.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "eslint.config.mjs":
      "// src/lib/data holds no @supabase/ssr client; ADR-006 keeps it in src/lib/auth.\n" +
      "/* @supabase/ssr is the auth package and lib/data may not name it */\n" +
      ESLINT('["@supabase/*"]'),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("D12 survives glob patterns that contain /* and */", () => {
  // The regression that shipped: stripping block comments with a regex made a glob ending `/*` open
  // a comment which closed inside the next `**/...` entry, deleting every entry between them —
  // including the one that mattered. Fixtures with simple names did not reproduce it; the real
  // pattern list did.
  const realistic = `
const RESTRICTED = ["error", { patterns: [{ group: [
  "@/lib/data/supabase",
  "@/lib/data/supabase/**",
  "**/lib/data/supabase/**",
  "@supabase/*",
  "@supabase/*/**",
], message: "seam" }] }];
export default [{ rules: { "no-restricted-imports": RESTRICTED } }];
`;
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "eslint.config.mjs": realistic,
  }));
  // The restriction is seen, so the absence branch does not fire.
  assert.deepEqual(r.findings("D12"), [], r.stdout);
});

// --- D12 via src/**: the breach itself -----------------------------------------------------------

test("each mapped package inside its own directory passes", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    ...src("lib/auth/supabase.ts", `import { createServerClient } from "@supabase/ssr";\n`),
    ...src("lib/data/supabase/client.ts", `import { createClient } from "@supabase/supabase-js";\n`),
  }));
  assert.deepEqual(r.findings("D12"), [], r.stdout);
});

test("the AUTH package imported from the data adapter is a finding", () => {
  // The case the old one-package check could not express: both directories are exempted, and this
  // is still wrong. Neither exemption covers the other's package.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    ...src("lib/data/supabase/client.ts", `import { createServerClient } from "@supabase/ssr";\n`),
  }));
  assert.equal(r.findings("D12").length, 1, r.stdout);
  assert.match(r.findings("D12")[0], /names @supabase\/ssr outside `src\/lib\/auth\/\*\*`/);
});

test("the DATA package imported from the auth directory is a finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    ...src("lib/auth/permissions.ts", `import { createClient } from "@supabase/supabase-js";\n`),
  }));
  assert.equal(r.findings("D12").length, 1, r.stdout);
  assert.match(
    r.findings("D12")[0],
    /names @supabase\/supabase-js outside `src\/lib\/data\/supabase\/\*\*`/
  );
});

test("a Supabase import in a component is a finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    ...src("app/rooms/page.tsx", `import { createClient } from "@supabase/supabase-js";\n`),
  }));
  assert.equal(r.findings("D12").length, 1, r.stdout);
  assert.match(r.findings("D12")[0], /app\/rooms\/page\.tsx/);
});

test("an unmapped @supabase package is a finding wherever it is imported", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    ...src("lib/auth/realtime.ts", `import { RealtimeClient } from "@supabase/realtime-js";\n`),
  }));
  assert.equal(r.findings("D12").length, 1, r.stdout);
  assert.match(r.findings("D12")[0], /is in no exempted directory/);
});

test("D12 reports each distinct misplaced package once", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    ...src(
      "app/rooms/page.tsx",
      `import "@supabase/supabase-js";\nimport "@supabase/supabase-js";\nimport "@supabase/ssr";\n`
    ),
  }));
  assert.equal(r.findings("D12").length, 2, r.findings("D12").join(" | "));
});

test("both routes report independently", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": PKG({ dependencies: { "@supabase/realtime-js": "2.0.0" } }),
    ...src("app/rooms/page.tsx", `import "@supabase/realtime-js";\n`),
  }));
  assert.equal(r.findings("D12").length, 2);
  assert.ok(r.findings("D12").some((l) => l.includes("package.json")));
  assert.ok(r.findings("D12").some((l) => l.includes("app/rooms/page.tsx")));
});

// --- built from the real files, not from a simplified fixture ----------------------------------
//
// See "Fixtures that share the implementation's assumptions" in .ai/standards/testing-standards.md.
// The two below read this repository's actual package.json and eslint.config.mjs. The D12 glob bug
// survived fourteen fixture tests and was only caught by running against the real file.

test("this repository's real package.json is clean under D12", () => {
  const real = fs.readFileSync(path.join(REPO, "package.json"), "utf8");
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    "package.json": real,
    "eslint.config.mjs": fs.readFileSync(path.join(REPO, "eslint.config.mjs"), "utf8"),
  }));
  assert.deepEqual(r.findings("D12"), [], "every Supabase package must be in the map");
});

test("this repository's real eslint.config.mjs is clean, and hides no injected entry", () => {
  // The positive case has to use the real pattern list. A fixture list of simple names does not
  // contain the globs ending in `/*`, which is the shape that broke the check.
  const real = fs.readFileSync(path.join(REPO, "eslint.config.mjs"), "utf8");
  const injected = real.replace(
    'const SUPABASE_PATTERNS = [',
    'const SEAM_AUTH_EXEMPTION = ["src/lib/data/supabase/** @supabase/ssr"];\nconst SUPABASE_PATTERNS = ['
  );
  assert.notEqual(injected, real, "injection point not found — update this test");

  const clean = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "eslint.config.mjs": real,
  }));
  assert.deepEqual(clean.findings("D12"), [], `the real config must be clean: ${clean.stdout}`);

  const dirty = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002", "ADR-007"),
    ...MAPPED,
    "eslint.config.mjs": injected,
  }));
  assert.equal(dirty.findings("D12").length, 1, `real config must not hide the entry: ${dirty.stdout}`);
  assert.match(dirty.findings("D12")[0], /@supabase\/ssr/);
});

// --- D9: scoped to documents a human owns ------------------------------------------------------
//
// D9 requires doc_version, last_updated and governed_by. It used to read every .md under .ai/,
// which included agent-produced board artifacts. The first story written under that scope failed it
// and the fields were pasted into the artifact to clear the failure — the check was satisfied rather
// than reported, which is what a check on agent output gets.
//
// The real-file test below is the one that matters, per "Fixtures that share the implementation's
// assumptions" in testing-standards.md. A hand-written stub of a story would carry whatever
// front-matter the author of the scope rule imagined a story carries. The real artifact carries what
// the template actually produces.

const realStory = () =>
  fs.readFileSync(path.join(REPO, ".ai/board/tickets/ROO-01/01-story.md"), "utf8");

test("the real 01-story.md is not a D9 finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/board/tickets/ROO-01/01-story.md": realStory(),
  }));
  assert.deepEqual(
    r.findings("D9"),
    [],
    "a board artifact carries artifact front-matter, not document front-matter"
  );
});

test("the real 01-story.md carries artifact front-matter and no document front-matter", () => {
  // Guards the premise rather than the check. If a future story does carry doc_version, this test
  // fails and someone reads why — instead of the scope rule quietly protecting a pasted field.
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(realStory());
  assert.ok(fm, "the story has no front-matter at all");
  for (const field of ["ticket", "stage", "agent", "gate", "chat_before_verdict"]) {
    assert.match(fm[1], new RegExp(`^${field}:`, "m"), `artifact front-matter is missing ${field}`);
  }
  for (const field of ["doc_version", "last_updated", "governed_by"]) {
    assert.ok(
      !new RegExp(`^${field}:`, "m").test(fm[1]),
      `${field} is back in the artifact — the workaround has returned`
    );
  }
});

test("D9 is scoped by path, not switched off: the same artifact under .ai/standards/ is reported", () => {
  // The failure mode of a narrowing is narrowing to nothing. This is the same bytes as the test
  // above, moved into a plane a human owns, and all three findings must appear.
  const r = run(project(LEDGER + UNISSUED, "x", { ".ai/standards/probe2.md": realStory() }));
  const d9 = r.findings("D9").filter((l) => l.includes("probe2.md"));
  assert.equal(d9.length, 3, `expected all three fields reported, got: ${d9.join(" | ")}`);
  assert.ok(d9.some((l) => /no doc_version/.test(l)));
  assert.ok(d9.some((l) => /no last_updated/.test(l)));
  assert.ok(d9.some((l) => /no governed_by/.test(l)));
});

test("a registry document with no front-matter still fails D9", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/probe3.md": "# No front-matter here\n",
  }));
  assert.equal(r.code, 1);
  assert.equal(r.findings("D9").length, 1);
  assert.match(r.findings("D9")[0], /probe3\.md: has no front-matter/);
});

test("the operating model and the charter stay in scope", () => {
  // Neither is under .ai/registry/, and both are human-owned. 01-operating-model.md cites more rules
  // in governed_by than any other document, so it is where a rule-version bump goes stale first.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/00-charter.md": "# Charter\n",
    ".ai/01-operating-model.md": "# Operating model\n",
  }));
  const named = r.findings("D9").filter((l) => /00-charter|01-operating-model/.test(l));
  assert.equal(named.length, 2, `both must be checked, got: ${named.join(" | ")}`);
});

test("templates stay in scope", () => {
  const r = run(project(LEDGER + UNISSUED, "x", { ".ai/templates/story.md": "# Story template\n" }));
  assert.equal(r.findings("D9").filter((l) => l.includes("templates/story.md")).length, 1);
});

test("a rule-version bump the document has not caught up with still fails D9", () => {
  // The half of D9 that does not care about presence: governed_by naming a rule at a version above
  // the document's own. This is step 4 of "Changing a rule" in rules.md.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/rules.md": FRONT + "| RULE-01 | Registry is read-only. | 2 | CLAUDE.md |\n",
  }));
  const stale = r.findings("D9").filter((l) => /RULE-01 at v2 but doc_version is 1/.test(l));
  assert.ok(stale.length > 0, `expected a version-drift finding, got:\n${r.stdout}`);
});

test("board files other than tickets are out of scope too", () => {
  // backlog.md and metrics.md are written by the orchestrator. A check an agent can silence by
  // editing its own output measures compliance, not the document.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/board/backlog.md": "# Backlog\n",
    ".ai/board/metrics.md": "# Metrics\n",
  }));
  assert.deepEqual(r.findings("D9").filter((l) => l.includes(".ai/board/")), []);
});

// --- D13: every Definition of Ready item is satisfiable ----------------------------------------

const ENUM = "# state enum: IDEA TRIAGE BACKLOG READY SPEC DESIGN IN_PROGRESS REVIEW QA REWORK ESCALATED DONE";

/** An operating model with the given DoR bullet lines. */
const OPMODEL = (items) =>
  FRONT + "# Operating model\n\n## Definition of Ready\n\n" + items.join("\n") + "\n\n## WIP\n\nWIP = 1.\n";

const dorProject = (items, opts = {}) =>
  project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    ".ai/templates/ticket.yaml": (opts.enumLine ?? ENUM) + "\nid: X\n",
    ".ai/01-operating-model.md": OPMODEL(items),
  });

test("a DoR item produced before READY passes D13", () => {
  const r = run(dorProject(["- `feature_ids` non-empty. Added by a human at BACKLOG."]));
  assert.deepEqual(r.findings("D13"), []);
});

test("a DoR item produced after READY fails D13", () => {
  // The defect this check exists for: DoR gates READY, so a field only SPEC can set is unreachable.
  const r = run(dorProject(["- `size_estimate` is S or M. Set by the BA at SPEC from the story."]));
  assert.equal(r.code, 1);
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /produced at SPEC, which is after READY/);
  assert.match(r.findings("D13")[0], /can never be satisfied/);
});

test("DESIGN is also after READY", () => {
  const r = run(dorProject(["- `allowed_paths` enumerated at DESIGN."]));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /produced at DESIGN/);
});

test("an item attributing no stage fails D13", () => {
  const r = run(dorProject(["- `schema_delta` is `none`, or an approved ADR is linked"]));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /names no producing stage/);
});

test("a bare stage mention is not an attribution", () => {
  // "dependencies DONE" is a condition on OTHER tickets. Reading its DONE as this item's producer
  // would report a defect that is not there.
  const r = run(dorProject(["- dependencies `DONE`"]));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /names no producing stage/, "must not claim it is produced at DONE");
});

test("`by a human` counts as a producer and is never late", () => {
  const r = run(dorProject(["- every ID present in `features.md`, put there by a human"]));
  assert.deepEqual(r.findings("D13"), []);
});

test("READY itself is at or before READY", () => {
  const r = run(dorProject(["- the orchestrator confirms it at READY."]));
  assert.deepEqual(r.findings("D13"), []);
});

test("an item continued on following lines is read whole", () => {
  const r = run(dorProject([
    "- `size_estimate` is S or M.",
    "  Set by the BA at SPEC from the story's scope and its",
    "  Out-of-scope section.",
  ]));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /produced at SPEC/);
});

test("an item naming one reachable stage among several passes", () => {
  const r = run(dorProject(["- set by a human at BACKLOG, and re-checked at DESIGN."]));
  assert.deepEqual(r.findings("D13"), []);
});

test("a missing Definition of Ready section is reported", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    ".ai/templates/ticket.yaml": ENUM + "\nid: X\n",
    ".ai/01-operating-model.md": FRONT + "# Operating model\n\n## WIP\n\nWIP = 1.\n",
  }));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /no `## Definition of Ready` section/);
});

test("an empty Definition of Ready is reported", () => {
  const r = run(dorProject([]));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /lists no items/);
});

test("a state enum with no READY is reported against the template", () => {
  const r = run(dorProject(["- set by a human at BACKLOG."], { enumLine: "# state enum: IDEA BACKLOG DONE" }));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /state enum has no READY/);
});

// --- built from the real 01-operating-model.md --------------------------------------------------
//
// Per "Fixtures that share the implementation's assumptions" in testing-standards.md. A DoR written
// by the author of this check would use the phrasing the check expects; the real document does not.

const realOpModel = () => fs.readFileSync(path.join(REPO, ".ai/01-operating-model.md"), "utf8");
const realTicketTpl = () => fs.readFileSync(path.join(REPO, ".ai/templates/ticket.yaml"), "utf8");

const realDorProject = (opModel) =>
  project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    ".ai/01-operating-model.md": opModel,
    ".ai/templates/ticket.yaml": realTicketTpl(),
  });

test("the real Definition of Ready is satisfiable", () => {
  // Every item must attribute a stage, and every attributed stage must sit at or before READY. This
  // is the third placement of this gate; the first two failed it.
  const r = run(realDorProject(realOpModel()));
  assert.deepEqual(r.findings("D13"), [], "the real DoR should be clean under the current ordering");
});

test("D13 catches a regression injected into the real 01-operating-model.md", () => {
  // A check that is green can be green because it is broken. This moves one real DoR item's producer
  // past the gate, in the real document, and requires the check to notice.
  const model = realOpModel();
  const regressed = model.replace(
    /^(\|\s*5\s*\|[^|]*\|\s*)SPEC(\s*\|)/m,
    "$1DESIGN$2"
  );
  assert.notEqual(regressed, model, "DoR row 5 not found — update this test to match the document");

  const r = run(realDorProject(regressed));
  assert.equal(r.findings("D13").length, 1, `expected one finding, got:\n${r.stdout}`);
  assert.match(r.findings("D13")[0], /produced at DESIGN, which is after READY/);
});

test("D13 catches the enum falling out of lifecycle order", () => {
  // Position comes from the state enum. Reordering the lifecycle without reordering the enum would
  // leave the check measuring against the old order and agreeing with a document that has changed.
  const staleEnum = realTicketTpl().replace(
    "# state enum: IDEA TRIAGE BACKLOG SPEC READY",
    "# state enum: IDEA TRIAGE BACKLOG READY SPEC"
  );
  assert.notEqual(staleEnum, realTicketTpl(), "enum line not found — update this test");

  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    ".ai/01-operating-model.md": realOpModel(),
    ".ai/templates/ticket.yaml": staleEnum,
  }));
  assert.ok(
    r.findings("D13").some((l) => /size_estimate/.test(l) && /after READY/.test(l)),
    `a stale enum must surface as unsatisfiable DoR items, got:\n${r.stdout}`
  );
});

test("a table DoR reads the Produced at column, not the item text", () => {
  // The item text of row 3 contains the word DONE. Only the `Produced at` cell is the attribution.
  const table = [
    "| # | Item | Produced at | By |",
    "|---|------|-------------|-----|",
    "| 1 | Every ticket in `depends_on` is `DONE` | BACKLOG | a human |",
  ];
  const r = run(dorProject(table));
  assert.deepEqual(r.findings("D13"), [], "DONE in the item text must not be read as the producer");
});

test("a table row whose Produced at is after READY fails", () => {
  const table = [
    "| # | Item | Produced at | By |",
    "|---|------|-------------|-----|",
    "| 1 | `allowed_paths` enumerated | DESIGN | `tech-lead-design` |",
  ];
  const r = run(dorProject(table));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /produced at DESIGN, which is after READY/);
});

test("a table row with an empty Produced at cell fails", () => {
  const table = [
    "| # | Item | Produced at | By |",
    "|---|------|-------------|-----|",
    "| 1 | `schema_delta` is `none` |  |  |",
  ];
  const r = run(dorProject(table));
  assert.equal(r.findings("D13").length, 1);
  assert.match(r.findings("D13")[0], /names no producing stage/);
});

// --- D5 and D6: scoped the same way D9 is -------------------------------------------------------
//
// Both used to read agent-produced board artifacts. `tech-lead-design` wrote `/rooms` — a Next.js
// route — into 02-design.md, and D5 reported it as a slash command with no definition. That agent
// raised the finding instead of renaming the route, which is the correct behaviour and precisely the
// one not to depend on: the cheap way out is to make the finding stop appearing.
//
// D6 has the same exposure for a different reason. A design's section 5 enumerates `allowed_paths`
// for files the NEXT stage creates, so "does not exist on disk" is the expected state at the moment
// the design is written.
//
// Real artifacts below, not stubs. A hand-written design would contain whatever route names the
// author of the scope rule imagined; the real one contains what the Tech Lead actually wrote.

const realDesign = () =>
  fs.readFileSync(path.join(REPO, ".ai/board/tickets/ROO-01/02-design.md"), "utf8");

test("the real 02-design.md contains route-shaped tokens", () => {
  // If this stops being true the two tests below stop proving anything, and would pass silently.
  assert.match(realDesign(), /(?<![\w./-])\/rooms(?![\w./-])/, "02-design.md no longer names /rooms");
});

test("a route in a board artifact is not a D5 finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/board/tickets/ROO-01/02-design.md": realDesign(),
  }));
  assert.deepEqual(r.findings("D5"), [], "/rooms is a route in agent output, not a slash command");
});

test("D5 is scoped by path, not switched off: the same bytes under .ai/standards/ are reported", () => {
  // The failure mode of a narrowing is narrowing to nothing, and a check that fires on no file
  // passes everywhere. Same content, human-owned path.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/standards/probe-d5.md": FRONT + "The route is /rooms and it lists rooms.\n",
  }));
  const d5 = r.findings("D5").filter((l) => l.includes("probe-d5.md"));
  assert.equal(d5.length, 1, `expected one D5 finding, got:\n${r.stdout}`);
  assert.match(d5[0], /references \/rooms, which has no file in \.claude\/commands\//);
});

test("D5 still reads .claude/**, which is human-authored configuration", () => {
  // Narrowing to `.ai/registry|standards|templates` alone would have dropped the agent and command
  // definitions, which is most of what D5 is for.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".claude/agents/probe.md": "Run /not-a-command and stop.\n",
  }));
  const d5 = r.findings("D5").filter((l) => l.includes(".claude/agents/probe.md"));
  assert.equal(d5.length, 1, `expected D5 to cover .claude/**, got:\n${r.stdout}`);
});

test("a not-yet-created path in a board artifact is not a D6 finding", () => {
  // package.json makes D6 strict; without it the phase-aware branch defers src/ paths to PENDING
  // and this test would pass without exercising the scope rule at all.
  const r = run(project(LEDGER + UNISSUED, "x", {
    "package.json": "{}",
    ".ai/board/tickets/ROO-01/02-design.md":
      "allowed_paths:\n- `src/app/(app)/rooms/page.tsx`\n- `src/lib/data/mock/rooms.ts`\n",
  }));
  assert.deepEqual(r.findings("D6"), [], "a design names files the next stage creates");
});

test("D6 is scoped by path, not switched off: the same bytes under .ai/standards/ are reported", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    "package.json": "{}",
    ".ai/standards/probe-d6.md": FRONT + "See `src/lib/data/nonexistent.ts`.\n",
  }));
  const d6 = r.findings("D6").filter((l) => l.includes("probe-d6.md"));
  assert.equal(d6.length, 1, `expected one D6 finding, got:\n${r.stdout}`);
  assert.match(d6[0], /src\/lib\/data\/nonexistent\.ts, which does not exist on disk/);
});

// --- D6: a gitignored path is absent by design (MD-40) ------------------------------------------
//
// `verify` was red on `main` for three runs, and two of the three findings were `node_modules/` —
// cited by two standards documents that tell an agent to inspect installed types there. `docs-audit`
// runs before `pnpm install`. The documents were correct and the check was asking the wrong question.
//
// These two tests need a real git repository, because the answer comes from `git check-ignore`. In a
// non-repository the helper falls back to checking nothing, which is why every other test in this
// file is unaffected by the change.

function gitProject(extra) {
  const root = project(LEDGER + UNISSUED, "x", extra);
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  return { root, ok: git("rev-parse", "--git-dir").status === 0 };
}

test("a gitignored path named in a governed document is not a D6 finding", () => {
  const { root, ok } = gitProject({
    "package.json": "{}",
    ".gitignore": "node_modules\n",
    ".ai/standards/probe-d6-ignored.md": FRONT + "Inspect installed types under `node_modules/`.\n",
  });
  if (!ok) return; // no git on this machine; the fallback is tested by every other case here
  const r = run(root);
  assert.deepEqual(
    r.findings("D6").filter((l) => l.includes("probe-d6-ignored.md")),
    [],
    `an ignored path is absent by design, got:\n${r.stdout}`
  );
});

test("D6's gitignore exemption does not excuse a path git tracks", () => {
  // The failure mode of "ask git" is answering yes too often. Same document, one ignored path and
  // one that is simply missing; only the second is a finding.
  const { root, ok } = gitProject({
    "package.json": "{}",
    ".gitignore": "node_modules\n",
    ".ai/standards/probe-d6-both.md":
      FRONT + "See `node_modules/next/package.json` and `src/lib/data/nonexistent.ts`.\n",
  });
  if (!ok) return;
  const r = run(root);
  const d6 = r.findings("D6").filter((l) => l.includes("probe-d6-both.md"));
  assert.equal(d6.length, 1, `expected exactly one D6 finding, got:\n${r.stdout}`);
  assert.match(d6[0], /src\/lib\/data\/nonexistent\.ts/);
});

// --- D6: ADRs are exempt (MD-38) ----------------------------------------------------------------
//
// A decision record describes what was true when the decision was taken, and decisions authorise
// deletions. ADR-006 removed three auth files; SYS-01 carried it out; D6 then failed on ADR-002 and
// ADR-006 forever, for correctly describing the deletion the repository had agreed to. The pressure
// that creates is to edit an accepted ADR so a checker passes, which is why the exemption exists.

test("a deleted path named in an ADR is not a D6 finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    "package.json": "{}",
    ".ai/registry/decisions/ADR-002-probe.md":
      FRONT + "Removed by this decision: `src/lib/auth/deleted-by-adr.ts`.\n",
  }));
  assert.deepEqual(r.findings("D6"), [], "an ADR may name a file the decision deleted");
});

test("D6's ADR exemption is scoped to decisions/, not to the registry", () => {
  // The failure mode of an exemption is that it is wider than it reads. Same bytes, sibling path.
  const r = run(project(LEDGER + UNISSUED, "x", {
    "package.json": "{}",
    ".ai/registry/probe-d6-adr.md":
      FRONT + "Removed by this decision: `src/lib/auth/deleted-by-adr.ts`.\n",
  }));
  const d6 = r.findings("D6").filter((l) => l.includes("probe-d6-adr.md"));
  assert.equal(d6.length, 1, `expected one D6 finding outside decisions/, got:\n${r.stdout}`);
});

test("D5, D6 and D9 agree on what is out of scope", () => {
  // One definition, three consumers. If they drift, a board artifact is exempt from one check and
  // not the others, which is worse than either policy applied consistently.
  const artifact = FRONT + "Run /rooms. See `src/lib/data/nonexistent.ts`.\n";
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/board/metrics.md": artifact,
    ".ai/board/backlog.md": artifact,
    ".ai/board/tickets/ROO-01/04-review.md": artifact,
  }));
  for (const check of ["D5", "D6", "D9"]) {
    assert.deepEqual(
      r.findings(check).filter((l) => l.includes(".ai/board/")),
      [],
      `${check} still reads .ai/board/**`
    );
  }
});

// --- D14: the feature ledger's status and id agree (ADR-008) ------------------------------------
//
// ADR-008 made `features.md` the single register for every feature at every stage of certainty, with
// six statuses and an id column that may be empty. The safety of that rests on one pairing, and it is
// what these tests are about: **TRIAGE and RECOMMEND rows have no id.**
//
// An id is what makes a feature citable — D1 resolves it, Definition of Ready accepts it — and both
// ask only whether a row exists, never whether a human agreed with it. An id on an unverified
// proposal means an agent can specify, build and ship its own idea with every check passing.

const STATUS_SECTION = [
  "## Status",
  "",
  "`TRIAGE` `RECOMMEND` `PLANNED` `IN_PROGRESS` `DONE` `OUTDATED`",
  "",
].join("\n");

/** A minimal but valid features.md: the documented enum, then one ROO table holding `rows`. */
const ledger = (...rows) =>
  FRONT +
  "# Feature registry\n\n" +
  STATUS_SECTION +
  "\n## ROO — Rooms\n\n" +
  "| ID | Status | Title | Description | Group | Invariants touched | Notes |\n" +
  "|----|--------|-------|-------------|-------|--------------------|-------|\n" +
  rows.join("\n") +
  "\n";

test("the ledger fixture itself is clean, so the tests below prove something", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/features.md": ledger(
      "| ROO-01 | DONE | Room CRUD | Rooms. | ROO | [] | — |",
      "| | TRIAGE | An idea | Proposed. | ROO | [] | — |"
    ),
  }));
  assert.deepEqual(r.findings("D14"), [], `fixture must be clean, got:\n${r.stdout}`);
});

test("a TRIAGE row carrying an id is a D14 finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/features.md": ledger("| ROO-02 | TRIAGE | An idea | Proposed. | ROO | [] | — |"),
  }));
  assert.equal(r.findings("D14").length, 1, `expected one finding, got:\n${r.stdout}`);
  assert.match(r.findings("D14")[0], /ROO-02 is TRIAGE and carries an id/);
});

test("a RECOMMEND row carrying an id is a D14 finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/features.md": ledger("| ROO-03 | RECOMMEND | Dropped | Out of scope. | ROO | [] | — |"),
  }));
  assert.match(r.findings("D14")[0] ?? "", /ROO-03 is RECOMMEND and carries an id/);
});

test("a PLANNED row with no id is a D14 finding — nothing could cite it", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/features.md": ledger("| | PLANNED | Wanted | Agreed. | ROO | [] | — |"),
  }));
  assert.match(r.findings("D14")[0] ?? "", /a PLANNED row has no id/);
});

test("an id in the wrong group table is a D14 finding", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/features.md": ledger("| SEA-01 | DONE | Seats | Seats. | SEA | [] | — |"),
  }));
  assert.match(r.findings("D14")[0] ?? "", /SEA-01 sits in the ROO table/);
});

test("a duplicated id is a D14 finding", () => {
  // Model-debt ids collided four times before anyone checked (MD-34). Feature ids get the check.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ".ai/registry/features.md": ledger(
      "| ROO-01 | DONE | Rooms | Rooms. | ROO | [] | — |",
      "| ROO-01 | PLANNED | Rooms again | Rooms. | ROO | [] | — |"
    ),
  }));
  assert.match(r.findings("D14").join("\n"), /ROO-01 appears twice/);
});

// --- D1: an OUTDATED feature stops resolving (ADR-008 clause 5) ---------------------------------

test("citing an OUTDATED feature is a D1 finding, and says so", () => {
  // Retiring a feature has to stop its citations resolving, or Definition of Ready keeps accepting
  // tickets against something the project abandoned. The message distinguishes this from a typo,
  // because the two have different fixes.
  const r = run(project(LEDGER + UNISSUED, "See ROO-01.", {
    ".ai/registry/features.md": ledger("| ROO-01 | OUTDATED | Rooms | Retired. | ROO | [] | — |"),
  }));
  const d1 = r.findings("D1").filter((l) => l.includes("probe.md"));
  assert.equal(d1.length, 1, `expected one D1 finding, got:\n${r.stdout}`);
  assert.match(d1[0], /ROO-01, which is OUTDATED/);
});

test("citing a live feature is not a D1 finding — the OUTDATED rule is not a blanket refusal", () => {
  const r = run(project(LEDGER + UNISSUED, "See ROO-01.", {
    ".ai/registry/features.md": ledger("| ROO-01 | DONE | Rooms | Live. | ROO | [] | — |"),
  }));
  assert.deepEqual(r.findings("D1").filter((l) => l.includes("probe.md")), [], r.stdout);
});

test("a TRIAGE row's title is not citable, because it has no id to cite", () => {
  // The point of clause 3, expressed as the behaviour that matters: an agent writing a story cannot
  // name an unverified proposal, because there is no id in the file for D1 to resolve.
  const r = run(project(LEDGER + UNISSUED, "See ROO-02.", {
    ".ai/registry/features.md": ledger("| | TRIAGE | An idea | Proposed. | ROO | [] | — |"),
  }));
  const d1 = r.findings("D1").filter((l) => l.includes("probe.md"));
  assert.equal(d1.length, 1, `expected the citation to fail, got:\n${r.stdout}`);
  assert.match(d1[0], /ROO-02, absent from features\.md/);
});
