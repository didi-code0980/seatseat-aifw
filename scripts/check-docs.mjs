// check-docs.mjs — the documentation audit behind /docs-audit.
//
// Reports. Never fixes. A tool that repairs the thing it measures stops being a measurement, and
// the repair it makes is the one nobody reviewed.
//
// Checks D1-D10 come from the bootstrap specification. D11 and D12 were added afterwards, for gaps
// the original set could not see: an ADR cited by ID rather than by path, and the machine-checkable
// half of ADR-002's revert condition. All of them are restated in .claude/commands/docs-audit.md.
//
// D8 is advisory and never fails the run; everything else is an error.
//
// Run: node scripts/check-docs.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GROUPS = ["AUT", "ROO", "SEA", "DEV", "MEM", "GRP", "LAY", "REG", "DSH", "SYS"];

// Phase awareness. Before Phase B there is no package.json and no src/, so a reference to a path the
// scaffold will create is pending rather than broken. Once package.json exists the check is strict.
const SCAFFOLD_EXISTS = fs.existsSync(path.join(ROOT, "package.json"));
const SCAFFOLD_ROOTS = ["src/", "tests/", "prisma/", "docker/", "node_modules/"];

const errors = [];
const warnings = [];
const pending = [];

const err = (check, file, msg) => errors.push({ check, file, msg });
const warn = (check, file, msg) => warnings.push({ check, file, msg });

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const readIf = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);

const aiFiles = walk(path.join(ROOT, ".ai")).filter((p) => p.endsWith(".md"));
const claudeFiles = walk(path.join(ROOT, ".claude")).filter((p) => p.endsWith(".md"));
const claudeMd = path.join(ROOT, "CLAUDE.md");
const allDocs = [...aiFiles, ...claudeFiles, ...(fs.existsSync(claudeMd) ? [claudeMd] : [])];

const rulesText = readIf(path.join(ROOT, ".ai/registry/rules.md"));
const invText = readIf(path.join(ROOT, ".ai/registry/invariants.md"));
const featText = readIf(path.join(ROOT, ".ai/registry/features.md"));

if (!rulesText) err("D3", ".ai/registry/rules.md", "missing");
if (!invText) err("D2", ".ai/registry/invariants.md", "missing");
if (!featText) err("D1", ".ai/registry/features.md", "missing");

// --- Rule ledger ----------------------------------------------------------------------------

// | RULE-01 | text | 1 | CLAUDE.md |
const rules = new Map();
if (rulesText) {
  for (const line of rulesText.split(/\r?\n/)) {
    const m = /^\|\s*(RULE-\d{2})\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (m) rules.set(m[1], { text: m[2], version: Number(m[3]), verbatimIn: m[4] });
  }
}

// --- Invariant ledger, and the IDs that were deliberately never issued -----------------------

/** A registry file split into its `## ` sections, keyed by heading text. */
function sections(text) {
  const out = new Map();
  let key = "";
  let buf = [];
  for (const line of (text ?? "").split(/\r?\n/)) {
    const m = /^##\s+(.*?)\s*$/.exec(line);
    if (m) {
      out.set(key, buf.join("\n"));
      key = m[1];
      buf = [];
    } else {
      buf.push(line);
    }
  }
  out.set(key, buf.join("\n"));
  return out;
}

/** IDs in the leading cell of a table row: `| INV-04 | ... |`. Prose mentions are not rows. */
const tableIds = (text) =>
  (text ?? "")
    .split(/\r?\n/)
    .map((l) => /^\|\s*(INV-\d{2})\s*\|/.exec(l)?.[1])
    .filter(Boolean);

const invSections = sections(invText);

// An ID listed under `## Unissued IDs` was considered and deliberately never issued. It is valid to
// CITE — a document explaining why a number is missing has to be able to name it, and forcing the
// author to write it in pieces to dodge this check makes the check the author of the prose.
//
// It is not valid to USE. An unissued ID must never appear in a ledger row, a design, or
// `invariants_touched`; it names an absence, and there is nothing behind it to hold.
const unissued = new Set(tableIds(invSections.get("Unissued IDs")));

// Issued invariants are every table ID in the file except those. Scoping by subtraction rather than
// by reading the Ledger section alone keeps this working on a file with no `## Ledger` heading,
// which is how it behaved before unissued IDs existed.
const invariants = new Set(tableIds(invText).filter((id) => !unissued.has(id)));

// Both at once is a contradiction, and a silent one: subtraction above would quietly drop the ID
// from the issued set, so an invariant that genuinely exists would stop being citable anywhere.
for (const id of tableIds(invSections.get("Ledger"))) {
  if (unissued.has(id)) {
    err("D2", ".ai/registry/invariants.md", `${id} is in both the ledger and the Unissued IDs table`);
  }
}

const features = new Set(
  (featText ?? "")
    .split(/\r?\n/)
    .map((l) => /^\|\s*([A-Z]{3}-\d{2})\s*\|/.exec(l)?.[1])
    .filter(Boolean)
);

// --- D1 / D2 / D3 ---------------------------------------------------------------------------

const FEATURE_RE = new RegExp(`\\b(?:${GROUPS.join("|")})-\\d{2}\\b`, "g");

for (const file of allDocs) {
  const r = rel(file);
  const text = fs.readFileSync(file, "utf8");

  // Templates carry example IDs by definition; the registry file lists them by definition.
  const skipD1 = r.startsWith(".ai/templates/") || r === ".ai/registry/features.md";

  if (!skipD1) {
    for (const id of new Set(text.match(FEATURE_RE) ?? [])) {
      if (!features.has(id)) err("D1", r, `references feature ${id}, absent from features.md`);
    }
  }
  for (const id of new Set(text.match(/\bINV-\d{2}\b/g) ?? [])) {
    if (invariants.has(id) || unissued.has(id)) continue;
    if (r === ".ai/registry/invariants.md") continue;
    err("D2", r, `references ${id}, absent from invariants.md`);
  }
  for (const id of new Set(text.match(/\bRULE-\d{2}\b/g) ?? [])) {
    if (!rules.has(id) && r !== ".ai/registry/rules.md") {
      err("D3", r, `references ${id}, absent from rules.md`);
    }
  }
}

// --- D4: agents named in prose have a definition ---------------------------------------------

const agentDir = path.join(ROOT, ".claude/agents");
const agentFiles = new Set(
  fs.existsSync(agentDir)
    ? fs.readdirSync(agentDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
    : []
);
const ROLE_SHAPE = /^(orchestrator|product|ba|tech-lead-[a-z]+|developer|qa|devops|architect|designer|reviewer|tester)$/;

for (const file of allDocs) {
  const r = rel(file);
  if (r.startsWith(".claude/agents/")) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const m of new Set(text.match(/`([a-z][a-z-]*)`/g) ?? [])) {
    const name = m.slice(1, -1);
    if (ROLE_SHAPE.test(name) && !agentFiles.has(name)) {
      err("D4", r, `names agent \`${name}\`, which has no file in .claude/agents/`);
    }
  }
}

// --- Scope: which documents a check may read --------------------------------------------------
//
// **A check whose scope includes agent-produced artifacts gets worked around, not reported.** The
// reasoning is in "What a check may be scoped to" in `.ai/standards/testing-standards.md`; the short
// version is that a finding aimed at a human buys a decision, and the same finding aimed at an agent
// mid-stage is an obstacle between it and its gate, so the cheapest way through is to make it stop
// appearing. Both roads end at a green audit and only one of them means anything.
//
// `.ai/board/**` is agent output — tickets, stage artifacts, `backlog.md` and `metrics.md` alike.
// `.claude/**` is not: agents and commands are human-authored configuration, and no stage writes
// there.
//
// D5, D6 and D9 are all scoped by this. Each was narrowed after a real false positive:
//   D9  the first story written hit the front-matter requirement and had `doc_version` pasted into
//       it, which is the failure mode exactly — satisfied rather than reported
//   D5  `tech-lead-design` wrote `/rooms` in `02-design.md`, a Next.js route, and D5 read it as a
//       slash command with no definition. The agent reported it instead of deleting the route name,
//       which is the right behaviour and not the one to design around
//   D6  same corpus, same exposure: a design enumerating `allowed_paths` names files that do not
//       exist yet, because creating them is the next stage's job
const GOVERNED_ROOTS = [".ai/registry/", ".ai/standards/", ".ai/templates/"];
const GOVERNED_FILES = [".ai/00-charter.md", ".ai/01-operating-model.md"];

/** A human-owned `.ai/` document: permanent, versioned, and not written by any stage. */
const isGovernedDoc = (r) =>
  GOVERNED_ROOTS.some((root) => r.startsWith(root)) || GOVERNED_FILES.includes(r);

/** Anything a check may read: human-owned `.ai/`, all of `.claude/`, and CLAUDE.md. */
const isHumanOwned = (r) =>
  isGovernedDoc(r) || r.startsWith(".claude/") || r === "CLAUDE.md";

// --- D5: commands referenced have a definition -----------------------------------------------

const cmdDir = path.join(ROOT, ".claude/commands");
const commands = new Set(
  fs.existsSync(cmdDir)
    ? fs.readdirSync(cmdDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
    : []
);

for (const file of allDocs) {
  const r = rel(file);
  if (r.startsWith(".claude/commands/")) continue;
  // Board artifacts are out of scope. `/rooms` in a design is a route, not a command, and a check
  // that cannot tell them apart is a check an agent has to argue with to finish its stage.
  if (!isHumanOwned(r)) continue;
  const text = fs.readFileSync(file, "utf8");
  // A slash-command token: preceded by a non-word character, then /name, ending cleanly.
  for (const m of new Set(text.match(/(?<![\w./-])\/([a-z][a-z0-9-]*)(?![\w./-])/g) ?? [])) {
    const name = m.slice(1);
    if (!commands.has(name)) err("D5", r, `references /${name}, which has no file in .claude/commands/`);
  }
}

// --- D6: relative paths mentioned under .ai/ exist --------------------------------------------

const PATH_ROOTS = [".ai/", ".claude/", ".github/", "src/", "tests/", "prisma/", "docker/", "scripts/", "node_modules/"];

function pathCandidates(text) {
  const out = new Set();
  for (const m of text.match(/`([^`\n]+)`/g) ?? []) out.add(m.slice(1, -1));
  for (const m of text.match(/\]\(([^)\s]+)\)/g) ?? []) out.add(m.slice(2, -1));
  return [...out]
    // `:123` is a line citation, not part of the filename. The model asks for `file:line` in every
    // review item and design, so a path carrying one has to resolve to the path. Trailing
    // punctuation is stripped after it, because a citation can end a sentence.
    .map((s) => s.trim().replace(/:\d+(?::\d+)?$/, "").replace(/[.,;:]+$/, ""))
    .filter(
      (s) =>
        s.includes("/") &&
        !/\s/.test(s) &&
        !/^https?:/.test(s) &&
        !/[<>|]/.test(s) &&
        PATH_ROOTS.some((r) => s.startsWith(r))
    );
}

for (const file of aiFiles) {
  const r = rel(file);
  // Human-owned `.ai/` documents only. A design's section 5 enumerates `allowed_paths` for files the
  // NEXT stage creates, so "does not exist on disk" is the expected state at the moment it is
  // written — the finding would be raised against an agent for correctly describing future work.
  if (!isGovernedDoc(r)) continue;

  // ADRs are exempt. MD-38, decided 2026-08-25.
  //
  // A decision record is a historical claim about what was true when the decision was taken, and a
  // large share of decisions authorise a deletion. ADR-006 removed `src/lib/auth/auth.ts`,
  // `src/lib/auth/client.ts` and `src/app/api/auth/[...all]/route.ts`; SYS-01 carried it out; and
  // from that merge onward D6 failed on ADR-002 and ADR-006 forever, for correctly describing files
  // the repository had agreed to delete. **The false-positive rate here is structurally 100% for any
  // ADR that authorises a deletion**, and the pressure it creates is to edit an accepted decision so
  // a checker passes, which is forging the record rather than repairing it.
  //
  // The narrower alternative was a `removed_paths:` list in an ADR's front matter, skipped by name.
  // Rejected: it keeps D6's coverage against a typo, but it costs every future ADR author a field
  // they must remember, and forgetting it reproduces exactly this failure — a guard whose correct
  // operation depends on being told about each exception is a guard that goes red and stays red.
  //
  // What is given up, stated rather than glossed: a mistyped path inside an ADR is no longer caught
  // by anything. D11 still resolves every `ADR-nnn` reference to a file, so the citation graph
  // between decisions is still checked; it is only paths into `src/` that lose coverage, in the one
  // document class where a missing file is expected rather than suspicious.
  if (r.startsWith(".ai/registry/decisions/")) continue;
  for (const cand of pathCandidates(fs.readFileSync(file, "utf8"))) {
    // A glob is a statement about a set, not a claim that one file exists.
    const concrete = cand.replace(/\/?\*\*.*$/, "").replace(/\*.*$/, "");
    if (!concrete || concrete.endsWith("/") === false && concrete !== cand && concrete.includes("*")) continue;
    const target = concrete.replace(/\/$/, "");
    if (!target) continue;
    if (fs.existsSync(path.join(ROOT, target))) continue;
    if (!SCAFFOLD_EXISTS && SCAFFOLD_ROOTS.some((sr) => `${target}/`.startsWith(sr))) {
      pending.push({ check: "D6", file: r, msg: `${cand} — Phase B path, does not exist yet` });
      continue;
    }
    err("D6", r, `mentions ${cand}, which does not exist on disk`);
  }
}

// --- D7: verbatim copies match character-for-character -----------------------------------------

for (const [id, rule] of rules) {
  if (!rule.verbatimIn || rule.verbatimIn === "—" || rule.verbatimIn === "-") continue;
  const target = path.join(ROOT, rule.verbatimIn);
  const text = readIf(target);
  if (text === null) {
    err("D7", rule.verbatimIn, `is named as verbatim_in for ${id} but does not exist`);
    continue;
  }
  const line = text.split(/\r?\n/).find((l) => l.includes(`**${id}**`));
  if (!line) {
    err("D7", rule.verbatimIn, `does not contain a verbatim copy of ${id}`);
    continue;
  }
  const copy = line.slice(line.indexOf("—") + 1).trim();
  if (copy !== rule.text) {
    err("D7", rule.verbatimIn, `${id} copy has drifted from rules.md\n      ledger: ${rule.text}\n      copy:   ${copy}`);
  }
}

// --- D8: near-verbatim rule text elsewhere (advisory) ------------------------------------------

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const shingles = (s, n = 5) => {
  const w = normalise(s).split(" ");
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
};

for (const [id, rule] of rules) {
  const ruleShingles = shingles(rule.text);
  if (ruleShingles.size === 0) continue;
  for (const file of allDocs) {
    const r = rel(file);
    if (r === ".ai/registry/rules.md") continue;
    if (rule.verbatimIn && r === rule.verbatimIn) continue;
    const text = fs.readFileSync(file, "utf8");
    const hits = [...ruleShingles].filter((sh) => normalise(text).includes(sh)).length;
    const ratio = hits / ruleShingles.size;
    if (ratio >= 0.6) {
      warn("D8", r, `restates ${id} at ${Math.round(ratio * 100)}% overlap without verbatim_in — human judgement`);
    }
  }
}

// --- D9: governed_by versions, and front-matter presence ---------------------------------------
//
// Scoped to documents a human owns and versions. Not every markdown file under `.ai/`.
//
// Document front-matter — `doc_version`, `last_updated`, `governed_by` — describes a governance
// document: something permanent, versioned, and bumped by a human when a rule it cites changes. A
// board artifact is none of those. `01-story.md` carries artifact front-matter (`ticket`, `stage`,
// `agent`, `gate`, `chat_before_verdict`), is produced by one agent at one stage, and is deleted
// with the ticket. It has no version to bump and no rule set to track, so requiring the three fields
// asked it to be a kind of document it is not.
//
// The first version of D9 read every `.md` under `.ai/`, board included. The result was predictable
// in hindsight: the first agent to produce a story hit the failure and pasted the three fields into
// its artifact to clear it. That is the failure mode a check on agent output always has — it is
// satisfied, not reported, and the satisfying is cheaper than the reporting. See "What a check may
// be scoped to" in `.ai/standards/testing-standards.md`.
//
// `.ai/board/**` is therefore out of scope entirely, and that includes `backlog.md` and `metrics.md`:
// both are agent-written, and a check an agent can silence by editing its own output measures the
// agent's compliance rather than the documents.
//
// `isGovernedDoc` is defined once, above D5, and shared by D5, D6 and D9.

for (const file of aiFiles) {
  const r = rel(file);
  if (!isGovernedDoc(r)) continue;
  const text = fs.readFileSync(file, "utf8");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) {
    err("D9", r, "has no front-matter (doc_version, last_updated, governed_by are required)");
    continue;
  }
  const block = fm[1];
  const docVersion = Number(/^doc_version:\s*(\d+)/m.exec(block)?.[1] ?? NaN);
  if (Number.isNaN(docVersion)) err("D9", r, "front-matter has no doc_version");
  if (!/^last_updated:\s*\S/m.test(block)) err("D9", r, "front-matter has no last_updated");
  const governed = /^governed_by:\s*\[(.*)\]/m.exec(block);
  if (!governed) {
    err("D9", r, "front-matter has no governed_by list");
    continue;
  }
  for (const id of governed[1].split(",").map((s) => s.trim()).filter(Boolean)) {
    const rule = rules.get(id);
    if (!rule) {
      err("D9", r, `governed_by cites ${id}, which is not in rules.md`);
    } else if (rule.version > docVersion) {
      err("D9", r, `governed_by cites ${id} at v${rule.version} but doc_version is ${docVersion}`);
    }
  }
}

// --- D10: state enum agrees with the gate table ------------------------------------------------

const ticketTpl = readIf(path.join(ROOT, ".ai/templates/ticket.yaml"));
const opModel = readIf(path.join(ROOT, ".ai/01-operating-model.md"));

if (!ticketTpl) err("D10", ".ai/templates/ticket.yaml", "missing");
if (!opModel) err("D10", ".ai/01-operating-model.md", "missing");

if (ticketTpl && opModel) {
  const enumLine = /^#\s*state enum:\s*(.+)$/m.exec(ticketTpl);
  if (!enumLine) {
    err("D10", ".ai/templates/ticket.yaml", "has no `# state enum:` line to check against");
  } else {
    const declared = new Set(enumLine[1].trim().split(/\s+/));
    const section = /## Stage ownership\r?\n([\s\S]*?)\r?\n## /.exec(opModel);
    const inTable = new Set(
      (section?.[1] ?? "")
        .split(/\r?\n/)
        .map((l) => /^\|\s*([A-Z_]+)\s*\|/.exec(l)?.[1])
        .filter(Boolean)
    );
    for (const s of declared) {
      if (!inTable.has(s)) err("D10", ".ai/01-operating-model.md", `state ${s} is in the enum but has no row in the stage ownership table`);
    }
    for (const s of inTable) {
      if (!declared.has(s)) err("D10", ".ai/templates/ticket.yaml", `stage ownership table has ${s}, which is not in the state enum`);
    }
  }
}

// --- D11: every ADR referenced by ID resolves to a file ----------------------------------------
//
// D6 checks relative paths that are written as paths. An ADR is almost always cited by ID —
// "see ADR-002" — which D6 cannot see, so a decision could be cited by three documents while the
// file recording it did not exist. That is worse than an ordinary dangling link: the citation reads
// as evidence that somebody decided, and RULE-09 makes the ADR the only thing that carries that.
//
// Agents cannot write ADRs (RULE-01, RULE-09), so the failure mode is real and specific: an agent
// stops with BLOCKED and names the decision it needs, a human is meant to write the ADR, and the
// prose citing it lands first.

const adrDir = path.join(ROOT, ".ai/registry/decisions");
const adrFiles = fs.existsSync(adrDir) ? fs.readdirSync(adrDir) : [];
const adrs = new Set(
  adrFiles.map((f) => /^(ADR-\d{3})/.exec(f)?.[1]).filter(Boolean)
);

// `.yaml` under `.ai/` is included because a ticket links an approved ADR when `schema_delta` is not
// `none` — a dangling ADR link there is exactly as misleading as one in prose, and it sits on the
// Definition of Ready.
const adrScanned = [
  ...allDocs,
  ...walk(path.join(ROOT, ".ai")).filter((p) => p.endsWith(".yaml")),
];

for (const file of adrScanned) {
  const r = rel(file);
  // Templates carry example IDs by definition — `ADR-nnn` is the placeholder, but a template that
  // shows a filled-in example would otherwise fail on it.
  if (r.startsWith(".ai/templates/")) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const id of new Set(text.match(/\bADR-\d{3}\b/g) ?? [])) {
    if (!adrs.has(id)) {
      err("D11", r, `references ${id}, which has no file in .ai/registry/decisions/`);
    }
  }
}

// --- D12: the seam has not grown a second door -------------------------------------------------
//
// ADR-002 chose Supabase as hosted Postgres only, with Row Level Security deliberately off, on the
// grounds that `src/lib/data/` is the single authorization point. Its revert condition names an
// observable signal: **the SDK entering the dependency tree by any route.**
//
// REWRITTEN 2026-08-24 for ADR-006. Until then this check failed on ANY `@supabase/*` dependency and
// on any Supabase string in the lint config, which was exactly right under ADR-002 — and which would
// have made ADR-006 unimplementable rather than merely reviewable.
//
// **What changed is the shape, not the strictness.** ADR-002's premise is untouched: `src/lib/data/`
// is still the only path to data, RLS is still off, and that is still only true while no Supabase
// client is constructed in the browser. ADR-006 adopted Supabase Auth *server-side only*, so the
// check now enforces the narrow shape that decision authorises instead of forbidding the package
// outright. Every way of widening it back out is still an error.
//
// Three places to look:
//
//   package.json      `@supabase/ssr` is permitted — ADR-006 names it and only it. Any other
//                     `@supabase/*` entry is a second door. `@supabase/supabase-js` is the one to
//                     watch: it is the browser client, and it is what ADR-002's revert condition
//                     was written about.
//   eslint.config.mjs the restriction must be PRESENT, not absent. This is the inversion — under
//                     ADR-002 a Supabase string here was the finding; under ADR-006 the absence of
//                     one is, because the package is in the tree and something has to restrict it.
//                     `src/lib/data/**` appearing as a Supabase exemption is always an error: the
//                     data seam holding an auth client is the drift ADR-006 exists to prevent.
//   src/**            no `@supabase/*` import outside `src/lib/auth/`. This is ADR-006's second
//                     revert condition made machine-checkable. ESLint enforces it at build time;
//                     this repeats it in the audit, because the two run at different moments and a
//                     control nobody runs is not a control.
//
// The lint list is a symptom; the dependency is the fact; an import in a component is the breach.
//
// **The eslint branch is quieter than it looks, and this is deliberate rather than unnoticed.** It
// catches a Supabase exemption written with a Supabase-flavoured path, because that literal contains
// both halves it matches on. It does NOT catch `"src/lib/data/**"` being added to the auth exemption
// block: that string names no vendor, and telling it apart from the legitimate Prisma exemption
// beside it would mean parsing the config's structure rather than scanning its strings. Importing
// `eslint.config.mjs` would give that structure exactly — and would couple this audit to a working
// `node_modules`, which it does not otherwise need and cannot assume in early phases.
//
// The gap is covered by the third branch rather than left open. A widened lint exemption is only
// dangerous once something uses it, and the `src/**` scan fails on the import itself no matter what
// the lint config permits. The guard can be loosened silently; the door cannot be opened silently.
//
// Only string literals count. A comment explaining why Supabase is absent is not a second door, and
// a check that fired on its own rationale would teach people to delete the rationale.
//
// This is a scanner rather than a regex, and it has to be. Stripping comments with
// `/\/\*[\s\S]*?\*\//` is wrong on this specific file: the pattern list contains "@prisma/client/*",
// whose `/*` opens a comment that then runs to the `*/` inside "**/generated/prisma" — silently
// deleting every entry between them, which is exactly where a Supabase entry would sit. Glob
// patterns and block comments share punctuation, so the two have to be told apart properly.

/** Every string literal in a JS source, with comments skipped. */
function stringLiterals(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let buf = "";
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") {
          buf += src[i + 1] ?? "";
          i += 2;
          continue;
        }
        buf += src[i];
        i++;
      }
      i++;
      out.push(buf);
      continue;
    }
    i++;
  }
  return out;
}

const SECOND_DOOR =
  "the seam has grown a second door. ADR-002's revert condition is that direct " +
  "client-to-database access invalidates the decision to leave RLS off, and ADR-006 adopted " +
  "Supabase Auth only on the condition that its client is constructed server-side.";

// The single package ADR-006 authorises. Anything else under the scope is a second door.
const ALLOWED_SUPABASE_PKG = "@supabase/ssr";

// The one path permitted to name it. ADR-006 OQ-4.
const SUPABASE_EXEMPT_DIR = "src/lib/auth/";

// package.json — the SDK itself.
let supabaseInTree = false;
const pkgText = readIf(path.join(ROOT, "package.json"));
if (pkgText) {
  let pkg = null;
  try {
    pkg = JSON.parse(pkgText);
  } catch {
    err("D12", "package.json", "is not valid JSON, so its dependencies could not be checked");
  }
  if (pkg) {
    // `@supabase/*` only. The bare `supabase` package is the CLI, not a client library, and this
    // check is about what can talk to the database from application code.
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      for (const name of Object.keys(pkg[field] ?? {})) {
        if (!/^@supabase\//.test(name)) continue;
        if (name === ALLOWED_SUPABASE_PKG) {
          supabaseInTree = true;
          continue;
        }
        err("D12", "package.json", `${field} includes ${name} — ${SECOND_DOOR}`);
      }
    }
  }
}

// eslint.config.mjs — the restriction must exist, and must not exempt the data seam.
//
// Note the inversion against every other branch of this check: here the finding is an ABSENCE. The
// package being in the tree with nothing restricting it is the dangerous ordering ADR-002 named,
// and it is invisible to a scan that only looks for what is present.
const eslintPath = path.join(ROOT, "eslint.config.mjs");
const eslintText = readIf(eslintPath);

if (eslintText) {
  const literals = stringLiterals(eslintText);
  const supabaseLiterals = literals.filter((v) => /supabase/i.test(v));
  const restricts = supabaseLiterals.some((v) => v.startsWith("@supabase/"));

  if (supabaseInTree && !restricts) {
    err(
      "D12",
      "eslint.config.mjs",
      `${ALLOWED_SUPABASE_PKG} is a dependency but no-restricted-imports does not name ` +
        `\`@supabase/*\` — the import is unrestricted, which is ${SECOND_DOOR}`
    );
  }

  // An exemption naming the data seam is always wrong, whichever ADR is cited for it.
  const exemptsSeam = literals.some((v) => /lib\/data/.test(v) && /supabase/i.test(v));
  if (exemptsSeam) {
    err(
      "D12",
      "eslint.config.mjs",
      "exempts a `lib/data` path for Supabase — ADR-006 exempts only `src/lib/auth/**`, and the " +
        "data seam holding an auth client is the drift that decision exists to prevent"
    );
  }
}

// src/** — the breach itself. ADR-006's second revert condition, made machine-checkable.
for (const file of walk(path.join(ROOT, "src"))) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
  const r = rel(file);
  if (r.startsWith(SUPABASE_EXEMPT_DIR)) continue;
  const imported = stringLiterals(fs.readFileSync(file, "utf8")).filter((v) =>
    /^@supabase\//.test(v)
  );
  for (const name of new Set(imported)) {
    err("D12", r, `names ${name} outside \`${SUPABASE_EXEMPT_DIR}**\` — ${SECOND_DOOR}`);
  }
}

// --- D13: every Definition of Ready item is satisfiable ----------------------------------------
//
// A gate that requires a field no reachable stage produces is unsatisfiable, and nothing else here
// detects that. It is a structural defect, not a typo: the document reads correctly, every sentence
// is true, and the loop deadlocks the first time a ticket tries to pass the gate.
//
// It took three attempts to place this gate, which is the reason the check exists rather than a
// footnote to it. First `size` was produced at DESIGN and required at READY. Then the field was split
// and the estimate moved to SPEC — still after the gate. D13 caught that one on its first run. The
// third attempt moved the gate instead of the field, to the SPEC -> READY transition, so that the
// two items the BA produces are read after the BA has produced them.
//
// The rule: each DoR item names the stage that produces it, and that stage sits at or before READY.
// Attribution is what makes the check possible at all — an item that attributes nothing cannot be
// shown to be satisfiable, and the attribution is what a reader needs anyway to know whose job it is.
//
// **Position comes from the state enum in `.ai/templates/ticket.yaml`, which must be in lifecycle
// order.** That coupling is deliberate but sharp-edged: reordering the lifecycle without reordering
// the enum leaves this check measuring against the old order and silently agreeing with a document
// that has changed underneath it. D10 holds the enum and the stage table to the same membership; it
// does not check order, because order is only meaningful here.
//
// Two accepted forms, because the document has used both:
//   - a table with `Produced at` and `By` columns, which is preferred: the attribution is a field
//     rather than a sentence, so it cannot be written ambiguously
//   - `- ` bullets carrying an inline attribution such as "set by the BA at SPEC"
//
// `human` counts as a producer and is treated as BACKLOG: the human step between TRIAGE and BACKLOG
// is where registry rows and approved ADRs come from, and those are legitimately not agent output.

const dorSection = sections(opModel ?? "").get("Definition of Ready");

if (opModel && dorSection === undefined) {
  err("D13", ".ai/01-operating-model.md", "has no `## Definition of Ready` section");
} else if (dorSection !== undefined) {
  // Lifecycle order comes from the state enum, which D10 already holds to the stage ownership table.
  const enumLine = /^#\s*state enum:\s*(.+)$/m.exec(ticketTpl ?? "")?.[1] ?? "";
  const lifecycle = enumLine.trim().split(/\s+/).filter(Boolean);
  const readyAt = lifecycle.indexOf("READY");

  if (readyAt === -1) {
    err("D13", ".ai/templates/ticket.yaml", "state enum has no READY, so DoR cannot be positioned");
  } else {
    // Table form first. A row is `| n | item | Produced at | By |`; only the `Produced at` cell is
    // read for position, so a stage named in the item text cannot be mistaken for its producer.
    const items = [];
    for (const line of dorSection.split(/\r?\n/)) {
      const cells = /^\s*\|(.+)\|\s*$/.exec(line);
      if (cells) {
        const parts = cells[1].split("|").map((c) => c.trim());
        if (parts.length < 4) continue;
        if (/^-+$/.test(parts[0])) continue; // separator
        if (/^#$/.test(parts[0]) || /^item$/i.test(parts[1])) continue; // header
        items.push({ label: parts[1], attribution: `${parts[2]} ${parts[3]}`, form: "table" });
        continue;
      }
      if (/^-\s+/.test(line)) items.push({ label: line, attribution: line, form: "bullet" });
      else if (items.length && /^\s+\S/.test(line) && items[items.length - 1].form === "bullet") {
        items[items.length - 1].label += " " + line.trim();
        items[items.length - 1].attribution += " " + line.trim();
      }
    }

    if (items.length === 0) {
      err("D13", ".ai/01-operating-model.md", "Definition of Ready lists no items");
    }

    for (const item of items) {
      const label = item.label.replace(/\s+/g, " ").slice(0, 60);
      const source = item.attribution;

      // In a table the `Produced at` cell IS the attribution, so a bare stage name is enough. In a
      // bullet it is prose, and only `at SPEC` / `by DESIGN` count — "dependencies `DONE`" is a
      // condition on OTHER tickets, and reading its `DONE` as this item's producer would report a
      // defect that is not there.
      const named = lifecycle.filter((s) =>
        item.form === "table"
          ? new RegExp(`\\b${s}\\b`).test(source)
          : new RegExp(`\\b(?:at|by|during|from)\\s+\`?${s}\`?\\b`).test(source)
      );
      const byHuman =
        item.form === "table"
          ? /\bhumans?\b/i.test(source)
          : /\b(?:by|at)\s+(?:a\s+)?humans?\b/i.test(source);

      if (named.length === 0 && !byHuman) {
        err(
          "D13",
          ".ai/01-operating-model.md",
          `DoR item "${label}…" names no producing stage, so it cannot be shown to be satisfiable`
        );
        continue;
      }

      // `human` sits at the BACKLOG step, which is before READY, so it can never be the late one.
      const positions = named.map((s) => ({ stage: s, at: lifecycle.indexOf(s) }));
      const late = positions.filter((p) => p.at > readyAt);

      if (late.length > 0 && late.length === positions.length && !byHuman) {
        err(
          "D13",
          ".ai/01-operating-model.md",
          `DoR item "${label}…" is produced at ${late.map((p) => p.stage).join(", ")}, which is ` +
            `after READY in the lifecycle. DoR gates READY, so this item can never be satisfied — ` +
            `the ticket cannot reach the stage that would set it.`
        );
      }
    }
  }
}

// --- Report ------------------------------------------------------------------------------------

const byCheck = (list) => {
  const m = new Map();
  for (const e of list) {
    if (!m.has(e.check)) m.set(e.check, []);
    m.get(e.check).push(e);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
};

console.log("docs-audit");
console.log(SCAFFOLD_EXISTS ? "mode: strict (package.json present)" : "mode: pre-scaffold (D6 defers Phase B paths)");
console.log("");

for (const [check, list] of byCheck(errors)) {
  console.log(`FAIL ${check} (${list.length})`);
  for (const e of list) console.log(`  - ${e.file}: ${e.msg}`);
}
for (const [check, list] of byCheck(warnings)) {
  console.log(`WARN ${check} (${list.length}) — advisory, does not fail the run`);
  for (const e of list) console.log(`  - ${e.file}: ${e.msg}`);
}
if (pending.length) {
  console.log(`PENDING D6 (${pending.length}) — resolves when Phase B lands`);
  for (const e of pending) console.log(`  - ${e.file}: ${e.msg}`);
}

console.log("");
console.log(`errors: ${errors.length}  warnings: ${warnings.length}  pending: ${pending.length}`);
process.exit(errors.length > 0 ? 1 : 0);
