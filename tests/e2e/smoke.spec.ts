import { expect, test } from "@playwright/test";

// Every route renders without a runtime error, in mock mode.
//
// This is the Phase B acceptance item, expressed as a test rather than as a manual click-through, so
// it keeps holding. It asserts on `data-testid` only — the same channel design section 6 gives QA
// (RULE-05) — so a class name or copy change cannot break it.

const ROUTES = [
  { path: "/", testId: "home-page" },
  { path: "/login", testId: "login-page" },
  { path: "/rooms", testId: "rooms-page" },
  { path: "/seats", testId: "seats-page" },
  { path: "/devices", testId: "devices-page" },
  { path: "/members", testId: "members-page" },
  { path: "/groups", testId: "groups-page" },
  { path: "/layout-designer", testId: "layout-designer-page" },
  { path: "/requests", testId: "requests-page" },
] as const;

for (const route of ROUTES) {
  test(`${route.path} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(route.path);
    expect(response?.status(), `${route.path} status`).toBeLessThan(400);
    await expect(page.getByTestId(route.testId)).toBeVisible();
    expect(errors, `${route.path} runtime errors`).toEqual([]);
  });
}

test("the seam reports mock mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-data-source")).toHaveText("mock");
});

test("fixtures reach the rooms table", async ({ page }) => {
  // Rows are keyed by room `code`, not by room id — ROO-01 design section 6. The ids these two
  // assertions used to carry (`room-a`, `room-b`) are minted with `crypto.randomUUID()` in the real
  // implementation and were never addressable for a room a test creates. Selectors only; the thing
  // being asserted is unchanged.
  await page.goto("/rooms");
  await expect(page.getByTestId("rooms-row-ROOM-A")).toBeVisible();
  await expect(page.getByTestId("rooms-row-ROOM-B")).toBeVisible();
});

test("seat status is derived and rendered — INV-03", async ({ page }) => {
  await page.goto("/seats");
  await expect(page.getByTestId("seats-status-seat-a-01")).toHaveText("OCCUPIED");
  await expect(page.getByTestId("seats-status-seat-a-03")).toHaveText("VACANT");
});

test("an unassigned device is shown as inventory — INV-07", async ({ page }) => {
  await page.goto("/devices");
  await expect(page.getByTestId("devices-row-dev-05")).toContainText("unassigned");
});

test("login offers no self-registration — INV-08", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("login-no-signup")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up|register|create account/i })).toHaveCount(0);
});
