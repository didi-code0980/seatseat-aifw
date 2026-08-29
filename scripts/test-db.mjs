// `pnpm test:db` — the database-backed lane. `02-design.md` section 6.4.
//
// THE LANE IS NOT COLLECTED RATHER THAN SKIPPED. `.ai/standards/testing-standards.md` §"What makes a
// test bad here" is explicit — "A skipped test left in the suite. Delete it or fix it; a skip is a
// passing test that checks nothing." A `describe.skipIf(noLocalStack)` would leave a dozen
// permanently-skipped tests in every run on the loop's own machine, which is the thing that standard
// forbids. So the preflight below runs BEFORE ANY TEST FILE IS LOADED and exits 0 with one line.
// Nothing is skipped, because nothing is collected.
//
// AND IT FAILS LOUDLY WHERE IT IS MEANT TO RUN. `REQUIRE_LOCAL_STACK=1` turns the same preflight
// into a non-zero exit naming what was missing, and the CI step sets it. Without that flag a runner
// that lost Docker would report this lane green, which is the failure the skip would otherwise
// create.
//
// Why a third command and not a third vitest project: `pnpm test` pins `DATA_SOURCE=mock`
// (6.3) and a project declared inside `vitest.config.mts` is still collected by it. `01-story.md`
// requires these five clauses to be invisible to `pnpm test` and `pnpm test:e2e`, so that a unit
// suite on a machine with no container runtime fails on the absence of Docker rather than on the
// product.
//
// `.mjs` run via `node`, per the Windows-native working agreement: no `.sh`, no `chmod`, no shebang.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

const REQUIRED = process.env.REQUIRE_LOCAL_STACK === "1";

/**
 * Every command below is a fixed literal. No value read from the environment or from the CLI's
 * output is ever interpolated into a command line — the stack's URL and keys travel in `env`, which
 * is what keeps a shell out of the credential path.
 */
function run(command, { env = {}, capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, {
    shell: true,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (!allowFailure && result.status !== 0) {
    console.error(`\ntest:db failed at: ${command}`);
    if (capture && result.stderr) console.error(result.stderr);
    process.exit(result.status === null ? 1 : result.status);
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Step 1 — preflight
// ---------------------------------------------------------------------------------------------
function probe(command) {
  const result = spawnSync(command, {
    shell: true,
    stdio: ["ignore", "ignore", "ignore"],
  });
  return result.status === 0;
}

const missing = [];
if (!probe("pnpm supabase --version")) missing.push("the Supabase CLI (`pnpm supabase --version`)");
if (!probe("docker info")) missing.push("a running container runtime (`docker info`)");

if (missing.length > 0) {
  const what = missing.join(" and ");
  if (REQUIRED) {
    console.error(`test:db REQUIRED but cannot run — missing ${what}.`);
    console.error(
      "REQUIRE_LOCAL_STACK=1 is set, so this is a failure rather than a skip: a runner that lost " +
        "Docker must not report this lane green."
    );
    process.exit(1);
  }
  console.log(`test:db skipped — no local stack (${what} absent).`);
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// Step 2 — migrations applied, no rows
// ---------------------------------------------------------------------------------------------
// AC-10's "the first migration applied" and AC-12's "holding no rows" are both exactly this state.
// `--no-seed` matters: `supabase/seed.sql` deliberately does not exist (ADR-007 OQ-3 puts the
// fixtures in `scripts/seed.ts` so that both modes read one copy), and AC-12 runs the seed itself.
//
// IT RUNS ONCE, AND NOT AGAIN BETWEEN STEPS 6 AND 7. That is what makes AC-1 a test of persistence:
// the row written by the `@write` pass has to still be there when a second server reads it.
console.log("test:db — starting the local stack");
run("pnpm supabase start");
run("pnpm supabase db reset --local --no-seed");

// ---------------------------------------------------------------------------------------------
// Step 3 — read the stack's environment from the CLI
// ---------------------------------------------------------------------------------------------
// READ, NEVER HARD-CODED. A literal local key in the repository is a credential-shaped string that
// stops being true the day the CLI rotates its demo keys.
//
// TODO(verify): the CLI's exact output key names could not be confirmed on this machine — Docker is
// absent, so `supabase status -o env` cannot be run, and the names are not recoverable from the
// stripped 2.115.0 binary. They are therefore RESOLVED BY ROLE against the candidates below rather
// than assumed, and an unresolved role exits non-zero printing the keys the CLI actually emitted.
// Confirm on the first machine that has a container runtime and reduce each list to the one name.
const CANDIDATES = {
  SUPABASE_URL: ["API_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"],
  SUPABASE_ANON_KEY: [
    "ANON_KEY",
    "SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "PUBLISHABLE_KEY",
  ],
  SUPABASE_SERVICE_ROLE_KEY: ["SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SECRET_KEY"],
  SUPABASE_DB_URL: ["DB_URL", "SUPABASE_DB_URL", "DATABASE_URL"],
};

const status = run("pnpm supabase status -o env", { capture: true });
const emitted = new Map();
for (const line of status.stdout.split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line);
  if (match) emitted.set(match[1], match[2]);
}

// The four names this project owns. The first three are the names the APPLICATION already reads
// (`.env.example`), which is the point — the app under test must reach the local stack and nothing
// else. `SUPABASE_DB_URL` is new and is read only by `scripts/local-stack-client.ts`.
const stackEnv = {};
const unresolved = [];
for (const [name, candidates] of Object.entries(CANDIDATES)) {
  const hit = candidates.find((c) => {
    const v = emitted.get(c);
    return v !== undefined && v !== "";
  });
  if (hit === undefined) unresolved.push(`${name} (tried ${candidates.join(", ")})`);
  else stackEnv[name] = emitted.get(hit);
}

if (unresolved.length > 0) {
  console.error("test:db cannot map `supabase status -o env` onto the four values the lane needs.");
  for (const u of unresolved) console.error(`  unresolved: ${u}`);
  console.error(`  the CLI emitted: ${[...emitted.keys()].join(", ") || "(nothing)"}`);
  console.error(
    "Add the correct name to CANDIDATES in scripts/test-db.mjs. This is the TODO(verify) in step 3."
  );
  process.exit(1);
}

// The guard in `scripts/local-stack-client.ts` is the one that counts, because it stands between
// every export and a socket. This one is here so the lane refuses BEFORE it builds and boots two
// servers against a database it should never have reached.
for (const name of ["SUPABASE_URL", "SUPABASE_DB_URL"]) {
  let host;
  try {
    host = new URL(stackEnv[name]).hostname;
  } catch {
    console.error(`test:db refuses to run: ${name} is not a URL — ${stackEnv[name]}`);
    process.exit(1);
  }
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    console.error(
      `test:db refuses to run: ${name} points at ${host}, which is not the local stack. ` +
        "01-story.md out-of-scope item 12 forbids any automated run from reaching the live project."
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------------------------
// A LANE WITH NO TESTS REPORTS AS A LANE WITH NO TESTS — 5.2
// ---------------------------------------------------------------------------------------------
// `tests/db/**` and `tests/db-e2e/**` are QA's and the developer may write NEITHER — "not one file,
// not a placeholder", because a test written by the stage that wrote the implementation is derived
// from the implementation (RULE-05). So both directories are ABSENT on this branch, and the runner
// has to handle their absence itself: `--pass-with-no-tests` covers an empty directory and neither
// runner covers a missing one. This is why the check is here rather than delegated to a flag.
function hasTests(dir, suffix) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { recursive: true, withFileTypes: true }).some(
    (e) => e.isFile() && e.name.endsWith(suffix)
  );
}

const HAS_UNIT = hasTests("tests/db", ".test.ts");
const HAS_E2E = hasTests("tests/db-e2e", ".spec.ts");

if (!HAS_UNIT && !HAS_E2E) {
  console.log(
    "test:db — no tests yet: tests/db/ and tests/db-e2e/ are QA's to write (02-design.md 5.2)."
  );
  console.log("test:db — done (the stack is up and the migration applied; nothing to run).");
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// Step 4 — the vitest half: AC-9, AC-10, AC-11, and AC-12's second clause
// ---------------------------------------------------------------------------------------------
if (HAS_UNIT) {
  console.log("test:db — vitest (tests/db)");
  run("pnpm exec vitest run --config vitest.db.config.mts --passWithNoTests", { env: stackEnv });
} else {
  console.log("test:db — tests/db/ is empty, skipping the vitest half");
}

// ---------------------------------------------------------------------------------------------
// Step 5 — one build, under the stack's environment
// ---------------------------------------------------------------------------------------------
// Both Playwright passes serve this ONE build. Building under the local stack rather than under
// `mock` matters: whatever Next prerenders reads the real database at build time.
//
// `DATA_SOURCE` is deliberately left unset here and in both configs — this lane is the one place
// ADR-007 §7's default is exercised, and AC-1's `Given` says "no `DATA_SOURCE` set". Setting it
// would test the override instead of the default.
if (!HAS_E2E) {
  console.log("test:db — tests/db-e2e/ is empty, skipping the build and both Playwright passes");
  console.log("test:db — done");
  process.exit(0);
}

console.log("test:db — build");
run("pnpm build", { env: stackEnv });

// ---------------------------------------------------------------------------------------------
// Steps 6 and 7 — the process restart
// ---------------------------------------------------------------------------------------------
// AC-1's last clause is "still present after the process is restarted". One Playwright run boots one
// `webServer` and holds it for the whole run, so no restart can happen inside it. Two invocations of
// the same config with `reuseExistingServer: false` boot two servers against ONE database, and step
// 2 does not run again between them — so the room created under `@write` is read back by a process
// that never held it in memory.
console.log("test:db — playwright @write");
run("pnpm exec playwright test --config playwright.db.config.ts --grep @write --pass-with-no-tests", {
  env: stackEnv,
});

console.log("test:db — playwright @read (second server, same database)");
run("pnpm exec playwright test --config playwright.db.config.ts --grep @read --pass-with-no-tests", {
  env: stackEnv,
});

console.log("test:db — done");
