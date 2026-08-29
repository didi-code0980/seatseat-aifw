// SYS-02 — QA suite. Written from `01-story.md` and section 6 of `02-design.md` only (RULE-05).
//
// The non-selector criteria are observed exactly as `02-design.md` §6.1 prescribes them: a package
// that is absent, a command that exits non-zero, a lint that refuses an import. Where §6.1 names a
// `grep` over `src/**`, the equivalent here is a directory walk that asserts an ABSENCE and never
// reads a file's contents into the report — RULE-05 forbids QA reading the implementation, not
// asserting that a token does not appear in it.
//
// Four criteria in this ticket cannot be executed on a machine with no database, no Docker and no
// Supabase CLI. They are NOT asserted here under a weaker proxy pretending to be the criterion;
// `06-test-report.md` names them and what is missing. AC-1, AC-9's regeneration half, AC-11's
// database half and AC-12's round-trip half are that set.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import * as mockAccounts from "@/lib/data/mock/accounts";
import * as mockDevices from "@/lib/data/mock/devices";
import * as mockGroups from "@/lib/data/mock/groups";
import * as mockLayout from "@/lib/data/mock/layout";
import * as mockMembers from "@/lib/data/mock/members";
import * as mockRequests from "@/lib/data/mock/requests";
import * as mockRooms from "@/lib/data/mock/rooms";
import * as mockSeats from "@/lib/data/mock/seats";

import * as supabaseAccounts from "@/lib/data/supabase/accounts";
import * as supabaseDevices from "@/lib/data/supabase/devices";
import * as supabaseGroups from "@/lib/data/supabase/groups";
import * as supabaseLayout from "@/lib/data/supabase/layout";
import * as supabaseMembers from "@/lib/data/supabase/members";
import * as supabaseRequests from "@/lib/data/supabase/requests";
import * as supabaseRooms from "@/lib/data/supabase/rooms";
import * as supabaseSeats from "@/lib/data/supabase/seats";

type Module = Record<string, unknown>;

const PAIRS: Array<[name: string, mock: Module, supabase: Module]> = [
  ["accounts", mockAccounts, supabaseAccounts],
  ["devices", mockDevices, supabaseDevices],
  ["groups", mockGroups, supabaseGroups],
  ["layout", mockLayout, supabaseLayout],
  ["members", mockMembers, supabaseMembers],
  ["requests", mockRequests, supabaseRequests],
  ["rooms", mockRooms, supabaseRooms],
  ["seats", mockSeats, supabaseSeats],
];

function exportedFunctions(mod: Module): string[] {
  return Object.keys(mod)
    .filter((k) => typeof mod[k] === "function")
    .sort();
}

const ROOT = process.cwd();

const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Every `.ts`/`.tsx` file under `src/`, as repository-relative paths. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(path.relative(ROOT, full));
    }
  };
  walk(path.join(ROOT, "src"));
  return out.sort();
}

/**
 * The body of a `CREATE TABLE "<name>" ( ... )` statement, with SQL line comments removed.
 *
 * The naive form of this — a regex from `CREATE TABLE` to the first `;` — is wrong in a way that
 * looks right: this migration's column comments are English prose and one of them contains a
 * semicolon, so the window closes early and any column defined after it is invisible to the
 * assertion. Matching parentheses is the only reading that cannot be changed by rewording a comment.
 */
function tableBody(sql: string, table: string): string {
  const start = sql.indexOf(`CREATE TABLE "${table}" (`);
  if (start === -1) throw new Error(`no CREATE TABLE "${table}" in the migration`);
  let depth = 0;
  let i = sql.indexOf("(", start);
  const open = i;
  for (; i < sql.length; i += 1) {
    if (sql[i] === "(") depth += 1;
    else if (sql[i] === ")") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return sql
    .slice(open + 1, i)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** The column names declared by a `CREATE TABLE` body, ignoring table-level constraint clauses. */
function columnNames(body: string): string[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .map((l) => /^"([A-Za-z_][A-Za-z0-9_]*)"/.exec(l)?.[1])
    .filter((n): n is string => Boolean(n));
}

const MIGRATION = "supabase/migrations/20260826094134_init.sql";

describe("SYS-02 Contract & Parity Suite", () => {
  describe("AC-2 — Mock mode still runs with no network at all", () => {
    it("AC-2: vitest runs in mock mode via DATA_SOURCE=mock", () => {
      expect(process.env.DATA_SOURCE).toBe("mock");
    });

    it("AC-2: the mode is declared in vitest.config.mts, not in individual test files", () => {
      expect(read("vitest.config.mts")).toMatch(/env:\s*\{\s*DATA_SOURCE:\s*"mock"\s*\}/);
    });
  });

  describe("AC-3 — The rendered data-source indicator names the adapter in use", () => {
    it("AC-3: the resolved data source is either mock or supabase", async () => {
      const { resolveDataSource } = await import("@/lib/data");
      expect(resolveDataSource("mock")).toBe("mock");
      expect(resolveDataSource("supabase")).toBe("supabase");
      expect(resolveDataSource("")).toBe("supabase");
      expect(resolveDataSource(undefined)).toBe("supabase");
    });
  });

  describe("AC-4 — Prisma is gone from the project", () => {
    it("AC-4: package.json has no prisma or @prisma/client in any dependency field", () => {
      const pkg = JSON.parse(read("package.json"));
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
        ...pkg.optionalDependencies,
      };
      expect(allDeps.prisma).toBeUndefined();
      expect(allDeps["@prisma/client"]).toBeUndefined();
    });

    it("AC-4: package.json scripts have no db:push or db:studio", () => {
      const pkg = JSON.parse(read("package.json"));
      expect(pkg.scripts?.["db:push"]).toBeUndefined();
      expect(pkg.scripts?.["db:studio"]).toBeUndefined();
    });

    it("AC-4: prisma directory, prisma.config.ts, and prisma data adapter are absent", () => {
      expect(fs.existsSync(path.join(ROOT, "prisma"))).toBe(false);
      expect(fs.existsSync(path.join(ROOT, "prisma.config.ts"))).toBe(false);
      expect(fs.existsSync(path.join(ROOT, "src/lib/data/prisma"))).toBe(false);
    });

    // The clause the string checks above do not reach: "And no file under `src/` imports either
    // package". `02-design.md` §6.1 names this as `grep -r "@prisma/client" src`.
    it("AC-4: no file under src/ imports prisma or @prisma/client", () => {
      const offenders = sourceFiles().filter((rel) =>
        /from\s+["']@?prisma(\/[^"']*)?["']|require\(\s*["']@?prisma(\/[^"']*)?["']\s*\)/.test(
          fs.readFileSync(path.join(ROOT, rel), "utf8")
        )
      );
      expect(offenders, "src files importing prisma").toEqual([]);
    });
  });

  describe("AC-5 — Callers of the seam did not change", () => {
    it("AC-5: covers every entity in the seam", () => {
      expect(PAIRS.map(([name]) => name)).toEqual([
        "accounts",
        "devices",
        "groups",
        "layout",
        "members",
        "requests",
        "rooms",
        "seats",
      ]);
    });

    for (const [name, mock, supabase] of PAIRS) {
      describe(name, () => {
        it(`AC-5: ${name} exports the same function names on both sides`, () => {
          expect(exportedFunctions(supabase)).toEqual(exportedFunctions(mock));
        });

        it(`AC-5: ${name} exports at least one function`, () => {
          expect(exportedFunctions(mock).length).toBeGreaterThan(0);
        });

        it(`AC-5: ${name} matches arity for every export`, () => {
          for (const key of exportedFunctions(mock)) {
            const mockFn = mock[key] as (...args: unknown[]) => unknown;
            const supabaseFn = supabase[key] as (...args: unknown[]) => unknown;
            expect(supabaseFn.length, `${name}.${key} arity`).toBe(mockFn.length);
          }
        });
      });
    }
  });

  describe("AC-6 — Each Supabase package stays inside its own directory", () => {
    // The criterion is "an import ... IS AN ERROR", which a string match on the config cannot show —
    // a rule can be present and mis-scoped, or present and downgraded to a warning. These four cases
    // run the project's real flat config through ESLint and assert the verdict, including the
    // cross-exemption AC-6 names explicitly: the AUTH package inside the DATA directory is an error.
    const lintCase = async (filePath: string, code: string): Promise<string[]> => {
      const { ESLint } = await import("eslint");
      const results = await new ESLint({ cwd: ROOT }).lintText(code, {
        filePath,
        warnIgnored: false,
      });
      return (results[0]?.messages ?? [])
        .filter((m) => m.severity === 2)
        .map((m) => m.ruleId ?? "unknown");
    };

    const DATA_IMPORT = 'import { createClient } from "@supabase/supabase-js";\nexport const x = createClient;\n';
    const AUTH_IMPORT = 'import { createServerClient } from "@supabase/ssr";\nexport const x = createServerClient;\n';

    it("AC-6: the data package is an error outside src/lib/data/supabase/", async () => {
      expect(await lintCase("src/app/(app)/probe.tsx", DATA_IMPORT)).toContain(
        "no-restricted-imports"
      );
    });

    it("AC-6: the data package is permitted inside src/lib/data/supabase/", async () => {
      expect(await lintCase("src/lib/data/supabase/probe.ts", DATA_IMPORT)).toEqual([]);
    });

    it("AC-6: the auth package is permitted inside src/lib/auth/", async () => {
      expect(await lintCase("src/lib/auth/probe.ts", AUTH_IMPORT)).toEqual([]);
    });

    it("AC-6: the auth package is an error inside the data adapter — the exemptions do not overlap", async () => {
      expect(await lintCase("src/lib/data/supabase/probe.ts", AUTH_IMPORT)).toContain(
        "no-restricted-imports"
      );
    });

    it("AC-6: the documentation audit reports no D12 finding on this tree", () => {
      let output: string;
      try {
        output = execFileSync("node", ["scripts/check-docs.mjs"], {
          cwd: ROOT,
          encoding: "utf8",
        });
      } catch (error) {
        // check-docs exits non-zero on any failing check. D6 is red on this branch by design
        // (`02-design.md` D-1) and is not this criterion; the assertion below reads D12 only.
        output = String((error as { stdout?: string }).stdout ?? "");
      }
      expect(output).not.toMatch(/\bD12\b/);
    }, 60_000);
  });

  describe("AC-7 — No Supabase client or key reaches the browser", () => {
    it("AC-7: .env.example does not expose Supabase keys with NEXT_PUBLIC_ prefix", () => {
      expect(read(".env.example")).not.toMatch(/NEXT_PUBLIC_.*SUPABASE/i);
    });

    // `02-design.md` §6.1: no file matched by `grep -rl "use client" src` names `@supabase/`.
    it("AC-7: no client component imports any @supabase/ package", () => {
      const offenders = sourceFiles().filter((rel) => {
        const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
        return /^\s*["']use client["']/m.test(src) && /["']@supabase\//.test(src);
      });
      expect(offenders, 'files marked "use client" importing @supabase/*').toEqual([]);
    });

    it("AC-7: no NEXT_PUBLIC_ name under src/ carries a Supabase key", () => {
      const offenders = sourceFiles().filter((rel) =>
        /NEXT_PUBLIC_[A-Za-z0-9_]*SUPABASE/i.test(fs.readFileSync(path.join(ROOT, rel), "utf8"))
      );
      expect(offenders).toEqual([]);
    });
  });

  describe("AC-8 — Type-checking needs nothing but the repository", () => {
    it("AC-8: the generated table types are a committed file, not a fetch", () => {
      const rel = "supabase/types.generated.ts";
      expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
      const content = read(rel);
      expect(content.length).toBeGreaterThan(0);
      expect(content).toMatch(/export type Database/);
    });

    it("AC-8: pnpm typecheck exits 0 with no SUPABASE_* variable set and no network", () => {
      const env = Object.fromEntries(
        Object.entries(process.env).filter(([k]) => !k.startsWith("SUPABASE_"))
      ) as NodeJS.ProcessEnv;
      // Throws on a non-zero exit, which is the assertion.
      execFileSync("node", ["node_modules/typescript/bin/tsc", "--noEmit"], {
        cwd: ROOT,
        env,
        encoding: "utf8",
      });
    }, 180_000);
  });

  describe("AC-9 — The committed types cannot drift from the migrations", () => {
    const workflow = (): string => read(".github/workflows/verify.yml");

    it("AC-9: the workflow runs pnpm test:db with REQUIRE_LOCAL_STACK=1", () => {
      const yml = workflow();
      expect(yml).toContain("pnpm test:db");
      expect(yml).toMatch(/REQUIRE_LOCAL_STACK:\s*["']?1["']?/);
    });

    it("AC-9: tests/db/types-drift.test.ts checks drift against supabase/types.generated.ts", () => {
      expect(fs.existsSync(path.join(ROOT, "tests/db/types-drift.test.ts"))).toBe(true);
      const testSrc = read("tests/db/types-drift.test.ts");
      expect(testSrc).toMatch(/supabase.*gen.*types.*typescript/i);
      expect(testSrc).toMatch(/supabase\/types\.generated\.ts/);
    });
  });

  describe("AC-10 — The first migration carries the three invariant constraints", () => {
    const sql = (): string => read(MIGRATION);

    it("AC-10: the migration exists", () => {
      expect(fs.existsSync(path.join(ROOT, MIGRATION))).toBe(true);
    });

    it("AC-10: INV-04 is held by a PARTIAL unique index on the device table", () => {
      const s = sql();
      const index = /CREATE\s+UNIQUE\s+INDEX[^;]*one_primary_device_per_seat[^;]*;/i.exec(s)?.[0];
      expect(index, "one_primary_device_per_seat unique index").toBeTruthy();
      expect(index).toMatch(/ON\s+"Device"/i);
      // Partial, or it would forbid a seat's SECOND secondary device as well as its second primary.
      expect(index).toMatch(/\bWHERE\b/i);
    });

    it("AC-10: INV-05 is held by a constraint trigger on the device table", () => {
      const s = sql();
      const trigger = /CREATE\s+CONSTRAINT\s+TRIGGER[^;]*device_primary_owner_check[^;]*;/i.exec(
        s
      )?.[0];
      expect(trigger, "device_primary_owner_check constraint trigger").toBeTruthy();
      expect(trigger).toMatch(/ON\s+"Device"/i);
      expect(trigger).toMatch(/DEFERRABLE/i);
    });

    it("AC-10: INV-06 is held by a downgrade trigger on the seat table", () => {
      const s = sql();
      const trigger = /CREATE\s+TRIGGER[^;]*seat_occupant_exit_downgrade[^;]*;/i.exec(s)?.[0];
      expect(trigger, "seat_occupant_exit_downgrade trigger").toBeTruthy();
      expect(trigger).toMatch(/ON\s+"Seat"/i);
    });

    it("AC-10: the seat table declares no status column — INV-03", () => {
      expect(columnNames(tableBody(sql(), "Seat"))).not.toContain("status");
    });

    it("AC-10: no view or generated column produces a seat status — INV-03", () => {
      const s = sql();
      expect(s).not.toMatch(/GENERATED\s+ALWAYS\s+AS[^;]*status/i);
      expect(s).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?VIEW[^;]*status/i);
    });

    // The two invariants held by an ABSENCE. A first migration adds either by reflex, and nothing
    // downstream reports it: the second seat is simply refused, and the unassigned device state
    // simply becomes unreachable.
    it("AC-10: INV-01 — occupancy is a single scalar column, not a collection", () => {
      const sql_ = sql();
      const cols = columnNames(tableBody(sql_, "Seat"));
      expect(cols.filter((c) => /occupant/i.test(c))).toEqual(["occupantId"]);
      // A join table would let one seat hold two occupants no matter what the column says.
      const tables = [...sql_.matchAll(/CREATE TABLE "([A-Za-z_][A-Za-z0-9_]*)"/g)]
        .map((m) => m[1])
        .filter((t): t is string => Boolean(t));
      expect(tables).not.toContain("SeatOccupancy");
      expect(tables.filter((t) => /occupan/i.test(t))).toEqual([]);
    });

    it("AC-10: INV-02 — Seat.occupantId carries no unique constraint", () => {
      const s = sql();
      expect(s).not.toMatch(/UNIQUE[^;\n]*"?occupantId"?/i);
      expect(s).not.toMatch(/CREATE\s+UNIQUE\s+INDEX[^;]*ON\s+"Seat"[^;]*occupantId/i);
    });

    it("AC-10: INV-07 — the device owner reference is nullable", () => {
      const body = tableBody(sql(), "Device");
      const ownerLine = body
        .split("\n")
        .find((l) => /^\s*"ownerId"/.test(l));
      expect(ownerLine, 'Device."ownerId" column').toBeTruthy();
      expect(ownerLine).not.toMatch(/NOT\s+NULL/i);
    });

    it("AC-10: INV-11 — deleting a room cascades to its seats", () => {
      expect(tableBody(sql(), "Seat")).toMatch(
        /"roomId"[^,]*REFERENCES\s+"Room"[^,]*ON\s+DELETE\s+CASCADE/i
      );
    });

    it("AC-10: INV-12 — member references refuse rather than cascade", () => {
      const s = sql();
      expect(tableBody(s, "Seat")).toMatch(
        /"occupantId"[^,]*REFERENCES\s+"Member"[^,]*ON\s+DELETE\s+RESTRICT/i
      );
      expect(tableBody(s, "Device")).toMatch(
        /"ownerId"[^,]*REFERENCES\s+"Member"[^,]*ON\s+DELETE\s+RESTRICT/i
      );
    });
  });

  describe("AC-12 — The seed produces the same data the fixtures describe, and can be run twice", () => {
    // The round trip — seed an empty database, then compare what the application renders against
    // `DATA_SOURCE=mock` — needs a database and is reported UNVERIFIED, not proxied. What IS
    // observable without one are the two properties the round trip depends on.
    const seed = (): string => read("scripts/seed.ts");

    it("AC-12: the seed reads src/lib/data/fixtures.ts rather than holding its own copy", () => {
      expect(seed()).toMatch(/from\s+["']\.\.\/src\/lib\/data\/fixtures["']/);
    });

    it("AC-12: every seeded table is written as an upsert, which is what makes a second run a no-op", () => {
      const body = seed();
      expect(body).toMatch(/\.upsert\(/);
      expect(body).not.toMatch(/\.insert\(/);
    });
  });

  describe("AC-13 — The seed refuses to run against production", () => {
    // Executed, not read. The Supabase variables are stripped from the child's environment so that a
    // guard which failed to fire could not reach a database either — this ticket runs against ONE
    // Supabase project (`ticket.yaml` precondition 2) and a seed that got past the guard would write
    // to the live one.
    it("AC-13: NODE_ENV=production exits non-zero and writes nothing", () => {
      const env = {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([k]) => !k.startsWith("SUPABASE_"))
        ),
        NODE_ENV: "production",
      } as NodeJS.ProcessEnv;

      let status: number | null = 0;
      let stderr = "";
      try {
        execFileSync("node", ["node_modules/tsx/dist/cli.mjs", "scripts/seed.ts"], {
          cwd: ROOT,
          env,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error) {
        const e = error as { status?: number; stderr?: string };
        status = e.status ?? null;
        stderr = String(e.stderr ?? "");
      }

      expect(status, "exit code with NODE_ENV=production").not.toBe(0);
      expect(stderr).toMatch(/refuses to run with NODE_ENV=production/);
      // It refused before constructing a client: a missing SUPABASE_URL never became the failure.
      expect(stderr).not.toMatch(/SUPABASE_URL is not set/);
    }, 120_000);

    it("AC-13: the refusal is the first statement of the execution path", () => {
      const body = read("scripts/seed.ts");
      const main = body.indexOf("async function main");
      const guard = body.indexOf("refuseProduction();", main);
      expect(guard).toBeGreaterThan(-1);
      const before = body.slice(main, guard);
      expect(before).not.toMatch(/createClient\(|admin\(\)/);
    });
  });
});
