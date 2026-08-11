// Settings integrity — the second clobber detector.
//
// This environment has been observed appending session permission grants to `.claude/settings.json`
// rather than to `.claude/settings.local.json`, silently overwriting the governance config. When that
// happens the deny list and all five hooks vanish, and nothing about the session looks different: the
// guards simply stop guarding, which is the exact failure mode the whole Phase A layer exists to
// prevent.
//
// Two detectors now. The first is `git diff .claude/settings.json`, available because Phase A is
// committed. It is only useful if a human looks. This is the second, and it runs in CI on every push
// and pull request via `node --test .claude/hooks/tests/`, where nobody has to remember to look.
//
// Every assertion below names the exact missing key, because "settings.json changed" is not
// actionable and "the deny rule mcp__clickup__clickup_search is missing" is.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SETTINGS = path.join(ROOT, ".claude", "settings.json");

// The expected shape, stated once. Update this list only alongside a deliberate change to
// settings.json — never to make a failing test pass.

const REQUIRED_ALLOW = [
  "Bash(git status)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Bash(git switch:*)",
  "Bash(git checkout -b feat/*)",
  "Bash(gh pr create:*)",
  "Bash(gh pr view:*)",
  "mcp__clickup__clickup_get_task",
  "mcp__clickup__clickup_update_task",
  "mcp__clickup__clickup_get_custom_fields",
  "mcp__clickup__clickup_create_comment",
  "mcp__clickup__clickup_filter_tasks",
];

const REQUIRED_DENY = [
  "Bash(git push --force:*)",
  "Bash(git push origin main:*)",
  "Bash(git reset --hard:*)",
  "Bash(gh pr merge:*)",
  "mcp__clickup__clickup_delete_task",
  "mcp__clickup__clickup_merge_tasks",
  "mcp__clickup__clickup_move_task",
  "mcp__clickup__clickup_send_chat_message",
  "mcp__clickup__clickup_search",
  "mcp__clickup__clickup_get_workspace_hierarchy",
];

// matcher -> the hook scripts that must be wired to it, in order.
const REQUIRED_HOOKS = {
  "Edit|Write": ["guard-project-root.mjs", "guard-registry.mjs", "guard-allowed-paths.mjs"],
  "mcp__clickup__.*": ["guard-tracker-scope.mjs"],
  "Agent|Task|SendMessage": ["chat-guard.mjs"],
  "Read|Grep|Glob|NotebookEdit": ["guard-read-scope.mjs"],
};

const ALL_HOOK_SCRIPTS = Object.values(REQUIRED_HOOKS).flat();

function loadSettings() {
  const raw = fs.readFileSync(SETTINGS, "utf8");
  return { raw, json: JSON.parse(raw) };
}

test("settings.json exists and is strict-valid JSON with no comments", () => {
  assert.ok(fs.existsSync(SETTINGS), `${SETTINGS} is missing`);
  const raw = fs.readFileSync(SETTINGS, "utf8");
  assert.doesNotThrow(
    () => JSON.parse(raw),
    "settings.json does not parse. A single // comment makes the file unparseable, and an " +
      "unparseable settings file drops the entire deny list and every hook."
  );
});

test("disableClaudeAiConnectors is still true", () => {
  const { json } = loadSettings();
  assert.equal(
    json.disableClaudeAiConnectors,
    true,
    "disableClaudeAiConnectors is not true. It is load-bearing, not cosmetic: without it a coding " +
      "agent inherits mail, calendar, drive, and design connectors from the claude.ai account."
  );
});

test("bypassPermissions appears nowhere", () => {
  const { raw } = loadSettings();
  assert.ok(
    !/bypassPermissions/.test(raw),
    "bypassPermissions appears in settings.json. It disables the permission layer wholesale."
  );
});

test("every required allow rule is present", () => {
  const { json } = loadSettings();
  const allow = new Set(json.permissions?.allow ?? []);
  for (const rule of REQUIRED_ALLOW) {
    assert.ok(allow.has(rule), `allow rule missing: ${rule}`);
  }
});

test("every required deny rule is present", () => {
  const { json } = loadSettings();
  const deny = new Set(json.permissions?.deny ?? []);
  for (const rule of REQUIRED_DENY) {
    assert.ok(
      deny.has(rule),
      `deny rule missing: ${rule} — the deny list has been clobbered or edited. See PERMISSIONS.md ` +
        `for why each entry is there; do not delete one to unblock a session.`
    );
  }
});

test("no rule is both allowed and denied", () => {
  const { json } = loadSettings();
  const allow = new Set(json.permissions?.allow ?? []);
  for (const rule of json.permissions?.deny ?? []) {
    assert.ok(!allow.has(rule), `${rule} appears in both allow and deny`);
  }
});

test("all hook entries are wired, on the right matchers, in order", () => {
  const { json } = loadSettings();
  const pre = json.hooks?.PreToolUse ?? [];
  assert.ok(pre.length > 0, "hooks.PreToolUse is empty — every guard has been dropped");

  for (const [matcher, scripts] of Object.entries(REQUIRED_HOOKS)) {
    const entry = pre.find((e) => e.matcher === matcher);
    assert.ok(entry, `no PreToolUse entry for matcher ${matcher}`);
    const wired = (entry.hooks ?? []).map((h) => h.command ?? "");
    assert.equal(
      wired.length,
      scripts.length,
      `matcher ${matcher} has ${wired.length} hooks, expected ${scripts.length}: ${scripts.join(", ")}`
    );
    scripts.forEach((script, i) => {
      assert.match(
        wired[i],
        new RegExp(script.replace(".", "\\.")),
        `matcher ${matcher} position ${i} should invoke ${script}, got: ${wired[i]}`
      );
    });
  }
});

test("every hook command is node, absolute via CLAUDE_PROJECT_DIR, and not a shell script", () => {
  const { json } = loadSettings();
  for (const entry of json.hooks?.PreToolUse ?? []) {
    for (const h of entry.hooks ?? []) {
      const cmd = h.command ?? "";
      assert.match(cmd, /^node /, `hook command does not start with node: ${cmd}`);
      assert.match(
        cmd,
        /\$CLAUDE_PROJECT_DIR/,
        `hook command has no $CLAUDE_PROJECT_DIR, so it resolves against a varying cwd: ${cmd}`
      );
      assert.ok(
        !/\.sh\b/.test(cmd),
        `hook command references a shell script: ${cmd}. On Windows a .sh hook dies with ` +
          `bad interpreter and fails silently — the guard just stops guarding.`
      );
    }
  }
});

test("every wired hook script exists on disk", () => {
  for (const script of ALL_HOOK_SCRIPTS) {
    const abs = path.join(ROOT, ".claude", "hooks", script);
    assert.ok(fs.existsSync(abs), `settings.json wires ${script}, which does not exist at ${abs}`);
  }
});

test("no hook script on disk is left unwired", () => {
  // Compared against what settings.json actually wires right now, not against REQUIRED_HOOKS.
  // Checking the expected list against itself is vacuous: it stays green while a hook is dropped
  // from the file, which is precisely the clobber this suite exists to catch.
  const { json } = loadSettings();
  const wired = (json.hooks?.PreToolUse ?? [])
    .flatMap((e) => e.hooks ?? [])
    .map((h) => h.command ?? "");

  const dir = path.join(ROOT, ".claude", "hooks");
  const onDisk = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".mjs"))
    .map((d) => d.name);

  for (const script of onDisk) {
    assert.ok(
      wired.some((cmd) => cmd.includes(script)),
      `${script} exists on disk but is not wired in settings.json — a guard that is never invoked ` +
        `is not a control. Either settings.json has been clobbered, or the hook should be wired ` +
        `or deleted.`
    );
  }
});
