import { expect, test, type Page } from "@playwright/test";

// ROO-01 — Room CRUD UI. Acceptance criteria from `01-story.md`, selectors from `02-design.md`
// section 6 and nowhere else (RULE-05). `src/**` was not read to write this file.
//
// Rows are keyed by room `code`, not by id — section 6, "Rows are keyed by room `code`". Every room
// this suite addresses is therefore either a room the test created (so the test supplies the code)
// or a room the test discovered from the rendered `-code` cells. No fixture identifier is hardcoded,
// because QA is not permitted to read the file that defines them.

// The mock store lives in the server process and survives across tests in a run, and across runs
// when `reuseExistingServer` is on. Codes are therefore made unique per run, per test and per retry,
// so no two creations ever collide. `code` must match `^[A-Z0-9-]+$` (section 6).
// The mock store is a single mutable in-memory collection behind one server process, so these tests
// share state rather than owning it. They run serially for that reason: a list-unchanged assertion is
// not meaningful while another worker is creating and deleting rooms against the same array. AC-6 is
// declared last so that its blocked Given (see 06-test-report.md) skips nothing after it.
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36).toUpperCase();

// The seeded room AC-6 and AC-14 name, and the seat count AC-6 states it holds. Both are setup data
// the story hands QA on purpose: seat creation is out-of-scope item 1 so this room cannot be built
// here, and RULE-05 keeps `fixtures.ts` out of reach so the number cannot be looked up. They are
// quoted from AC-6, not discovered, and tests/unit/rooms.test.ts quotes the same two values.
const SEEDED_ROOM_WITH_SEATS = "ROOM-A";
const SEEDED_ROOM_SEAT_COUNT = 6;


function codeFor(tag: string, retry: number): string {
  return `QA-${tag}-${RUN}-${retry}`;
}

/**
 * Every room code currently listed, read from the `rooms-row-<code>-code` cells.
 *
 * The `-code` suffix is unambiguous: it is lowercase and a room code is not, so no room's own code
 * can produce a false match on the suffix.
 */
async function listedCodes(page: Page): Promise<string[]> {
  const cells = page.locator('[data-testid^="rooms-row-"][data-testid$="-code"]');
  const texts = await cells.allInnerTexts();
  return texts.map((t) => t.trim()).filter((t) => t.length > 0);
}

async function openCreateDialog(page: Page): Promise<void> {
  await page.getByTestId("rooms-create-open").click();
  await expect(page.getByTestId("room-create-dialog")).toBeVisible();
}

async function fillCreateForm(
  page: Page,
  fields: { name: string; code: string; width: string; height: string }
): Promise<void> {
  await page.getByTestId("room-create-name").fill(fields.name);
  await page.getByTestId("room-create-code").fill(fields.code);
  await page.getByTestId("room-create-grid-width").fill(fields.width);
  await page.getByTestId("room-create-grid-height").fill(fields.height);
}

async function createRoom(
  page: Page,
  fields: { name: string; code: string; width: string; height: string }
): Promise<void> {
  await openCreateDialog(page);
  await fillCreateForm(page, fields);
  await page.getByTestId("room-create-submit").click();
  await expect(page.getByTestId(`rooms-row-${fields.code}`)).toBeVisible();
}

/** Open a room's delete confirmation and return the seat count it names, leaving the dialog open. */
async function openDeleteDialog(page: Page, code: string): Promise<number> {
  await page.getByTestId(`rooms-row-${code}-delete`).click();
  await expect(page.getByTestId("room-delete-dialog")).toBeVisible();
  const raw = (await page.getByTestId("room-delete-seat-count").innerText()).trim();
  expect(raw, `room-delete-seat-count for ${code} is a bare integer`).toMatch(/^\d+$/);
  return Number(raw);
}

/** Seat counts for every listed room, by code. Opens and cancels each confirmation; deletes nothing. */
async function seatCountsByCode(page: Page): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const code of await listedCodes(page)) {
    counts.set(code, await openDeleteDialog(page, code));
    await page.getByTestId("room-delete-cancel").click();
    await expect(page.getByTestId("room-delete-dialog")).toBeHidden();
  }
  return counts;
}

test("AC-1: every room the system holds is listed, with a control to create one", async ({ page }) => {
  await page.goto("/rooms");

  await expect(page.getByTestId("rooms-page")).toBeVisible();
  await expect(page.getByTestId("rooms-table")).toBeVisible();
  await expect(page.getByTestId("rooms-create-open")).toBeVisible();

  // "Given the system holds more than one room" — the seed does, so the empty state is not reachable
  // here and `rooms-empty` is deliberately not asserted. See 05-test-plan.md, "Out of scope".
  const codes = await listedCodes(page);
  expect(codes.length, "the system holds more than one room").toBeGreaterThan(1);
  await expect(page.getByTestId("rooms-empty")).toHaveCount(0);

  // "each identified by its name" — every listed row carries a non-empty name.
  for (const code of codes) {
    await expect(page.getByTestId(`rooms-row-${code}`)).toBeVisible();
    await expect(page.getByTestId(`rooms-row-${code}-name`)).not.toBeEmpty();
  }
});

test("AC-2: a room is created from all four of its required fields", async ({ page }, testInfo) => {
  const code = codeFor("AC2", testInfo.retry);
  const name = `QA create ${code}`;

  await page.goto("/rooms");
  const before = await listedCodes(page);
  expect(before).not.toContain(code);

  await openCreateDialog(page);
  await fillCreateForm(page, { name, code, width: "4", height: "3" });
  await page.getByTestId("room-create-submit").click();

  // "without my having to reload the page" — no goto and no reload between the submit and this
  // assertion, so the row can only appear because the page updated itself.
  await expect(page.getByTestId(`rooms-row-${code}`)).toBeVisible();
  await expect(page.getByTestId(`rooms-row-${code}-name`)).toHaveText(name);
  await expect(page.getByTestId(`rooms-row-${code}-code`)).toHaveText(code);
  await expect(page.getByTestId(`rooms-row-${code}-grid`)).toHaveText("4 x 3");
});

test("AC-3: creation is refused when a required field is missing or blank", async ({ page }, testInfo) => {
  const code = codeFor("AC3", testInfo.retry);

  await page.goto("/rooms");
  const before = await listedCodes(page);

  await openCreateDialog(page);

  // Name whitespace-only, code empty, both dimensions absent. Section 6: each `-error` element is
  // absent until its field is rejected, so these are asserted individually rather than by count.
  await fillCreateForm(page, { name: "   ", code: "", width: "", height: "" });
  await page.getByTestId("room-create-submit").click();

  await expect(page.getByTestId("room-create-name-error")).toBeVisible();
  await expect(page.getByTestId("room-create-code-error")).toBeVisible();
  await expect(page.getByTestId("room-create-grid-width-error")).toBeVisible();
  await expect(page.getByTestId("room-create-grid-height-error")).toBeVisible();
  await expect(page.getByTestId("room-create-dialog")).toBeVisible();

  // A whitespace-only code is refused for the same reason a whitespace-only name is.
  await fillCreateForm(page, { name: "QA blank code", code: "   ", width: "2", height: "2" });
  await page.getByTestId("room-create-submit").click();
  await expect(page.getByTestId("room-create-code-error")).toBeVisible();

  await page.getByTestId("room-create-cancel").click();
  await expect(page.getByTestId("room-create-dialog")).toBeHidden();

  expect(await listedCodes(page), "the room list is unchanged").toEqual(before);
  await expect(page.getByTestId(`rooms-row-${code}`)).toHaveCount(0);
});

test("AC-4: an existing room is renamed, and nothing else about it changes", async ({ page }, testInfo) => {
  const code = codeFor("AC4", testInfo.retry);

  await page.goto("/rooms");
  await createRoom(page, { name: `QA before ${code}`, code, width: "5", height: "6" });
  const before = await listedCodes(page);

  const renamed = `QA after ${code}`;
  await page.getByTestId(`rooms-row-${code}-edit`).click();
  await expect(page.getByTestId("room-edit-dialog")).toBeVisible();
  await page.getByTestId("room-edit-name").fill(renamed);
  await page.getByTestId("room-edit-submit").click();
  await expect(page.getByTestId("room-edit-dialog")).toBeHidden();

  await expect(page.getByTestId(`rooms-row-${code}-name`)).toHaveText(renamed);
  await expect(page.getByTestId(`rooms-row-${code}-code`)).toHaveText(code);
  await expect(page.getByTestId(`rooms-row-${code}-grid`)).toHaveText("5 x 6");
  expect(await listedCodes(page), "the number of rooms is unchanged").toEqual(before);
});

test("AC-4 (refusal): a rename to a blank name is refused", async ({ page }, testInfo) => {
  // AC-4's "a different name that is not blank" implies the blank case is refused. Asserted here
  // rather than assumed, because a rename path with no refusal passes when the check is deleted.
  const code = codeFor("AC4R", testInfo.retry);
  const name = `QA keep ${code}`;

  await page.goto("/rooms");
  await createRoom(page, { name, code, width: "2", height: "2" });

  await page.getByTestId(`rooms-row-${code}-edit`).click();
  await expect(page.getByTestId("room-edit-dialog")).toBeVisible();
  await page.getByTestId("room-edit-name").fill("   ");
  await page.getByTestId("room-edit-submit").click();

  await expect(page.getByTestId("room-edit-name-error")).toBeVisible();
  await page.getByTestId("room-edit-cancel").click();
  await expect(page.getByTestId("room-edit-dialog")).toBeHidden();
  await expect(page.getByTestId(`rooms-row-${code}-name`)).toHaveText(name);
});

test("AC-5: a room containing no seats is deleted, after a confirmation naming zero", async ({ page }, testInfo) => {
  const code = codeFor("AC5", testInfo.retry);

  await page.goto("/rooms");
  // A room created on this surface has no seats — seat creation is out of scope (item 1), so this
  // is the only way to reach AC-5's "a room that contains no seats" without addressing a fixture.
  await createRoom(page, { name: `QA empty ${code}`, code, width: "2", height: "2" });
  const before = await listedCodes(page);

  const count = await openDeleteDialog(page, code);
  expect(count, "no seats will be lost").toBe(0);
  await expect(page.getByTestId("room-delete-message")).toBeVisible();

  await page.getByTestId("room-delete-confirm").click();
  await expect(page.getByTestId("room-delete-dialog")).toBeHidden();
  await expect(page.getByTestId(`rooms-row-${code}`)).toHaveCount(0);

  const after = await listedCodes(page);
  expect(after, "no other room is affected").toEqual(before.filter((c) => c !== code));
});

test("AC-7: deletion is not performed until it is confirmed", async ({ page }) => {
  await page.goto("/rooms");
  const counts = await seatCountsByCode(page);

  // "a room exists that contains at least one seat" — discovered through the confirmation dialog,
  // which is the only channel section 6 gives QA for a seat count.
  const occupied = [...counts].filter(([, n]) => n > 0);
  expect(occupied.length, "a seeded room contains at least one seat").toBeGreaterThan(0);

  const [code, seats] = occupied[0]!;
  const before = await listedCodes(page);

  expect(await openDeleteDialog(page, code)).toBe(seats);
  await page.getByTestId("room-delete-cancel").click();
  await expect(page.getByTestId("room-delete-dialog")).toBeHidden();

  await expect(page.getByTestId(`rooms-row-${code}`)).toBeVisible();
  expect(await listedCodes(page)).toEqual(before);

  // "every seat it contained still exists" — devices and seats have no surface here (out-of-scope
  // item 1), so the count the confirmation names is the only observable the story leaves QA.
  expect(await openDeleteDialog(page, code), "every seat it contained still exists").toBe(seats);
  await page.getByTestId("room-delete-cancel").click();
  await expect(page.getByTestId("room-delete-dialog")).toBeHidden();
});

test("AC-12: creation is refused when the code is already in use", async ({ page }) => {
  const code = "R-101";

  await page.goto("/rooms");
  // "Given a room exists whose code is R-101" — created here if the seed does not already hold it.
  if (!(await listedCodes(page)).includes(code)) {
    await createRoom(page, { name: "QA duplicate-code holder", code, width: "3", height: "3" });
  }
  const before = await listedCodes(page);

  await openCreateDialog(page);
  await fillCreateForm(page, { name: "QA second R-101", code, width: "4", height: "4" });
  await page.getByTestId("room-create-submit").click();

  await expect(page.getByTestId("room-create-code-error")).toBeVisible();
  await expect(page.getByTestId("room-create-code-error")).toContainText(/already in use/i);
  await expect(page.getByTestId("room-create-dialog")).toBeVisible();

  await page.getByTestId("room-create-cancel").click();
  await expect(page.getByTestId("room-create-dialog")).toBeHidden();
  expect(await listedCodes(page), "the room list is unchanged").toEqual(before);
});

test("AC-13: creation is refused when a grid dimension is not a positive whole number", async ({ page }, testInfo) => {
  const code = codeFor("AC13", testInfo.retry);

  await page.goto("/rooms");
  const before = await listedCodes(page);
  await openCreateDialog(page);

  const cases: Array<{ width: string; height: string; error: string; why: string }> = [
    { width: "0", height: "3", error: "room-create-grid-width-error", why: "zero width" },
    { width: "-2", height: "3", error: "room-create-grid-width-error", why: "negative width" },
    { width: "1.5", height: "3", error: "room-create-grid-width-error", why: "fractional width" },
    { width: "3", height: "0", error: "room-create-grid-height-error", why: "zero height" },
    { width: "3", height: "-2", error: "room-create-grid-height-error", why: "negative height" },
    { width: "3", height: "2.5", error: "room-create-grid-height-error", why: "fractional height" },
  ];

  for (const c of cases) {
    await fillCreateForm(page, { name: `QA ${c.why}`, code, width: c.width, height: c.height });
    await page.getByTestId("room-create-submit").click();
    await expect(page.getByTestId(c.error), c.why).toBeVisible();
    await expect(page.getByTestId("room-create-dialog"), c.why).toBeVisible();
  }

  await page.getByTestId("room-create-cancel").click();
  await expect(page.getByTestId("room-create-dialog")).toBeHidden();
  expect(await listedCodes(page), "the room list is unchanged").toEqual(before);
  await expect(page.getByTestId(`rooms-row-${code}`)).toHaveCount(0);
});

test("AC-6: the confirmation names the seat count, and nothing is destroyed until it is confirmed — INV-11", async ({ page }) => {
  // AC-6's Given: "a room exists that contains at least one seat, and N is the number of seats it
  // contains. And the seeded room whose code is ROOM-A is such a room, with six seats."
  await page.goto("/rooms");
  const codes = await listedCodes(page);
  expect(codes, "the seeded room AC-6 names is listed").toContain(SEEDED_ROOM_WITH_SEATS);

  // "a confirmation is presented that names the number of seats that will be permanently lost, and
  // that number is N — six for ROOM-A"
  const named = await openDeleteDialog(page, SEEDED_ROOM_WITH_SEATS);
  expect(named, `the confirmation names N for ${SEEDED_ROOM_WITH_SEATS}`).toBe(SEEDED_ROOM_SEAT_COUNT);
  await expect(page.getByTestId("room-delete-message")).toBeVisible();

  // "at that point neither the room nor any seat has been deleted"
  await page.getByTestId("room-delete-cancel").click();
  await expect(page.getByTestId("room-delete-dialog")).toBeHidden();
  await expect(page.getByTestId(`rooms-row-${SEEDED_ROOM_WITH_SEATS}`)).toBeVisible();
  expect(await listedCodes(page)).toEqual(codes);
  expect(
    await openDeleteDialog(page, SEEDED_ROOM_WITH_SEATS),
    "no seat has been deleted"
  ).toBe(SEEDED_ROOM_SEAT_COUNT);
  await page.getByTestId("room-delete-cancel").click();
  await expect(page.getByTestId("room-delete-dialog")).toBeHidden();

  // The rest of AC-6 — confirming, and the room and all N of its seats being permanently deleted —
  // is `AC-6: confirming the delete destroys the room and all N of its seats` in
  // tests/unit/rooms.test.ts. It cannot run here: `pnpm test:e2e` drives one server holding one
  // mutable store, spec files run in parallel against it, and destroying ROOM-A would remove the
  // seeded rows and seats that tests/e2e/smoke.spec.ts asserts on. Making that ordering deterministic
  // is a playwright.config.ts change, which is outside this ticket's allowed_paths. 05-test-plan.md
  // and 06-test-report.md both carry this split and what it leaves uncovered.
  //
  // The UI confirm path itself is exercised — by AC-5, against a room holding no seats.
});
