import { expect, test, type Page } from "@playwright/test";

// SEA-01 — Seat occupancy UI: assign, release, and derived status.
//
// Acceptance criteria from `01-story.md`, selectors from `02-design.md` section 6 only (RULE-05).
// `src/**` was not read.
//
// Rows are keyed by seat `code`, not by id — section 6.
//
// Constraints from section 6.2:
// 1. Serial mode. `playwright.config.ts` sets `fullyParallel: true` and one production server holds
//    one mutable store.
// 2. Every test restores the occupancy it changed. Do not leave seeded occupancy permanently modified.
// 3. Nothing seeded is quoted. Seats, members, and rooms are discovered through the rendered UI.

test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36).toUpperCase();

function tagFor(label: string, retry: number): string {
  return `AST-QA-${RUN}-${label}-${retry}`;
}

type SeatRowInfo = {
  code: string;
  room: string;
  ports: string;
  occupant: string;
  status: string;
};

/** Discovers all seat codes currently rendered in the table. */
async function listedSeatCodes(page: Page): Promise<string[]> {
  const cells = page.locator('[data-testid^="seats-row-"][data-testid$="-code"]');
  return (await cells.allInnerTexts()).map((t) => t.trim()).filter((t) => t.length > 0);
}

async function seatRowState(page: Page, code: string): Promise<SeatRowInfo> {
  return {
    code: (await page.getByTestId(`seats-row-${code}-code`).innerText()).trim(),
    room: (await page.getByTestId(`seats-row-${code}-room`).innerText()).trim(),
    ports: (await page.getByTestId(`seats-row-${code}-ports`).innerText()).trim(),
    occupant: (await page.getByTestId(`seats-row-${code}-occupant`).innerText()).trim(),
    status: (await page.getByTestId(`seats-row-${code}-status`).innerText()).trim(),
  };
}

async function optionsOf(page: Page, testId: string): Promise<Array<{ value: string; label: string }>> {
  return page.getByTestId(testId).locator("option").evaluateAll((nodes) =>
    nodes.map((n) => ({
      value: (n as HTMLOptionElement).value,
      label: ((n as HTMLOptionElement).textContent ?? "").trim(),
    }))
  );
}

/** Discovers available member options from the seat assign dialog. */
async function memberOptionsFromSeat(page: Page, vacantCode: string): Promise<Array<{ value: string; label: string }>> {
  await page.getByTestId(`seats-row-${vacantCode}-assign`).click();
  await expect(page.getByTestId("seat-assign-dialog")).toBeVisible();
  const all = await optionsOf(page, "seat-assign-occupant");
  await page.getByTestId("seat-assign-cancel").click();
  await expect(page.getByTestId("seat-assign-dialog")).toBeHidden();
  return all.filter((o) => o.value !== "");
}

/** Assigns a member to a seat through the assign dialog. */
async function assignOccupant(page: Page, seatCode: string, memberLabel: string): Promise<void> {
  await page.getByTestId(`seats-row-${seatCode}-assign`).click();
  await expect(page.getByTestId("seat-assign-dialog")).toBeVisible();
  await expect(page.getByTestId("seat-assign-seat")).toHaveText(seatCode);
  await page.getByTestId("seat-assign-occupant").selectOption({ label: memberLabel });
  await page.getByTestId("seat-assign-submit").click();
  await expect(page.getByTestId("seat-assign-dialog")).toBeHidden();
  await expect(page.getByTestId(`seats-row-${seatCode}-occupant`)).toHaveText(memberLabel);
  await expect(page.getByTestId(`seats-row-${seatCode}-status`)).toHaveText("OCCUPIED");
}

/** Releases an occupant from a seat through the row control. */
async function releaseOccupant(page: Page, seatCode: string): Promise<void> {
  await page.getByTestId(`seats-row-${seatCode}-release`).click();
  await expect(page.getByTestId(`seats-row-${seatCode}-occupant`)).toHaveText("no occupant");
  await expect(page.getByTestId(`seats-row-${seatCode}-status`)).toHaveText("VACANT");
}

test("AC-1: every seat is listed with occupant, status, and correct action controls", async ({ page }) => {
  await page.goto("/seats");

  await expect(page.getByTestId("seats-page")).toBeVisible();
  await expect(page.getByTestId("seats-table")).toBeVisible();

  const codes = await listedSeatCodes(page);
  expect(codes.length, "the system holds seats").toBeGreaterThan(0);
  await expect(page.getByTestId("seats-empty")).toHaveCount(0);

  let occupiedCount = 0;
  let vacantCount = 0;

  for (const code of codes) {
    await expect(page.getByTestId(`seats-row-${code}`)).toBeVisible();
    const state = await seatRowState(page, code);

    expect(state.code, `${code} shows seat code`).toBe(code);
    expect(state.room, `${code} shows room code`).not.toBe("");
    expect(["OCCUPIED", "VACANT"], `${code} shows valid derived status`).toContain(state.status);

    if (state.status === "VACANT") {
      vacantCount += 1;
      expect(state.occupant, `${code} vacant seat displays 'no occupant'`).toBe("no occupant");
      await expect(page.getByTestId(`seats-row-${code}-assign`), `${code} vacant seat has assign control`).toBeVisible();
      await expect(page.getByTestId(`seats-row-${code}-release`), `${code} vacant seat has no release control`).toHaveCount(0);
    } else {
      occupiedCount += 1;
      expect(state.occupant, `${code} occupied seat displays occupant name`).not.toBe("");
      expect(state.occupant, `${code} occupied seat is not 'no occupant'`).not.toBe("no occupant");
      await expect(page.getByTestId(`seats-row-${code}-release`), `${code} occupied seat has release control`).toBeVisible();
      await expect(page.getByTestId(`seats-row-${code}-assign`), `${code} occupied seat has no assign control`).toHaveCount(0);
    }
  }

  // The Given: at least one seat with an occupant and at least one without
  expect(occupiedCount, "at least one seat has an occupant").toBeGreaterThan(0);
  expect(vacantCount, "at least one seat is vacant").toBeGreaterThan(0);
});

test("AC-2: an occupant is assigned to a vacant seat without reloading", async ({ page }) => {
  await page.goto("/seats");
  const codes = await listedSeatCodes(page);

  // Find a vacant seat
  let targetCode: string | null = null;
  for (const code of [...codes].reverse()) {
    const s = await seatRowState(page, code);
    if (s.status === "VACANT") {
      targetCode = code;
      break;
    }
  }
  expect(targetCode, "a vacant seat exists").not.toBeNull();

  const members = await memberOptionsFromSeat(page, targetCode!);
  expect(members.length, "members exist").toBeGreaterThan(0);
  const chosenMember = members[0]!;

  const beforeStates = new Map<string, SeatRowInfo>();
  for (const c of codes) {
    beforeStates.set(c, await seatRowState(page, c));
  }

  // Assign without page reload
  await assignOccupant(page, targetCode!, chosenMember.label);

  const afterState = await seatRowState(page, targetCode!);
  expect(afterState.occupant, "that seat's occupant is that member").toBe(chosenMember.label);
  expect(afterState.status, "status is OCCUPIED without reload").toBe("OCCUPIED");
  await expect(page.getByTestId(`seats-row-${targetCode}-release`)).toBeVisible();
  await expect(page.getByTestId(`seats-row-${targetCode}-assign`)).toHaveCount(0);

  // "And no other seat's occupant changes"
  for (const c of codes) {
    if (c === targetCode) continue;
    const s = await seatRowState(page, c);
    expect(s.occupant, `seat ${c} occupant unchanged`).toBe(beforeStates.get(c)!.occupant);
  }

  // Restore state
  await releaseOccupant(page, targetCode!);
});

test("AC-4: one member is assigned to multiple seats without refusal — INV-02", async ({ page }) => {
  await page.goto("/seats");
  const codes = await listedSeatCodes(page);

  // Find an occupied seat S1
  let s1Code: string | null = null;
  let occupantName: string | null = null;
  for (const code of codes) {
    const s = await seatRowState(page, code);
    if (s.status === "OCCUPIED") {
      s1Code = code;
      occupantName = s.occupant;
      break;
    }
  }
  expect(s1Code, "an occupied seat S1 exists").not.toBeNull();
  expect(occupantName, "occupant name found").not.toBeNull();

  // Find a vacant seat S2
  let s2Code: string | null = null;
  for (const code of [...codes].reverse()) {
    const s = await seatRowState(page, code);
    if (s.status === "VACANT") {
      s2Code = code;
      break;
    }
  }
  expect(s2Code, "a vacant seat S2 exists").not.toBeNull();

  // Assign occupantName to S2
  await assignOccupant(page, s2Code!, occupantName!);

  const s1After = await seatRowState(page, s1Code!);
  const s2After = await seatRowState(page, s2Code!);

  expect(s1After.occupant, "S1 occupant is unchanged").toBe(occupantName);
  expect(s1After.status, "S1 status still OCCUPIED").toBe("OCCUPIED");
  expect(s2After.occupant, "S2 occupant is also member A — INV-02").toBe(occupantName);
  expect(s2After.status, "S2 status is OCCUPIED").toBe("OCCUPIED");

  // Restore state
  await releaseOccupant(page, s2Code!);
});

test("AC-5: an occupant is released from a seat without reloading", async ({ page }) => {
  await page.goto("/seats");
  const codes = await listedSeatCodes(page);

  // Setup: pick a vacant seat and assign someone so we can release it safely
  let targetCode: string | null = null;
  for (const code of [...codes].reverse()) {
    const s = await seatRowState(page, code);
    if (s.status === "VACANT") {
      targetCode = code;
      break;
    }
  }
  expect(targetCode).not.toBeNull();

  const members = await memberOptionsFromSeat(page, targetCode!);
  await assignOccupant(page, targetCode!, members[0]!.label);
  expect((await seatRowState(page, targetCode!)).status).toBe("OCCUPIED");

  const beforeStates = new Map<string, SeatRowInfo>();
  for (const c of codes) {
    beforeStates.set(c, await seatRowState(page, c));
  }

  // Act: release seat
  await releaseOccupant(page, targetCode!);

  const afterState = await seatRowState(page, targetCode!);
  expect(afterState.occupant, "seat has no occupant").toBe("no occupant");
  expect(afterState.status, "seat status shows VACANT").toBe("VACANT");
  await expect(page.getByTestId(`seats-row-${targetCode}-assign`)).toBeVisible();
  await expect(page.getByTestId(`seats-row-${targetCode}-release`)).toHaveCount(0);

  // No other seat's occupant changes
  for (const c of codes) {
    if (c === targetCode) continue;
    const s = await seatRowState(page, c);
    expect(s.occupant, `seat ${c} occupant unchanged`).toBe(beforeStates.get(c)!.occupant);
  }
});

test("AC-6: releasing an occupant on /seats downgrades primary device to SECONDARY on /devices — INV-06", async ({ page }, testInfo) => {
  const tag = tagFor("AC6-E2E", testInfo.retry);

  // 1. On /seats, find a vacant seat and assign a member
  await page.goto("/seats");
  const codes = await listedSeatCodes(page);
  let seatCode: string | null = null;
  for (const code of [...codes].reverse()) {
    if ((await seatRowState(page, code)).status === "VACANT") {
      seatCode = code;
      break;
    }
  }
  expect(seatCode, "vacant seat found").not.toBeNull();

  const members = await memberOptionsFromSeat(page, seatCode!);
  const member = members[0]!;
  await assignOccupant(page, seatCode!, member.label);

  // 2. On /devices, create a device owned by member
  await page.goto("/devices");
  await page.getByTestId("devices-create-open").click();
  await expect(page.getByTestId("device-create-dialog")).toBeVisible();
  await page.getByTestId("device-create-tag").fill(tag);
  await page.getByTestId("device-create-model").fill("QA model AC6 e2e");
  await page.getByTestId("device-create-owner").selectOption({ label: member.label });
  await page.getByTestId("device-create-submit").click();
  await expect(page.getByTestId(`devices-row-${tag}`)).toBeVisible();

  // 3. Assign device to seatCode
  await page.getByTestId(`devices-row-${tag}-assign`).click();
  await expect(page.getByTestId("device-assign-dialog")).toBeVisible();
  const seatOption = (await optionsOf(page, "device-assign-seat")).find((o) => o.label.includes(seatCode!));
  expect(seatOption, "seat option found").toBeDefined();
  await page.getByTestId("device-assign-seat").selectOption(seatOption!.value);
  await page.getByTestId("device-assign-submit").click();
  await expect(page.getByTestId("device-assign-dialog")).toBeHidden();
  await expect(page.getByTestId(`devices-row-${tag}-seat`)).toHaveText(seatCode!);
  await expect(page.getByTestId(`devices-row-${tag}-occupant`)).toHaveText(member.label);

  // 4. Designate primary
  await page.getByTestId(`devices-row-${tag}-primary`).click();
  await expect(page.getByTestId(`devices-row-${tag}-rank`)).toHaveText("PRIMARY");

  // 5. Go to /seats and release the seat
  await page.goto("/seats");
  await releaseOccupant(page, seatCode!);

  // 6. Go to /devices and verify rank is now SECONDARY (INV-06)
  await page.goto("/devices");
  await expect(page.getByTestId(`devices-row-${tag}-rank`), "downgraded to SECONDARY — INV-06").toHaveText("SECONDARY");
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "still assigned to same seat").toHaveText(seatCode!);
  await expect(page.getByTestId(`devices-row-${tag}-owner`), "owner unchanged").toHaveText(member.label);

  // Teardown: delete device
  await page.getByTestId(`devices-row-${tag}-delete`).click();
  await expect(page.getByTestId("device-delete-dialog")).toBeVisible();
  await page.getByTestId("device-delete-confirm").click();
  await expect(page.getByTestId(`devices-row-${tag}`)).toHaveCount(0);
});

test("AC-9: assignment is refused when no member is chosen", async ({ page }) => {
  await page.goto("/seats");
  const codes = await listedSeatCodes(page);

  let targetCode: string | null = null;
  for (const code of [...codes].reverse()) {
    if ((await seatRowState(page, code)).status === "VACANT") {
      targetCode = code;
      break;
    }
  }
  expect(targetCode).not.toBeNull();

  await page.getByTestId(`seats-row-${targetCode}-assign`).click();
  await expect(page.getByTestId("seat-assign-dialog")).toBeVisible();

  // Submit with empty placeholder
  await page.getByTestId("seat-assign-occupant").selectOption("");
  await page.getByTestId("seat-assign-submit").click();

  await expect(page.getByTestId("seat-assign-occupant-error")).toBeVisible();
  await expect(page.getByTestId("seat-assign-dialog")).toBeVisible();

  // Cancel dialog
  await page.getByTestId("seat-assign-cancel").click();
  await expect(page.getByTestId("seat-assign-dialog")).toBeHidden();

  // Seat is still vacant
  expect((await seatRowState(page, targetCode!)).occupant).toBe("no occupant");
  expect((await seatRowState(page, targetCode!)).status).toBe("VACANT");
});

test("AC-10: seat status is derived and never set directly across transitions — INV-03", async ({ page }) => {
  await page.goto("/seats");

  // Section 6: no control anywhere on this surface sets or modifies status
  await expect(page.getByRole("button", { name: /set status|change status|vacant|occupied/i })).toHaveCount(0);

  const codes = await listedSeatCodes(page);
  let targetCode: string | null = null;
  for (const code of [...codes].reverse()) {
    if ((await seatRowState(page, code)).status === "VACANT") {
      targetCode = code;
      break;
    }
  }
  expect(targetCode).not.toBeNull();

  const members = await memberOptionsFromSeat(page, targetCode!);
  expect(members.length).toBeGreaterThanOrEqual(2);
  const member1 = members[0]!;
  const member2 = members[1]!;

  // 1. Initial vacant
  expect((await seatRowState(page, targetCode!)).status).toBe("VACANT");

  // 2. Assign member 1 -> OCCUPIED
  await assignOccupant(page, targetCode!, member1.label);
  expect((await seatRowState(page, targetCode!)).status).toBe("OCCUPIED");

  // 3. Release -> VACANT
  await releaseOccupant(page, targetCode!);
  expect((await seatRowState(page, targetCode!)).status).toBe("VACANT");

  // 4. Assign member 2 -> OCCUPIED
  await assignOccupant(page, targetCode!, member2.label);
  expect((await seatRowState(page, targetCode!)).status).toBe("OCCUPIED");

  // Teardown: release
  await releaseOccupant(page, targetCode!);
  expect((await seatRowState(page, targetCode!)).status).toBe("VACANT");
});
