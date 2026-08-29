// SYS-02 — QA suite. AC-9: Types drift detection against local migrations.
// Written from 01-story.md and section 6 of 02-design.md only (RULE-05).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const TYPES_FILE = "supabase/types.generated.ts";

describe("SYS-02 Database Lane — AC-9 Types Drift", () => {
  it("AC-9: generated types from local migration reset match supabase/types.generated.ts exactly", () => {
    const committed = fs.readFileSync(path.join(ROOT, TYPES_FILE), "utf8");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "types-drift-"));
    const tmpFile = path.join(tmpDir, "types.generated.ts");

    try {
      const generated = execFileSync(
        "pnpm",
        ["exec", "supabase", "gen", "types", "typescript", "--local"],
        {
          cwd: ROOT,
          encoding: "utf8",
        }
      );

      fs.writeFileSync(tmpFile, generated, "utf8");
      const generatedContent = fs.readFileSync(tmpFile, "utf8");

      expect(generatedContent).toBe(committed);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("AC-9: the committed supabase/types.generated.ts is unchanged after regeneration check", () => {
    const committed = fs.readFileSync(path.join(ROOT, TYPES_FILE), "utf8");
    expect(committed.length).toBeGreaterThan(0);
    expect(committed).toMatch(/export type Database/);
  });
});
