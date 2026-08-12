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
// authorization point, and named a revert signal: `no-restricted-imports` acquiring a Supabase
// entry. This makes that signal fire instead of relying on somebody remembering it.
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
    const header = /^(?:FAIL|WARN)\s+(D\d+)\b/.exec(line);
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

const ESLINT = (patterns, files = '["src/lib/data/prisma/**/*.ts"]') => `
const RESTRICTED = ["error", { patterns: [{ group: ${patterns}, message: "seam" }] }];
export default [
  { rules: { "no-restricted-imports": RESTRICTED } },
  { files: ${files}, rules: { "no-restricted-imports": "off" } },
];
`;

test("a lint config with no Supabase entry passes D12", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": ESLINT('["@prisma/client", "**/lib/data/prisma/**"]'),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("Supabase in the restricted patterns fails D12 with ADR-002's reason", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": ESLINT('["@prisma/client", "@supabase/supabase-js"]'),
  }));
  assert.equal(r.code, 1);
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /the seam has grown a second door/);
  assert.match(r.findings("D12")[0], /ADR-002 requires a new ADR before this/);
});

test("Supabase in the EXCEPTION list also fails D12", () => {
  // Adding it to the allow-list is the louder signal, not the quieter one: it means the SDK is in
  // the tree and has been handed a route through the seam.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": ESLINT('["@prisma/client"]', '["src/lib/data/supabase/**/*.ts"]'),
  }));
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /second door/);
});

test("D12 is case-insensitive", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": ESLINT('["@Supabase/SUPABASE-js"]'),
  }));
  assert.equal(r.findings("D12").length, 1);
});

test("a comment mentioning Supabase does not fail D12", () => {
  // A check that fired on its own rationale would teach people to delete the rationale.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs":
      "// No Supabase SDK exists here; ADR-002 keeps it out.\n/* supabase is out of scope */\n" +
      ESLINT('["@prisma/client"]'),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("D12 reports each distinct Supabase entry once", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": ESLINT('["@supabase/supabase-js", "@supabase/ssr", "@supabase/supabase-js"]'),
  }));
  assert.equal(r.findings("D12").length, 2, r.findings("D12").join(" | "));
});

test("no eslint config at all is not a D12 failure", () => {
  // Before Phase B there is no lint config. Absence is not a second door.
  const r = run(project(LEDGER + UNISSUED, "x", decisions("ADR-002")));
  assert.deepEqual(r.findings("D12"), []);
});

test("D12 survives glob patterns that contain /* and */", () => {
  // The regression that shipped: stripping block comments with a regex made "@prisma/client/*" open
  // a comment which closed inside "**/generated/prisma", deleting every entry between them —
  // including the Supabase one. Fixtures with simple patterns did not reproduce it; the real
  // pattern list did. These are the actual globs from eslint.config.mjs.
  const realistic = `
const RESTRICTED = ["error", { patterns: [{ group: [
  "@prisma/client",
  "@prisma/client/*",
  "**/generated/prisma",
  "**/generated/prisma/**",
  "@supabase/supabase-js",
  "@/lib/data/prisma/**",
  "**/lib/data/prisma/**",
], message: "seam" }] }];
export default [{ rules: { "no-restricted-imports": RESTRICTED } }];
`;
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": realistic,
  }));
  assert.equal(r.findings("D12").length, 1, `D12 must still see the entry: ${r.stdout}`);
  assert.match(r.findings("D12")[0], /@supabase\/supabase-js/);
});

test("a block comment before the pattern list is still ignored", () => {
  const withBlockComment = `
/* ADR-002: no Supabase SDK. supabase stays out of src/. */
const RESTRICTED = ["error", { patterns: [{ group: ["@prisma/client", "@prisma/client/*"], message: "s" }] }];
export default [{ rules: { "no-restricted-imports": RESTRICTED } }];
`;
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "eslint.config.mjs": withBlockComment,
  }));
  assert.deepEqual(r.findings("D12"), []);
});

// --- D12 via package.json: the SDK itself, not the symptom -------------------------------------

const PKG = (deps = {}) => JSON.stringify({ name: "p", version: "1.0.0", ...deps }, null, 2);

test("an @supabase dependency fails D12 even with the lint list untouched", () => {
  // The dangerous ordering ADR-002 names: dependency added, patterns untouched, import unrestricted.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "package.json": PKG({ dependencies: { next: "16.3.0", "@supabase/supabase-js": "2.0.0" } }),
  }));
  assert.equal(r.code, 1);
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /dependencies includes @supabase\/supabase-js/);
  assert.match(r.findings("D12")[0], /second door/);
});

for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
  test(`D12 checks ${field}`, () => {
    const r = run(project(LEDGER + UNISSUED, "x", {
      ...decisions("ADR-002"),
      "package.json": PKG({ [field]: { "@supabase/ssr": "1.0.0" } }),
    }));
    assert.equal(r.findings("D12").length, 1, `${field} was not checked`);
    assert.match(r.findings("D12")[0], new RegExp(`${field} includes @supabase/ssr`));
  });
}

test("a clean package.json passes D12", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "package.json": PKG({ dependencies: { next: "16.3.0", "@prisma/client": "7.9.1" } }),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("the bare `supabase` CLI package is not an SDK and does not fail D12", () => {
  // ADR-002 is about what can talk to the database from application code. The CLI is tooling.
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "package.json": PKG({ devDependencies: { supabase: "1.0.0" } }),
  }));
  assert.deepEqual(r.findings("D12"), []);
});

test("both routes report independently", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "package.json": PKG({ dependencies: { "@supabase/supabase-js": "2.0.0" } }),
    "eslint.config.mjs": ESLINT('["@supabase/supabase-js"]'),
  }));
  assert.equal(r.findings("D12").length, 2);
  assert.ok(r.findings("D12").some((l) => l.includes("package.json")));
  assert.ok(r.findings("D12").some((l) => l.includes("eslint.config.mjs")));
});

test("a package.json that is not valid JSON is reported, not skipped", () => {
  const r = run(project(LEDGER + UNISSUED, "x", {
    ...decisions("ADR-002"),
    "package.json": "{ this is not json",
  }));
  assert.equal(r.findings("D12").length, 1);
  assert.match(r.findings("D12")[0], /not valid JSON/);
});

// --- built from the real files, not from a simplified fixture ----------------------------------
//
// See "Fixtures that share the implementation's assumptions" in .ai/standards/testing-standards.md.
// The two below read this repository's actual package.json and eslint.config.mjs. The D12 glob bug
// survived fourteen fixture tests and was only caught by running against the real file.

test("this repository's real package.json is clean under D12", () => {
  const real = fs.readFileSync(path.join(REPO, "package.json"), "utf8");
  const r = run(project(LEDGER + UNISSUED, "x", { ...decisions("ADR-002"), "package.json": real }));
  assert.deepEqual(r.findings("D12"), [], "no Supabase SDK should be present");
});

test("this repository's real eslint.config.mjs, with one Supabase entry added, fails D12", () => {
  // The positive case has to use the real pattern list. A fixture list of simple names does not
  // contain "@prisma/client/*" or "**/generated/prisma", which is the shape that broke the check.
  const real = fs.readFileSync(path.join(REPO, "eslint.config.mjs"), "utf8");
  const injected = real.replace('"@prisma/client",', '"@prisma/client",\n          "@supabase/supabase-js",');
  assert.notEqual(injected, real, "injection point not found — update this test");

  const clean = run(project(LEDGER + UNISSUED, "x", { ...decisions("ADR-002"), "eslint.config.mjs": real }));
  assert.deepEqual(clean.findings("D12"), [], "the real config must be clean");

  const dirty = run(project(LEDGER + UNISSUED, "x", { ...decisions("ADR-002"), "eslint.config.mjs": injected }));
  assert.equal(dirty.findings("D12").length, 1, `real config must not hide the entry: ${dirty.stdout}`);
  assert.match(dirty.findings("D12")[0], /@supabase\/supabase-js/);
});
