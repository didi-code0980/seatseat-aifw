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
