// chat-guard.mjs — PreToolUse guard for RULE-12 and RULE-15.
//
// RULE-12: an agent may not chat with the agent that will judge its work before that judgement
// exists as a file. RULE-15: six messages per pair per ticket, and exhaustion produces a BLOCKED
// artifact rather than a longer conversation.
//
// Identity comes from the documented PreToolUse payload:
//   agent_type present -> the caller is a subagent, and this may be agent-to-agent chat
//   agent_type absent  -> the caller is the main thread, i.e. the orchestrator dispatching a stage
//
// That distinction matters. Orchestrator dispatch uses the same tool as agent chat, and blocking
// dispatch would stop the loop rather than constrain it.
//
// Fails OPEN when there is no active ticket, which is correct: outside a live ticket there is no
// verdict to protect and no budget to spend.
//
// No shebang, no shell. Invoked as: node "$CLAUDE_PROJECT_DIR/.claude/hooks/chat-guard.mjs"

import fs from "node:fs";
import path from "node:path";

const BLOCK = 2;

const AGENTS = new Set([
  "orchestrator",
  "product",
  "ba",
  "tech-lead-design",
  "tech-lead-review",
  "developer",
  "qa",
  "devops",
]);

// Unordered pairs that may not speak before the verdict, and the file whose existence is the
// verdict. RULE-12.
const FORBIDDEN = [
  { pair: ["developer", "tech-lead-review"], verdict: "04-review.md" },
  { pair: ["developer", "qa"], verdict: "06-test-report.md" },
  { pair: ["qa", "tech-lead-review"], verdict: "04-review.md" },
];

function die(reason) {
  process.stderr.write(`chat-guard: BLOCKED — ${reason}\n`);
  process.exit(BLOCK);
}

// stdin is read asynchronously, with a deadline. A synchronous read of fd 0 can block indefinitely
// on some Windows pipe types, and a hook that hangs is worse than a hook that blocks: the tool call
// waits out the hook timeout, which is minutes, and the session stalls with no explanation. An async
// read keeps the event loop free, so the timer can always fire.
function readStdin(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let data = "";
    const timer = setTimeout(() => reject(new Error("timed out reading stdin")), timeoutMs);
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function projectRoot() {
  const fromEnv = process.env.CLAUDE_PROJECT_DIR;
  if (fromEnv && fs.existsSync(fromEnv)) return path.resolve(fromEnv);
  let dir = process.cwd();
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function currentBranch(root) {
  let gitDir = path.join(root, ".git");
  try {
    const st = fs.statSync(gitDir);
    if (st.isFile()) {
      const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(gitDir, "utf8"));
      if (!m) return null;
      gitDir = path.resolve(root, m[1].trim());
    }
    const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8").trim();
    const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
    return ref ? ref[1] : null;
  } catch {
    return null;
  }
}

// The addressee: any string value under a key that names a target, whose value is a known agent.
function recipient(toolInput) {
  const KEY = /^(subagent_?type|agent_?type|agent|agent_?name|to|target|recipient|name)$/i;
  const walk = (node, depth) => {
    if (depth > 3 || node === null || typeof node !== "object") return null;
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && KEY.test(k) && AGENTS.has(v)) return v;
      if (v !== null && typeof v === "object") {
        const found = walk(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(toolInput, 0);
}

let payload;
try {
  payload = JSON.parse(await readStdin());
} catch (err) {
  die(`could not read tool input (${err.message}); failing closed`);
}

const tool = String(payload.tool_name ?? "");
if (!/^(Agent|Task|SendMessage)$/.test(tool)) process.exit(0);

const from = payload.agent_type;
if (!from || !AGENTS.has(from)) process.exit(0); // main thread: orchestrator dispatch, not chat

const to = recipient(payload.tool_input ?? {});
if (!to || to === from) process.exit(0); // not addressed to a pipeline agent

const root = projectRoot();
if (!root) process.exit(0);

const branch = currentBranch(root);
if (!branch || !branch.startsWith("feat/")) process.exit(0); // no active ticket: fail open

const ticketId = branch.slice("feat/".length).split("/")[0];
const ticketDir = path.join(root, ".ai/board/tickets", ticketId);
const ticketFile = path.join(ticketDir, "ticket.yaml");
if (!fs.existsSync(ticketFile)) process.exit(0); // no active ticket: fail open

// RULE-12 — no talking to your judge before the judgement is on disk.
for (const { pair, verdict } of FORBIDDEN) {
  if (pair.includes(from) && pair.includes(to)) {
    if (!fs.existsSync(path.join(ticketDir, verdict))) {
      die(
        `${from} may not message ${to} before ${verdict} exists for ticket ${ticketId} (RULE-12). ` +
          `The verdict is written first; the conversation happens after it, or not at all.`
      );
    }
  }
}

// RULE-15 — six messages per pair per ticket. Pairs absent from chat_budget are governed by the
// topology table alone; this hook enforces only what the ticket declares a budget for.
const key = `${from}->${to}`;
const raw = fs.readFileSync(ticketFile, "utf8");
const lines = raw.split(/\r?\n/);

// Located by string prefix rather than by a built regex: the pair key contains "->" and hyphens,
// and building a pattern from it is a needless way to introduce an escaping bug into a guard.
const idx = lines.findIndex((l) => l.trim().startsWith(`${key}:`));
if (idx === -1) process.exit(0);

const entry = lines[idx];
const used = Number(/used:\s*(\d+)/.exec(entry)?.[1] ?? 0);
const max = Number(/max:\s*(\d+)/.exec(entry)?.[1] ?? 6);

if (used >= max) {
  die(
    `chat budget for ${key} on ${ticketId} is exhausted (${used}/${max}, RULE-15). ` +
      `Emit a BLOCKED artifact with blocking_reason and stop.`
  );
}

lines[idx] = entry.replace(/used:\s*\d+/, `used: ${used + 1}`);
fs.writeFileSync(ticketFile, lines.join("\n"), "utf8");

process.exit(0);
