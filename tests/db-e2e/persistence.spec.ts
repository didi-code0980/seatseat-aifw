// SYS-02 — QA suite. AC-1: Database persistence across process restart.
// Written from 01-story.md and section 6 of 02-design.md only (RULE-05).

import { expect, test } from "@playwright/test";

const PERSIST_ROOM = {
  code: "ROOM-PERSIST",
  name: "Persistence Test Room",
  width: "8",
  height: "8",
};

test.describe("SYS-02 Persistence Suite", () => {
  test("AC-1: @write — data source indicator shows supabase and created room is rendered", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-page")).toBeVisible();
    await expect(page.getByTestId("home-data-source")).toHaveText("supabase");

    await page.goto("/rooms");
    await expect(page.getByTestId("rooms-page")).toBeVisible();

    await page.getByTestId("rooms-create-open").click();
    await expect(page.getByTestId("room-create-dialog")).toBeVisible();

    await page.getByTestId("room-create-name").fill(PERSIST_ROOM.name);
    await page.getByTestId("room-create-code").fill(PERSIST_ROOM.code);
    await page.getByTestId("room-create-grid-width").fill(PERSIST_ROOM.width);
    await page.getByTestId("room-create-grid-height").fill(PERSIST_ROOM.height);
    await page.getByTestId("room-create-submit").click();

    await expect(page.getByTestId(`rooms-row-${PERSIST_ROOM.code}-code`)).toBeVisible();
    await expect(page.getByTestId(`rooms-row-${PERSIST_ROOM.code}-name`)).toHaveText(PERSIST_ROOM.name);
  });

  test("AC-1: @read — created room survives process restart on fresh server instance", async ({ page }) => {
    await page.goto("/rooms");
    await expect(page.getByTestId("rooms-page")).toBeVisible();
    await expect(page.getByTestId(`rooms-row-${PERSIST_ROOM.code}-code`)).toBeVisible();
    await expect(page.getByTestId(`rooms-row-${PERSIST_ROOM.code}-name`)).toHaveText(PERSIST_ROOM.name);
  });
});
