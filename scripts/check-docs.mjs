// check-docs.mjs — the documentation audit behind /docs-audit.
//
// Reports. Never fixes. A tool that repairs the thing it measures stops being a measurement, and
// the repair it makes is the one nobody reviewed.
//
// Checks D1-D10 are defined in the bootstrap specification and restated in
// .claude/commands/docs-audit.md. D8 is advisory and never fails the run; everything else is an
// error.
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

const invariants = new Set(
  (invText ?? "").match(/^\|\s*(INV-\d{2})\s*\|/gm)?.map((s) => /INV-\d{2}/.exec(s)[0]) ?? []
);

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
    if (!invariants.has(id) && r !== ".ai/registry/invariants.md") {
      err("D2", r, `references ${id}, absent from invariants.md`);
    }
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
    .map((s) => s.trim().replace(/[.,;:]+$/, ""))
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

for (const file of aiFiles) {
  const r = rel(file);
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
