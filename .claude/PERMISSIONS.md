# Permissions and hooks — why each entry exists

`.claude/settings.json` is parsed as strict JSON. A `//` comment makes the file unparseable, and an
unparseable settings file **drops the entire deny list** — failing open on exactly the thing the file
exists to close. So the rationale lives here instead.

## disableClaudeAiConnectors

`true`, and load-bearing rather than cosmetic.

Connectors attach to a claude.ai account, not to a repository. Without this flag a coding agent
working on a seat-tracking application inherits whatever mail, calendar, drive, and design connectors
that account happens to have. Nothing in this repository needs them, and the blast radius of an agent
with mailbox access is enormously larger than the task.

There is a second effect worth knowing. The ClickUp tools this repository uses come from the server
declared in `.mcp.json` and are named `mcp__clickup__*`. A connector-provided ClickUp integration
would carry a different prefix — for example `mcp__claude_ai_ClickUp__*` — and **would not match the
`mcp__clickup__.*` hook matcher**, so `guard-tracker-scope.mjs` would never see those calls. Turning
connectors off keeps exactly one ClickUp surface, and it is the guarded one.

## Denied ClickUp tools

**`clickup_search`** searches the entire workspace and takes no argument that constrains it to a
list. There is no way to write an allow rule or a hook check that narrows it, because the scope is
not in the call — it is in the tool. Use `clickup_filter_tasks` with an explicit `list_id` instead,
which `guard-tracker-scope.mjs` can validate against `allowed_list_ids`.

**`clickup_get_workspace_hierarchy`** enumerates the workspace. The binding is already resolved in
`.ai/registry/tracker.yaml` — workspace, space, and list IDs are all present — so nothing in this
system needs to discover them. A tool whose only purpose is discovery, in a system where discovery is
already done, can only widen scope.

**`clickup_delete_task`, `clickup_merge_tasks`, `clickup_move_task`** are destructive or move data
across lists, which is how a task leaves the guarded scope while every individual call looks valid.

**`clickup_send_chat_message`** posts to workspace chat. The loop communicates through artifacts and
pull requests; an agent that can message a channel can produce side effects nobody reviews.

## Denied git operations

`git push --force` and `git push origin main` protect the trunk. `gh pr merge` enforces RULE-09:
merging is permanently human, and the loop's terminal output is an open pull request.

`git reset --hard` is denied because it is what an agent reaches for when it is confused, and what it
discards includes the artifacts that would explain the confusion.

## Hooks

All five are Node, invoked as `node "$CLAUDE_PROJECT_DIR/..."`. None is a `.sh` file, and that is not
a style preference. A `.sh` hook on Windows dies with `bad interpreter: /bin/sh^M` once Git rewrites
line endings, and it fails **silently** — the guard simply stops guarding, which is worse than having
no guard at all because the deny list still looks configured.

| Hook | Matcher | Enforces | Failure direction |
|---|---|---|---|
| `guard-registry.mjs` | `Edit\|Write` | RULE-01 | closed |
| `guard-allowed-paths.mjs` | `Edit\|Write` | RULE-03 | closed |
| `guard-tracker-scope.mjs` | `mcp__clickup__.*` | RULE-18 | closed |
| `chat-guard.mjs` | `Agent\|Task\|SendMessage` | RULE-12, RULE-15 | open with no active ticket, closed otherwise |
| `guard-read-scope.mjs` | `Read\|Grep\|Glob\|NotebookEdit` | RULE-05 | open for agents other than `ba` and `qa` |

Every one has a test file under `.claude/hooks/tests/`, runnable with `node --test
.claude/hooks/tests/`. A control that has never been observed to fire is not a control, it is a
belief about a control.

### Two hooks are additions to the bootstrap specification

The specification listed four hooks but wired only two matchers in `settings.json`. Both additions
are recorded here rather than made silently:

**`chat-guard.mjs` had no matcher.** Without one it would never fire, and RULE-12 and RULE-15 would
be prose. It is wired on `Agent|Task|SendMessage`.

**`guard-read-scope.mjs` did not exist.** The acceptance criterion "the `ba` and `qa` agent files
carry a Read deny on `src/**`" is not expressible in subagent frontmatter: `tools` and
`disallowedTools` are tool-level, not path-level, and denying `Read` outright would leave those
agents unable to read the story they work from. A path-scoped hook is the only mechanism that
expresses it. It is wired twice — session-wide here, and in the `ba` and `qa` frontmatter — so the
restriction is visible in the agent definition, which is where someone will look for it.

### Why chat-guard fails open

It exits 0 when there is no active ticket. Outside a live ticket there is no verdict to protect and
no budget to spend, and a guard that blocked every subagent dispatch on `main` would stop the loop
rather than constrain it.

It also exits 0 when the payload has no `agent_type`, which means the call came from the main thread
— the orchestrator dispatching a stage, not an agent talking to another agent. Orchestrator dispatch
and agent chat use the same tool, and blocking the former to constrain the latter would break the
loop at every transition.

### Why the others fail closed

An unreadable payload, an unresolvable project root, a missing `ticket.yaml` on a `feat/` branch, a
missing `tracker.yaml` — all block. A guard that cannot tell whether an action is in scope must not
conclude that it is.

## Per-agent restrictions

Seven of the eight agents carry `disallowedTools: mcp__clickup`, which removes every tool from that
server. `orchestrator` is the exception and is the only agent that can reach the tracker at all.

This is defence in depth with the allow list: the allow list says which ClickUp tools may ever be
called, `disallowedTools` says who may call them, and `guard-tracker-scope.mjs` says what they may be
pointed at.
