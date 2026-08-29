// SYS-02 — QA suite. AC-12: UI seed parity across pages against seeded database.
// Written from 01-story.md and section 6 of 02-design.md only (RULE-05).

import { expect, test } from "@playwright/test";

test.describe("SYS-02 Seed Parity Suite", () => {
  test("AC-12: @write — rooms page renders seeded fixture entity ROOM-A", async ({ page }) => {
    await page.goto("/rooms");
    await expect(page.getByTestId("rooms-page")).toBeVisible();
    await expect(page.getByTestId("rooms-row-ROOM-A-code")).toBeVisible();
  });

  test("AC-12: @write — seats page renders seeded fixture entity SEAT-A-01", async ({ page }) => {
    await page.goto("/seats");
    await expect(page.getByTestId("seats-page")).toBeVisible();
    await expect(page.getByTestId("seats-row-SEAT-A-01-code")).toBeVisible();
  });

  test("AC-12: @write — members page renders seeded fixture member ada@example.internal", async ({ page }) => {
    await page.goto("/members");
    await expect(page.getByTestId("members-page")).toBeVisible();
    await expect(page.getByTestId("members-row-ada@example.internal-name")).toBeVisible();
  });

  test("AC-12: @write — devices page renders seeded fixture device AST-0001", async ({ page }) => {
    await page.goto("/devices");
    await expect(page.getByTestId("devices-page")).toBeVisible();
    await expect(page.getByTestId("devices-row-AST-0001-tag")).toBeVisible();
  });

  test("AC-12: @write — groups page renders seeded fixture groups", async ({ page }) => {
    await page.goto("/groups");
    await expect(page.getByTestId("groups-page")).toBeVisible();
    await expect(page.getByTestId("groups-table")).toBeVisible();
  });
});
