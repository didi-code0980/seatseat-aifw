import { expect, test, type Page } from "@playwright/test";

// DEV-01 — Device CRUD UI. Acceptance criteria from `01-story.md`, selectors from `02-design.md`
// section 6 and nowhere else (RULE-05). `src/**` was not read to write this file.
//
// Rows are keyed by device `assetTag`, not by id — section 6. Every device this suite addresses is
// one it created, so the key is a value the test supplied. No fixture identifier is hardcoded.
//
// Two constraints this file did not choose; section 6.2 imposes both.
//
// 1. Serial mode. `playwright.config.ts` sets `fullyParallel: true` and one production server holds
//    one mutable store. AC-6, AC-8 and AC-9 all assert that nothing else moved, which is not
//    meaningful while another worker is writing to the same array.
// 2. Nothing seeded is mutated. Spec files still run against the server concurrently, and
//    `tests/e2e/smoke.spec.ts` asserts on a seeded unassigned device. Every test below therefore
//    builds its own Given and deletes what it created, so the surface it leaves behind is the
//    surface it found. That second half matters more than it looks: a test that leaves a device
//    PRIMARY on a seat removes the Given the next test needs.

test.describe.configure({ mode: "serial" });

/** Unique per run, so a store surviving between runs cannot collide on the `@unique` asset tag. */
const RUN = Date.now().toString(36).toUpperCase();

/** Section 6's advice on test data: the seed's own shape, and a single token, so a testid is one. */
function tagFor(label: string, retry: number): string {
  return `AST-QA-${RUN}-${label}-${retry}`;
}

type SeatOption = { value: string; label: string; code: string; room: string; occupant: string | null };
type MemberOption = { value: string; label: string };

// AC-8's message and AC-10's, captured where they are raised so the last test can assert they are
// not the same sentence. `01-story.md` says in terms that this is where the defect lives.
let ownerMismatchMessage: string | null = null;

/** Every asset tag currently listed, read from the `devices-row-<tag>-tag` cells. */
async function listedTags(page: Page): Promise<string[]> {
  const cells = page.locator('[data-testid^="devices-row-"][data-testid$="-tag"]');
  return (await cells.allInnerTexts()).map((t) => t.trim()).filter((t) => t.length > 0);
}

async function cellText(page: Page, tag: string, cell: string): Promise<string> {
  return (await page.getByTestId(`devices-row-${tag}-${cell}`).innerText()).trim();
}

/** The whole visible state of one row — what every "unchanged" clause in the story is about. */
async function rowState(page: Page, tag: string) {
  return {
    model: await cellText(page, tag, "model"),
    owner: await cellText(page, tag, "owner"),
    seat: await cellText(page, tag, "seat"),
    rank: await cellText(page, tag, "rank"),
    occupant: await cellText(page, tag, "occupant"),
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

async function openCreateDialog(page: Page): Promise<void> {
  await page.getByTestId("devices-create-open").click();
  await expect(page.getByTestId("device-create-dialog")).toBeVisible();
}

/** The members the system holds, read from the owner picker — section 6, "value is the member id". */
async function memberOptions(page: Page): Promise<MemberOption[]> {
  await openCreateDialog(page);
  const all = await optionsOf(page, "device-create-owner");
  await page.getByTestId("device-create-cancel").click();
  await expect(page.getByTestId("device-create-dialog")).toBeHidden();
  // The first option is the placeholder, `value=""` — section 6 and 1.3. It is not a member.
  return all.filter((o) => o.value !== "");
}

/**
 * Create a device through the surface and return once its row is on the page.
 *
 * `ownerLabel` is a member's full name, because that is what the story names an owner by and what
 * section 6 says the option label carries. The id is looked up from the picker, never quoted.
 */
async function createDevice(
  page: Page,
  fields: { tag: string; model: string; ownerLabel: string }
): Promise<void> {
  await openCreateDialog(page);
  await page.getByTestId("device-create-tag").fill(fields.tag);
  await page.getByTestId("device-create-model").fill(fields.model);
  await page.getByTestId("device-create-owner").selectOption({ label: fields.ownerLabel });
  await page.getByTestId("device-create-submit").click();
  await expect(page.getByTestId(`devices-row-${fields.tag}`)).toBeVisible();
}

/**
 * The seats the system holds, read from the assign picker's option labels.
 *
 * Section 6 makes the label format contractual — `<SEAT-CODE> (<ROOM-CODE>) — <occupant full name>`
 * or `... — no occupant` — precisely so that AC-7's, AC-8's and AC-10's Givens are constructible
 * without QA reading the seed. This parser is the only place that format is relied on.
 */
async function seatOptions(page: Page, tagWithAssignControl: string): Promise<SeatOption[]> {
  await page.getByTestId(`devices-row-${tagWithAssignControl}-assign`).click();
  await expect(page.getByTestId("device-assign-dialog")).toBeVisible();
  const all = await optionsOf(page, "device-assign-seat");
  await page.getByTestId("device-assign-cancel").click();
  await expect(page.getByTestId("device-assign-dialog")).toBeHidden();

  return all
    .filter((o) => o.value !== "")
    .map((o) => {
      const m = /^(\S+)\s*\(([^)]*)\)\s*[—–-]\s*(.+)$/.exec(o.label);
      expect(m, `seat option label is in the format section 6 specifies: ${JSON.stringify(o.label)}`).not.toBeNull();
      const [, code, room, tail] = m!;
      return {
        value: o.value,
        label: o.label,
        code: code!,
        room: room!,
        occupant: tail!.trim() === "no occupant" ? null : tail!.trim(),
      };
    });
}

async function assignTo(page: Page, tag: string, seat: SeatOption): Promise<void> {
  await page.getByTestId(`devices-row-${tag}-assign`).click();
  await expect(page.getByTestId("device-assign-dialog")).toBeVisible();
  await page.getByTestId("device-assign-seat").selectOption(seat.value);
  await page.getByTestId("device-assign-submit").click();
  await expect(page.getByTestId("device-assign-dialog")).toBeHidden();
  await expect(page.getByTestId(`devices-row-${tag}-seat`)).toHaveText(seat.code);
}

async function makePrimary(page: Page, tag: string): Promise<void> {
  await page.getByTestId(`devices-row-${tag}-primary`).click();
  await expect(page.getByTestId(`devices-row-${tag}-rank`)).toHaveText("PRIMARY");
}

/**
 * Point a device at a different owner through the edit dialog.
 *
 * Several Givens need a device owned by a particular member — AC-7 and AC-11 need the occupant of
 * a seat discovered at run time, AC-8 needs someone who is explicitly not that occupant. The create
 * form takes an owner, but the occupant is only knowable after the seat picker has been read, and
 * the seat picker is only reachable from a device that already exists. So the owner is set here.
 */
async function setOwner(page: Page, tag: string, ownerLabel: string): Promise<void> {
  await page.getByTestId(`devices-row-${tag}-edit`).click();
  await expect(page.getByTestId("device-edit-dialog")).toBeVisible();
  await page.getByTestId("device-edit-owner").selectOption({ label: ownerLabel });
  await page.getByTestId("device-edit-submit").click();
  await expect(page.getByTestId("device-edit-dialog")).toBeHidden();
  await expect(page.getByTestId(`devices-row-${tag}-owner`)).toHaveText(ownerLabel);
}

/**
 * How many devices the list shows as PRIMARY on one seat. INV-04 is a count, and this is the only
 * way to take it from outside: the seat and rank cells of every row, zipped by position.
 */
async function primaryCountOn(page: Page, seatCode: string): Promise<number> {
  const seatTexts = (await page.locator('[data-testid^="devices-row-"][data-testid$="-seat"]').allInnerTexts())
    .map((t) => t.trim());
  const rankTexts = (await page.locator('[data-testid^="devices-row-"][data-testid$="-rank"]').allInnerTexts())
    .map((t) => t.trim());
  expect(seatTexts.length, "one seat cell and one rank cell per row").toBe(rankTexts.length);
  return seatTexts.filter((s, i) => s === seatCode && rankTexts[i] === "PRIMARY").length;
}

/**
 * Delete a device through the surface, confirmation and all.
 *
 * Used as teardown, not as the act under test — AC-12, AC-13 and AC-14 drive the dialog themselves
 * and assert on it. Teardown matters here: section 6.2 forbids leaving the seeded surface changed,
 * and a device left PRIMARY on a seat also removes the Given the next test looks for.
 */
async function deleteDevice(page: Page, tag: string): Promise<void> {
  await page.goto("/devices");
  if ((await page.getByTestId(`devices-row-${tag}`).count()) === 0) return;
  await page.getByTestId(`devices-row-${tag}-delete`).click();
  await expect(page.getByTestId("device-delete-dialog")).toBeVisible();
  await page.getByTestId("device-delete-confirm").click();
  await expect(page.getByTestId(`devices-row-${tag}`)).toHaveCount(0);
}

/**
 * An occupied seat that holds no primary device, and the full name of its occupant.
 *
 * AC-7's Given, and section 6.2 names both halves of the route: the picker's labels identify an
 * occupied seat, and the list's `-seat` and `-rank` cells confirm it holds no primary. It has to
 * hold none, because a seat whose primary is a *seeded* device could not be used without demoting
 * one, and section 6.2 forbids that.
 */
async function occupiedSeatWithoutPrimary(
  page: Page,
  probeTag: string
): Promise<{ seat: SeatOption; occupant: string }> {
  const seats = await seatOptions(page, probeTag);
  const occupied = seats.filter((s) => s.occupant !== null);
  expect(occupied.length, "the system holds a seat with an occupant — 01-story.md A-5").toBeGreaterThan(0);

  const seatCells = page.locator('[data-testid^="devices-row-"][data-testid$="-seat"]');
  const rankCells = page.locator('[data-testid^="devices-row-"][data-testid$="-rank"]');
  const seatTexts = (await seatCells.allInnerTexts()).map((t) => t.trim());
  const rankTexts = (await rankCells.allInnerTexts()).map((t) => t.trim());
  expect(seatTexts.length, "one seat cell and one rank cell per row").toBe(rankTexts.length);

  const seatsHoldingAPrimary = new Set(
    seatTexts.filter((_, i) => rankTexts[i] === "PRIMARY")
  );
  const free = occupied.find((s) => !seatsHoldingAPrimary.has(s.code));
  expect(
    free,
    "an occupied seat that holds no primary device — AC-7 needs one, and section 6.2 forbids demoting a seeded primary to make one"
  ).toBeDefined();
  return { seat: free!, occupant: free!.occupant! };
}

/** A seat with no occupant. AC-10's Given; `01-story.md` A-5 asserts the seed contains one. */
async function vacantSeat(page: Page, probeTag: string): Promise<SeatOption> {
  const seats = await seatOptions(page, probeTag);
  const vacant = seats.find((s) => s.occupant === null);
  expect(vacant, "a seat with no occupant — 01-story.md A-5, and AC-10 has no Given without it").toBeDefined();
  return vacant!;
}

test("AC-1: every device is listed with its owner, its seat, its designation and that seat's occupant", async ({ page }) => {
  await page.goto("/devices");

  await expect(page.getByTestId("devices-page")).toBeVisible();
  await expect(page.getByTestId("devices-table")).toBeVisible();
  // "And a control to create a device is present."
  await expect(page.getByTestId("devices-create-open")).toBeVisible();

  const tags = await listedTags(page);
  // The seed holds devices, so the empty state is unreachable here and `devices-empty` is
  // deliberately not asserted visible. See 05-test-plan.md, "Out of scope for this plan".
  expect(tags.length, "the system holds devices").toBeGreaterThan(0);
  await expect(page.getByTestId("devices-empty")).toHaveCount(0);

  let assigned = 0;
  let unassigned = 0;

  for (const tag of tags) {
    await expect(page.getByTestId(`devices-row-${tag}`), tag).toBeVisible();
    const state = await rowState(page, tag);

    // "each listed device shows its owner" — a name, or the literal `unowned` (section 6).
    expect(state.owner, `${tag} shows an owner`).not.toBe("");

    // "either the seat it is assigned to, or that it is unassigned"
    expect(state.seat, `${tag} shows a seat or says unassigned`).not.toBe("");

    if (state.seat === "unassigned") {
      unassigned += 1;
      // Section 6: rank renders `n/a` for a device with no seat, not `SECONDARY`. That is what keeps
      // AC-2's "not shown as a primary device" distinguishable from AC-5's "shown as a secondary".
      expect(state.rank, `${tag} is unassigned, so it has no designation`).toBe("n/a");
      expect(state.occupant, `${tag} is unassigned, so it has no seat to have an occupant`).toBe("n/a");
    } else {
      assigned += 1;
      // "whether it is that seat's primary device or a secondary device"
      expect(["PRIMARY", "SECONDARY"], `${tag} shows a designation`).toContain(state.rank);
      // "the current occupant of that seat, or that the seat has no occupant"
      expect(state.occupant, `${tag} shows an occupant or says there is none`).not.toBe("");
      expect(state.occupant, `${tag} is on a seat, so n/a is not one of its three cases`).not.toBe("n/a");
    }
  }

  // The Given: "at least one device assigned to a seat and at least one device that is unassigned".
  expect(assigned, "at least one device is assigned to a seat").toBeGreaterThan(0);
  expect(unassigned, "at least one device is unassigned — INV-07").toBeGreaterThan(0);
});

test("AC-2: a device is created into unassigned inventory, owned by the member chosen", async ({ page }, testInfo) => {
  const tag = tagFor("AC2", testInfo.retry);

  await page.goto("/devices");
  const before = await listedTags(page);
  expect(before).not.toContain(tag);

  const owner = (await memberOptions(page))[0]!;

  await openCreateDialog(page);
  await page.getByTestId("device-create-tag").fill(tag);
  await page.getByTestId("device-create-model").fill("QA model AC2");
  await page.getByTestId("device-create-owner").selectOption({ label: owner.label });
  await page.getByTestId("device-create-submit").click();

  // "without my having to reload the page" — no goto and no reload between the submit and these
  // assertions, so the row can only be here because the page updated itself.
  await expect(page.getByTestId(`devices-row-${tag}`)).toBeVisible();
  await expect(page.getByTestId(`devices-row-${tag}-tag`)).toHaveText(tag);
  await expect(page.getByTestId(`devices-row-${tag}-model`)).toHaveText("QA model AC2");
  await expect(page.getByTestId(`devices-row-${tag}-owner`), "owned by the member I chose").toHaveText(owner.label);
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "it is shown as unassigned").toHaveText("unassigned");
  await expect(page.getByTestId(`devices-row-${tag}-rank`), "it is not shown as a primary device").toHaveText("n/a");

  expect((await listedTags(page)).length, "exactly one device was added").toBe(before.length + 1);

  await deleteDevice(page, tag);
});

test("AC-3: creation is refused when a required field is missing or blank", async ({ page }, testInfo) => {
  const tag = tagFor("AC3", testInfo.retry);

  await page.goto("/devices");
  const before = await listedTags(page);

  await openCreateDialog(page);

  // All three of the fields the create form collects, left empty and with no owner chosen. Section 6:
  // each `-error` element is absent until its own field is rejected, so these are asserted
  // individually rather than by counting them.
  await page.getByTestId("device-create-tag").fill("");
  await page.getByTestId("device-create-model").fill("");
  await page.getByTestId("device-create-owner").selectOption("");
  await page.getByTestId("device-create-submit").click();

  await expect(page.getByTestId("device-create-tag-error")).toBeVisible();
  await expect(page.getByTestId("device-create-model-error")).toBeVisible();
  await expect(page.getByTestId("device-create-owner-error"), "no owner chosen is refused, not defaulted").toBeVisible();
  await expect(page.getByTestId("device-create-dialog"), "no device is created").toBeVisible();

  // "consisting only of whitespace" — a separate clause of AC-3 and a separate refusal.
  const owner = (await optionsOf(page, "device-create-owner")).find((o) => o.value !== "")!;
  await page.getByTestId("device-create-tag").fill("   ");
  await page.getByTestId("device-create-model").fill("   ");
  await page.getByTestId("device-create-owner").selectOption(owner.value);
  await page.getByTestId("device-create-submit").click();

  await expect(page.getByTestId("device-create-tag-error"), "a whitespace-only asset tag").toBeVisible();
  await expect(page.getByTestId("device-create-model-error"), "a whitespace-only model").toBeVisible();
  await expect(page.getByTestId("device-create-dialog")).toBeVisible();

  await page.getByTestId("device-create-cancel").click();
  await expect(page.getByTestId("device-create-dialog")).toBeHidden();

  expect(await listedTags(page), "the device list is unchanged").toEqual(before);
  await expect(page.getByTestId(`devices-row-${tag}`)).toHaveCount(0);
});

test("AC-4: an existing device's attributes are changed, and its seat and designation are not", async ({ page }, testInfo) => {
  const tag = tagFor("AC4", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC4 before", ownerLabel: owner.label });

  const probe = await occupiedSeatWithoutPrimary(page, tag);
  await assignTo(page, tag, probe.seat);
  const before = await rowState(page, tag);
  const countBefore = (await listedTags(page)).length;

  await page.getByTestId(`devices-row-${tag}-edit`).click();
  await expect(page.getByTestId("device-edit-dialog")).toBeVisible();
  // "pre-filled with the current value" — section 6. An edit form that opened blank would silently
  // clear whichever field the test did not touch.
  await expect(page.getByTestId("device-edit-tag")).toHaveValue(tag);
  await expect(page.getByTestId("device-edit-model")).toHaveValue("QA model AC4 before");
  await page.getByTestId("device-edit-model").fill("QA model AC4 after");
  await page.getByTestId("device-edit-submit").click();
  await expect(page.getByTestId("device-edit-dialog")).toBeHidden();

  const after = await rowState(page, tag);
  expect(after.model, "the list shows that device with the new value").toBe("QA model AC4 after");
  expect((await listedTags(page)).length, "the number of devices is unchanged").toBe(countBefore);
  expect(after.seat, "its seat assignment is unchanged").toBe(before.seat);
  expect(after.rank, "its designation is unchanged").toBe(before.rank);
  expect(after.owner, "its owner is unchanged").toBe(before.owner);

  await deleteDevice(page, tag);
});

test("AC-5: assigning an unassigned device lands it secondary, and leaves the seat's primary alone — INV-04", async ({ page }, testInfo) => {
  const incumbentTag = tagFor("AC5-INC", testInfo.retry);
  const tag = tagFor("AC5", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag: incumbentTag, model: "QA model AC5 incumbent", ownerLabel: owner.label });

  // The incumbent is built, not looked for. AC-5's last clause is about a seat that already has a
  // primary device, and a run against a seat with none would assert nothing — while a run against a
  // seat whose primary is seeded would have to demote it, which section 6.2 forbids.
  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, incumbentTag);
  await setOwner(page, incumbentTag, occupant);
  await assignTo(page, incumbentTag, seat);
  await makePrimary(page, incumbentTag);

  await createDevice(page, { tag, model: "QA model AC5", ownerLabel: owner.label });
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "the Given: it is unassigned").toHaveText("unassigned");
  // "Present only when the device has no seat" — section 6. The affordance is part of the criterion.
  await expect(page.getByTestId(`devices-row-${tag}-assign`)).toBeVisible();
  await expect(page.getByTestId(`devices-row-${tag}-unassign`)).toHaveCount(0);

  await assignTo(page, tag, seat);

  await expect(page.getByTestId(`devices-row-${tag}-seat`), "assigned to that seat").toHaveText(seat.code);
  await expect(
    page.getByTestId(`devices-row-${tag}-rank`),
    "it is a secondary device, not that seat's primary — assignment does not confer primacy"
  ).toHaveText("SECONDARY");
  await expect(page.getByTestId(`devices-row-${tag}-owner`), "its owner is unchanged").toHaveText(owner.label);
  await expect(
    page.getByTestId(`devices-row-${incumbentTag}-rank`),
    "the device that was already primary on that seat still is — INV-04"
  ).toHaveText("PRIMARY");
  await expect(page.getByTestId(`devices-row-${incumbentTag}-seat`)).toHaveText(seat.code);
  await expect(page.getByTestId(`devices-row-${tag}-unassign`), "now that it has a seat").toBeVisible();

  await deleteDevice(page, tag);
  await deleteDevice(page, incumbentTag);
});

test("AC-6: unassigning returns a device to inventory and strips its primary designation — INV-07, INV-04", async ({ page }, testInfo) => {
  const tag = tagFor("AC6", testInfo.retry);
  const controlTag = tagFor("AC6-CTL", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC6", ownerLabel: owner.label });
  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, tag);

  // The harder half of the criterion: the primacy clause "applies whether or not the device was the
  // seat's primary device before". A primary flag that outlives its assignment is a row neither
  // INV-04 nor INV-05 can be evaluated against.
  await setOwner(page, tag, occupant);
  await assignTo(page, tag, seat);
  await makePrimary(page, tag);

  await createDevice(page, { tag: controlTag, model: "QA model AC6 control", ownerLabel: occupant });
  await assignTo(page, controlTag, seat);

  const ownerBefore = await cellText(page, tag, "owner");
  const control = await rowState(page, controlTag);
  const countBefore = (await listedTags(page)).length;

  await page.getByTestId(`devices-row-${tag}-unassign`).click();

  await expect(page.getByTestId(`devices-row-${tag}`), "it still exists — unassigning is not deleting").toBeVisible();
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "the list shows it as unassigned").toHaveText("unassigned");
  await expect(
    page.getByTestId(`devices-row-${tag}-rank`),
    "it is not a primary device of any seat"
  ).toHaveText("n/a");
  await expect(page.getByTestId(`devices-row-${tag}-owner`), "its owner is unchanged").toHaveText(ownerBefore);
  expect((await listedTags(page)).length, "nothing was created or destroyed").toBe(countBefore);

  // "And no other device changes its seat, its owner, or its primary or secondary designation."
  expect(await rowState(page, controlTag), "the other device on that seat is untouched").toEqual(control);

  await deleteDevice(page, controlTag);
  await deleteDevice(page, tag);
});

test("AC-7: designating a primary demotes the incumbent — INV-04, INV-05", async ({ page }, testInfo) => {
  const first = tagFor("AC7-FIRST", testInfo.retry);
  const second = tagFor("AC7-SECOND", testInfo.retry);
  const control = tagFor("AC7-CTL", testInfo.retry);

  await page.goto("/devices");
  const members = await memberOptions(page);
  await createDevice(page, { tag: first, model: "QA model AC7 first", ownerLabel: members[0]!.label });

  // "the seat's current occupant is that device's owner" — the only state in which the designation
  // is legal. The occupant's name comes from the picker label, which is what makes this Given
  // constructible without reading the seed (section 6, and 01-story.md's note on setup data).
  //
  // Both seats are read here, while `first` is still unassigned: the assign control is present only
  // on a device that has no seat (section 6), so the picker is unreachable through a device this
  // test has already placed.
  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, first);
  const otherSeat = (await seatOptions(page, first)).find((s) => s.code !== seat.code && s.occupant === null);
  expect(otherSeat, "a second seat exists to act as the control").toBeDefined();

  // A device on a different seat, so "no device on any other seat changes its designation" has
  // something to be true of that this suite put there.
  await createDevice(page, { tag: control, model: "QA model AC7 control", ownerLabel: members[0]!.label });
  await assignTo(page, control, otherSeat!);

  await setOwner(page, first, occupant);
  await assignTo(page, first, seat);
  await createDevice(page, { tag: second, model: "QA model AC7 second", ownerLabel: occupant });
  await assignTo(page, second, seat);

  await makePrimary(page, first);
  const controlBefore = await rowState(page, control);
  await expect(page.getByTestId(`devices-row-${first}-rank`), "the Given: the first is primary").toHaveText("PRIMARY");
  const firstOwnerBefore = await cellText(page, first, "owner");

  await page.getByTestId(`devices-row-${second}-primary`).click();

  await expect(page.getByTestId(`devices-row-${second}-rank`), "the list shows it as that seat's primary").toHaveText("PRIMARY");
  await expect(
    page.getByTestId(`devices-row-${first}-rank`),
    "the device that was primary before is now a secondary device of that seat"
  ).toHaveText("SECONDARY");
  await expect(page.getByTestId(`devices-row-${first}-seat`), "and is still assigned to that seat").toHaveText(seat.code);
  await expect(page.getByTestId(`devices-row-${first}-owner`), "and its owner is unchanged").toHaveText(firstOwnerBefore);
  expect(await rowState(page, control), "no device on any other seat changes its designation").toEqual(controlBefore);

  // INV-04 stated directly against the seat the act touched: a designation that added rather than
  // replaced would leave two primaries, and every assertion above would still pass.
  expect(await primaryCountOn(page, seat.code), `${seat.code} holds exactly one primary device — INV-04`).toBe(1);

  await deleteDevice(page, control);
  await deleteDevice(page, second);
  await deleteDevice(page, first);
});

test("AC-8: designation is refused when the owner is not the seat's occupant — INV-05", async ({ page }, testInfo) => {
  const tag = tagFor("AC8", testInfo.retry);

  await page.goto("/devices");
  const members = await memberOptions(page);
  await createDevice(page, { tag, model: "QA model AC8", ownerLabel: members[0]!.label });

  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, tag);
  const stranger = members.find((m) => m.label !== occupant);
  expect(stranger, "a member who is not that seat's occupant — AC-8 has no Given without one").toBeDefined();

  await setOwner(page, tag, stranger!.label);
  await assignTo(page, tag, seat);

  // The Given, read off the surface rather than assumed: this seat has an occupant, and it is not
  // this device's owner.
  await expect(page.getByTestId(`devices-row-${tag}-occupant`)).toHaveText(occupant);
  await expect(page.getByTestId(`devices-row-${tag}-owner`)).toHaveText(stranger!.label);

  const before = await listedTags(page);
  const states = new Map<string, Awaited<ReturnType<typeof rowState>>>();
  for (const t of before) states.set(t, await rowState(page, t));

  await page.getByTestId(`devices-row-${tag}-primary`).click();

  // Section 6: a refused *row action* renders its message page-level, in `devices-action-error`.
  await expect(page.getByTestId("devices-action-error")).toBeVisible();
  ownerMismatchMessage = (await page.getByTestId("devices-action-error").innerText()).trim();
  expect(ownerMismatchMessage, "the message is not empty").not.toBe("");
  expect(ownerMismatchMessage, "and it is about the occupant").toMatch(/occupant/i);

  await expect(page.getByTestId(`devices-row-${tag}-rank`), "it is not designated primary").toHaveText("SECONDARY");

  // "And no device changes its owner, its seat, or its designation."
  expect(await listedTags(page), "no device was created or destroyed").toEqual(before);
  for (const t of before) expect(await rowState(page, t), `${t} is untouched by the refusal`).toEqual(states.get(t));

  await deleteDevice(page, tag);
});

test("AC-9: designation is refused for a device assigned to no seat — INV-04, INV-05", async ({ page }, testInfo) => {
  const tag = tagFor("AC9", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC9", ownerLabel: owner.label });
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "the Given: it is unassigned").toHaveText("unassigned");

  const before = await listedTags(page);
  const states = new Map<string, Awaited<ReturnType<typeof rowState>>>();
  for (const t of before) states.set(t, await rowState(page, t));

  // Section 6: the make-primary control is present on every row, including unassigned ones. That is
  // deliberate — the refusal has to be reachable, or AC-9 could only ever assert a missing button.
  await expect(page.getByTestId(`devices-row-${tag}-primary`)).toBeVisible();
  await page.getByTestId(`devices-row-${tag}-primary`).click();

  await expect(page.getByTestId("devices-action-error")).toBeVisible();
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "it is still shown as unassigned").toHaveText("unassigned");
  await expect(page.getByTestId(`devices-row-${tag}-rank`), "it is not designated primary").toHaveText("n/a");

  expect(await listedTags(page), "the device list is otherwise unchanged").toEqual(before);
  for (const t of before) expect(await rowState(page, t), `${t} is unchanged`).toEqual(states.get(t));

  await deleteDevice(page, tag);
});

test("AC-10: designation is refused when the seat has no occupant, and not for AC-8's reason — INV-05", async ({ page }, testInfo) => {
  const tag = tagFor("AC10", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC10", ownerLabel: owner.label });

  const seat = await vacantSeat(page, tag);
  await assignTo(page, tag, seat);
  await expect(page.getByTestId(`devices-row-${tag}-occupant`), "the Given: the seat has no occupant").toHaveText("no occupant");

  await page.getByTestId(`devices-row-${tag}-primary`).click();

  await expect(page.getByTestId("devices-action-error")).toBeVisible();
  const message = (await page.getByTestId("devices-action-error").innerText()).trim();
  expect(message, "a message about the seat having no occupant").toMatch(/occupant/i);

  // This is the whole reason AC-10 is a separate criterion from AC-8. `01-story.md`: written so that
  // an absent occupant is compared as a non-match, AC-8 passes and this refusal is right by
  // accident; written the other way, a primary device is permitted on an empty seat. One shared
  // message would make the two indistinguishable from outside, which is how the bug survives.
  expect(ownerMismatchMessage, "AC-8 ran first and captured its message").not.toBeNull();
  expect(
    message,
    "the two INV-05 refusals do not say the same thing — a seat with no occupant is not an owner mismatch"
  ).not.toBe(ownerMismatchMessage);

  await expect(page.getByTestId(`devices-row-${tag}-rank`), "it is not designated primary").toHaveText("SECONDARY");
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "still assigned to that seat").toHaveText(seat.code);

  await deleteDevice(page, tag);
});

test("AC-11: the owner of a seat's primary device may not become a non-occupant — INV-05", async ({ page }, testInfo) => {
  const tag = tagFor("AC11", testInfo.retry);

  await page.goto("/devices");
  const members = await memberOptions(page);
  await createDevice(page, { tag, model: "QA model AC11", ownerLabel: members[0]!.label });

  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, tag);
  const stranger = members.find((m) => m.label !== occupant);
  expect(stranger, "a member who is not that seat's occupant").toBeDefined();

  await setOwner(page, tag, occupant);
  await assignTo(page, tag, seat);
  await makePrimary(page, tag);

  // AC-11 guards the owner while the designation is held still; AC-8 guards the designation while
  // the owner is held still. A system enforcing only the first can be walked into the same illegal
  // state in two moves.
  await page.getByTestId(`devices-row-${tag}-edit`).click();
  await expect(page.getByTestId("device-edit-dialog")).toBeVisible();
  await page.getByTestId("device-edit-owner").selectOption({ label: stranger!.label });
  await page.getByTestId("device-edit-submit").click();

  // Section 6: AC-11 is a refused *form submission*, so its message renders against the owner select
  // rather than page-level — the criterion says "against the owner".
  await expect(page.getByTestId("device-edit-owner-error")).toBeVisible();
  await expect(page.getByTestId("device-edit-owner-error")).toContainText(/occupant/i);
  await expect(page.getByTestId("device-edit-dialog"), "the edit was not accepted").toBeVisible();
  await page.getByTestId("device-edit-cancel").click();
  await expect(page.getByTestId("device-edit-dialog")).toBeHidden();

  await expect(page.getByTestId(`devices-row-${tag}-owner`), "the owner is not changed").toHaveText(occupant);
  await expect(page.getByTestId(`devices-row-${tag}-rank`), "it is still that seat's primary device").toHaveText("PRIMARY");
  await expect(page.getByTestId(`devices-row-${tag}-seat`)).toHaveText(seat.code);

  await deleteDevice(page, tag);
});

test("AC-12: a device in inventory is deleted, behind a confirmation", async ({ page }, testInfo) => {
  const tag = tagFor("AC12", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC12", ownerLabel: owner.label });
  await expect(page.getByTestId(`devices-row-${tag}-seat`), "the Given: it is unassigned").toHaveText("unassigned");

  const before = await listedTags(page);
  const states = new Map<string, Awaited<ReturnType<typeof rowState>>>();
  for (const t of before) if (t !== tag) states.set(t, await rowState(page, t));

  await page.getByTestId(`devices-row-${tag}-delete`).click();
  await expect(page.getByTestId("device-delete-dialog"), "a confirmation is presented").toBeVisible();
  await expect(page.getByTestId("device-delete-message")).not.toBeEmpty();
  // Section 6: one element serves AC-12 and AC-13, and the difference between them is its value.
  await expect(page.getByTestId("device-delete-seat"), "there is no seat to name").toHaveText("none");

  // "And at that point the device has not been deleted."
  await expect(page.getByTestId(`devices-row-${tag}`)).toBeVisible();

  await page.getByTestId("device-delete-confirm").click();
  await expect(page.getByTestId("device-delete-dialog")).toBeHidden();
  await expect(page.getByTestId(`devices-row-${tag}`), "that device no longer appears").toHaveCount(0);

  const after = await listedTags(page);
  expect(after, "no other device is affected").toEqual(before.filter((t) => t !== tag));
  for (const t of after) expect(await rowState(page, t), `${t} is unaffected`).toEqual(states.get(t));
});

test("AC-13: deleting a seat's primary device names the seat, and leaves the seat with none — INV-04", async ({ page }, testInfo) => {
  const tag = tagFor("AC13", testInfo.retry);
  const sibling = tagFor("AC13-SIB", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC13", ownerLabel: owner.label });

  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, tag);
  await setOwner(page, tag, occupant);
  await assignTo(page, tag, seat);
  await makePrimary(page, tag);

  // The control, in the shape ROO-01's AC-14 took: without a second device on the same seat the
  // criterion cannot tell a delete that removes one device from one that removes or demotes every
  // device on the seat, and the second is the more damaging failure.
  await createDevice(page, { tag: sibling, model: "QA model AC13 sibling", ownerLabel: owner.label });
  await assignTo(page, sibling, seat);
  const siblingBefore = await rowState(page, sibling);
  expect(siblingBefore.rank, "the sibling is a secondary device of that seat").toBe("SECONDARY");

  await page.getByTestId(`devices-row-${tag}-delete`).click();
  await expect(page.getByTestId("device-delete-dialog")).toBeVisible();
  await expect(
    page.getByTestId("device-delete-seat"),
    "the confirmation names the seat the device is assigned to"
  ).toHaveText(seat.code);
  await expect(page.getByTestId("device-delete-message")).not.toBeEmpty();

  // "And at that point the device has not been deleted and the seat is unchanged."
  await expect(page.getByTestId(`devices-row-${tag}`)).toBeVisible();
  await expect(page.getByTestId(`devices-row-${tag}-rank`)).toHaveText("PRIMARY");
  expect(await rowState(page, sibling), "the seat is unchanged before confirming").toEqual(siblingBefore);

  await page.getByTestId("device-delete-confirm").click();
  await expect(page.getByTestId(`devices-row-${tag}`), "that device no longer appears").toHaveCount(0);

  // "And that seat has no primary device." Legal — INV-04 sets a maximum of one, not a minimum.
  expect(
    await primaryCountOn(page, seat.code),
    `${seat.code} is left with no primary device`
  ).toBe(0);

  // "And every other device assigned to that seat is unchanged."
  expect(await rowState(page, sibling), "the sibling is untouched").toEqual(siblingBefore);
  // "And the seat itself still exists, with its occupant unchanged." The occupant cell of a device
  // still on that seat is the only channel section 6 gives QA for this.
  await expect(page.getByTestId(`devices-row-${sibling}-occupant`)).toHaveText(occupant);

  await deleteDevice(page, sibling);
});

test("AC-14: deletion is not performed until it is confirmed", async ({ page }, testInfo) => {
  const tag = tagFor("AC14", testInfo.retry);

  await page.goto("/devices");
  const owner = (await memberOptions(page))[0]!;
  await createDevice(page, { tag, model: "QA model AC14", ownerLabel: owner.label });

  // A device with all three of the things the criterion says must be unchanged actually set: an
  // owner, a seat, and a designation. Dismissing a confirmation on an inventory device would leave
  // two of the three clauses asserting nothing.
  const { seat, occupant } = await occupiedSeatWithoutPrimary(page, tag);
  await setOwner(page, tag, occupant);
  await assignTo(page, tag, seat);
  await makePrimary(page, tag);

  const before = await rowState(page, tag);
  const tagsBefore = await listedTags(page);

  await page.getByTestId(`devices-row-${tag}-delete`).click();
  await expect(page.getByTestId("device-delete-dialog")).toBeVisible();
  await page.getByTestId("device-delete-cancel").click();
  await expect(page.getByTestId("device-delete-dialog")).toBeHidden();

  await expect(page.getByTestId(`devices-row-${tag}`), "the device still appears in the device list").toBeVisible();
  expect(await rowState(page, tag), "its owner, its seat and its designation are unchanged").toEqual(before);
  expect(await listedTags(page), "and nothing else was deleted either").toEqual(tagsBefore);

  await deleteDevice(page, tag);
});
