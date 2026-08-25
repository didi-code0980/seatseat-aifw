import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  SELF_SIGNUP_STORAGE_KEY,
  readSelfSignupSetting,
} from "@/lib/auth/self-signup";
import type { SelfSignupSetting } from "@/lib/auth/self-signup";

describe("SELF_SIGNUP_STORAGE_KEY", () => {
  it("AC-10: matches the contractual key 'sdt.self-signup'", () => {
    expect(SELF_SIGNUP_STORAGE_KEY).toBe("sdt.self-signup");
  });
});

describe("readSelfSignupSetting — pure resolver and fail-closed paths", () => {
  it("AC-10: returns 'disabled' when storage is null", () => {
    const setting: SelfSignupSetting = readSelfSignupSetting(null);
    expect(setting).toBe("disabled");
  });

  it("AC-10: returns 'disabled' when storage is undefined / omitted (jsdom environment)", () => {
    // Under vitest jsdom environment with no stored key
    localStorage.removeItem(SELF_SIGNUP_STORAGE_KEY);
    const setting: SelfSignupSetting = readSelfSignupSetting();
    expect(setting).toBe("disabled");
  });

  it("AC-10: returns 'disabled' when key is absent in provided storage", () => {
    const mockStorage = {
      getItem: (key: string) => (key === "other-key" ? "enabled" : null),
    };
    expect(readSelfSignupSetting(mockStorage)).toBe("disabled");
  });

  it("AC-10: fail-closed path 1 — returns 'disabled' for boolean-like string 'true'", () => {
    const mockStorage = {
      getItem: (key: string) => (key === SELF_SIGNUP_STORAGE_KEY ? "true" : null),
    };
    expect(readSelfSignupSetting(mockStorage)).toBe("disabled");
  });

  it("AC-10: fail-closed path 2 — returns 'disabled' for uppercase string 'ENABLED'", () => {
    const mockStorage = {
      getItem: (key: string) => (key === SELF_SIGNUP_STORAGE_KEY ? "ENABLED" : null),
    };
    expect(readSelfSignupSetting(mockStorage)).toBe("disabled");
  });

  it("AC-10: fail-closed path 3 — returns 'disabled' for empty string ''", () => {
    const mockStorage = {
      getItem: (key: string) => (key === SELF_SIGNUP_STORAGE_KEY ? "" : null),
    };
    expect(readSelfSignupSetting(mockStorage)).toBe("disabled");
  });

  it("AC-10: fail-closed path 4 — returns 'disabled' when storage.getItem throws", () => {
    const mockStorage = {
      getItem: () => {
        throw new Error("SecurityError: localStorage is disabled");
      },
    };
    expect(readSelfSignupSetting(mockStorage)).toBe("disabled");
  });

  it("AC-10: fail-closed path 5 — returns 'disabled' for arbitrary strings ('1', 'false', 'yes', 'disabled')", () => {
    for (const val of ["1", "false", "yes", "disabled", "null", "undefined", " ENABLED ", " enabled "]) {
      const mockStorage = {
        getItem: (key: string) => (key === SELF_SIGNUP_STORAGE_KEY ? val : null),
      };
      expect(readSelfSignupSetting(mockStorage)).toBe("disabled");
    }
  });

  it("AC-11: returns 'enabled' ONLY when storage returns exact string 'enabled'", () => {
    const mockStorage = {
      getItem: (key: string) => (key === SELF_SIGNUP_STORAGE_KEY ? "enabled" : null),
    };
    const setting: SelfSignupSetting = readSelfSignupSetting(mockStorage);
    expect(setting).toBe("enabled");
  });
});

describe("Repository & Provider Contract Assertions (AC-1 to AC-7)", () => {
  const root = process.cwd();

  it("AC-1: Better Auth is absent from package.json dependencies and lockfile", () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies, ...pkgJson.peerDependencies };
    expect(deps["better-auth"]).toBeUndefined();

    const lockfile = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
    expect(lockfile).not.toMatch(/['"]?better-auth['"]?:/);
  });

  it("AC-2: The Better Auth surface files no longer exist, and permissions.ts exists", () => {
    expect(fs.existsSync(path.join(root, "src/lib/auth/auth.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src/lib/auth/client.ts"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src/app/api/auth"))).toBe(false);
    expect(fs.existsSync(path.join(root, "src/lib/auth/permissions.ts"))).toBe(true);
  });

  it("AC-3: @supabase/ssr is present and is the only Supabase package in package.json", () => {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkgJson.dependencies?.["@supabase/ssr"]).toBeDefined();

    const allDeps = Object.keys({
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
      ...pkgJson.peerDependencies,
    });
    const supabaseDeps = allDeps.filter((d) => d.startsWith("@supabase/"));
    expect(supabaseDeps).toEqual(["@supabase/ssr"]);
    expect(allDeps).not.toContain("@supabase/supabase-js");
  });

  it("AC-5: eslint.config.mjs names @supabase/* in restricted imports and only exempts src/lib/auth/**", () => {
    const eslintConfig = fs.readFileSync(path.join(root, "eslint.config.mjs"), "utf8");
    expect(eslintConfig).toContain("@supabase/*");
    expect(eslintConfig).toContain("src/lib/auth/**");
    expect(eslintConfig).not.toMatch(/["']src\/lib\/data\/\*\*["']/);
  });

  it("AC-7: src/lib/auth/permissions.ts exists and authorization is intact", () => {
    expect(fs.existsSync(path.join(root, "src/lib/auth/permissions.ts"))).toBe(true);
    expect(fs.existsSync(path.join(root, "tests/unit/permissions.test.ts"))).toBe(true);
  });
});
