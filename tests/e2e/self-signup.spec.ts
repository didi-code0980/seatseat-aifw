import { expect, test } from "@playwright/test";

// SYS-01 — Replace Better Auth with Supabase Auth.
// Acceptance criteria from `01-story.md`, selectors from `02-design.md` section 6 only (RULE-05).
// `src/**` was not read to write this file.

const SELF_SIGNUP_KEY = "sdt.self-signup";

test.describe("SYS-01 — Self-signup flag and login route behavior", () => {
  test("AC-9: the login route renders without error, and no self-signup path exists — INV-08", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto("/login");
    expect(response?.status(), "login page status").toBeLessThan(400);

    // Root page and form elements
    await expect(page.getByTestId("login-page")).toBeVisible();
    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
    await expect(page.getByTestId("login-submit")).toBeVisible();

    // Standing note indicating accounts are created by Manager or Administrator
    await expect(page.getByTestId("login-no-signup")).toBeVisible();

    // Absence of any account creation or registration control / link
    await expect(page.getByRole("link", { name: /sign up|register|create account|invitation/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sign up|register|create account/i })).toHaveCount(0);

    // No client-side or server-side runtime errors
    expect(errors, "no runtime errors on login route").toEqual([]);
  });

  test("AC-10: the self-signup configuration flag is disabled when it is absent — INV-08", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Fresh browser context has empty localStorage
    await page.goto("/login");

    await expect(page.getByTestId("login-page")).toBeVisible();

    // The resolved setting renders as literal "disabled"
    await expect(page.getByTestId("login-self-signup")).toHaveText("disabled");

    // The standing notice is displayed
    await expect(page.getByTestId("login-no-signup")).toBeVisible();

    // No account creation control or link
    await expect(page.getByRole("link", { name: /sign up|register|create account/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sign up|register|create account/i })).toHaveCount(0);

    expect(errors, "page does not error on missing localStorage flag").toEqual([]);
  });

  test("AC-10 (refusal): invalid flag values in localStorage fail closed to disabled — INV-08", async ({ page }) => {
    // Inject a non-contractual truthy value ("true") to verify fail-closed behavior
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SELF_SIGNUP_KEY);

    await page.goto("/login");
    await expect(page.getByTestId("login-self-signup")).toHaveText("disabled");
  });

  test("AC-11: enabling the flag does not produce a self-signup path — INV-08", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Inject enabled flag before first render
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "enabled");
    }, SELF_SIGNUP_KEY);

    await page.goto("/login");

    await expect(page.getByTestId("login-page")).toBeVisible();

    // Setting resolves to "enabled"
    await expect(page.getByTestId("login-self-signup")).toHaveText("enabled");

    // Standing notice is still visible and unchanged
    await expect(page.getByTestId("login-no-signup")).toBeVisible();

    // Submit button is present for sign in, not registration
    await expect(page.getByTestId("login-submit")).toBeVisible();

    // No account creation control or sign-up link becomes reachable
    await expect(page.getByRole("link", { name: /sign up|register|create account/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /sign up|register|create account/i })).toHaveCount(0);

    expect(errors, "no runtime errors when flag is enabled").toEqual([]);
  });
});
