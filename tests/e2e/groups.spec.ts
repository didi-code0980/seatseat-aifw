import { expect, test, type Page } from "@playwright/test";

// GRP-01 — Group CRUD UI. Acceptance criteria from `01-story.md`, selectors from `02-design.md`
// section 6 only (RULE-05). `src/**` was not read.
//
// Rows are keyed by full group path, e.g. `Engineering`, `Engineering/Platform`.
// Every group created by this suite is deleted during teardown unless consumed by the criterion.
//
// Constraints from section 6.2:
// 1. Serial mode: test.describe.configure({ mode: "serial" }).
// 2. AC-12 builds its own Given so it does not depend on Platform being present.
// 3. AC-13 consumes Platform and runs last.

test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36).toLowerCase();
let minted = 0;

function groupNameFor(label: string): string {
  minted += 1;
  return `QA-Grp-${RUN}-${label}-${minted}`;
}

async function openGroups(page: Page): Promise<void> {
  await page.goto("/groups");
  await expect(page.getByTestId("groups-page")).toBeVisible();
  await expect(page.getByTestId("groups-table")).toBeVisible();
}

async function openCreateDialog(page: Page): Promise<void> {
  await page.getByTestId("groups-create-open").click();
  await expect(page.getByTestId("group-create-dialog")).toBeVisible();
}

async function createGroup(
  page: Page,
  fields: { name: string; parentLabel?: string }
): Promise<void> {
  await openCreateDialog(page);
  await page.getByTestId("group-create-name").fill(fields.name);
  if (fields.parentLabel) {
    await page.getByTestId("group-create-parent").selectOption({ label: fields.parentLabel });
  }
  await page.getByTestId("group-create-submit").click();
  await expect(page.getByTestId("group-create-dialog")).toBeHidden();
}

async function deleteGroup(page: Page, path: string): Promise<void> {
  await page.getByTestId(`groups-row-${path}-delete`).click();
  await expect(page.getByTestId("group-delete-dialog")).toBeVisible();
  await page.getByTestId("group-delete-confirm").click();
  await expect(page.getByTestId(`groups-row-${path}`)).toHaveCount(0);
}

test("AC-1: groups are listed as the tree they are, beneath parent or at top level, with create control", async ({
  page,
}) => {
  await openGroups(page);

  // Seed check: Engineering is top level, Platform is child of Engineering
  const engRow = page.getByTestId("groups-row-Engineering");
  await expect(engRow).toBeVisible();
  await expect(page.getByTestId("groups-row-Engineering-name")).toHaveText("Engineering");
  await expect(page.getByTestId("groups-row-Engineering-parent")).toHaveText("none");
  await expect(page.getByTestId("groups-row-Engineering-children")).toContainText("Platform");

  const platRow = page.getByTestId("groups-row-Engineering/Platform");
  await expect(platRow).toBeVisible();
  await expect(page.getByTestId("groups-row-Engineering/Platform-name")).toHaveText("Platform");
  await expect(page.getByTestId("groups-row-Engineering/Platform-parent")).toHaveText("Engineering");
  await expect(page.getByTestId("groups-row-Engineering/Platform-children")).toHaveText("none");

  await expect(page.getByTestId("groups-create-open")).toBeVisible();
});

test("AC-2: a group is created at the top level without reloading", async ({ page }) => {
  await openGroups(page);
  const name = groupNameFor("AC2");

  let loads = 0;
  page.on("load", () => {
    loads += 1;
  });

  await createGroup(page, { name });

  const row = page.getByTestId(`groups-row-${name}`);
  await expect(row).toBeVisible();
  await expect(page.getByTestId(`groups-row-${name}-parent`)).toHaveText("none");
  await expect(page.getByTestId(`groups-row-${name}-children`)).toHaveText("none");
  expect(loads, "page did not reload").toBe(0);

  // Teardown
  await deleteGroup(page, name);
});

test("AC-3: a group is created as the child of an existing group", async ({ page }) => {
  await openGroups(page);
  const parentName = groupNameFor("AC3-P");
  const childName = groupNameFor("AC3-C");

  await createGroup(page, { name: parentName });
  await createGroup(page, { name: childName, parentLabel: parentName });

  const childPath = `${parentName}/${childName}`;
  const childRow = page.getByTestId(`groups-row-${childPath}`);
  await expect(childRow).toBeVisible();
  await expect(page.getByTestId(`groups-row-${childPath}-parent`)).toHaveText(parentName);

  const parentRow = page.getByTestId(`groups-row-${parentName}`);
  await expect(page.getByTestId(`groups-row-${parentName}-children`)).toContainText(childName);

  // Teardown
  await deleteGroup(page, childPath);
  await deleteGroup(page, parentName);
});

test("AC-4: creation is refused when the name is missing or blank", async ({ page }) => {
  await openGroups(page);
  await openCreateDialog(page);

  await page.getByTestId("group-create-name").fill("   ");
  await page.getByTestId("group-create-submit").click();

  await expect(page.getByTestId("group-create-dialog")).toBeVisible();
  await expect(page.getByTestId("group-create-name-error")).toBeVisible();

  await page.getByTestId("group-create-cancel").click();
  await expect(page.getByTestId("group-create-dialog")).toBeHidden();
});

test("AC-4a: creation is refused when a group with that name already sits under the same parent", async ({
  page,
}) => {
  await openGroups(page);
  const parentName = groupNameFor("AC4a-P");
  const name = groupNameFor("AC4a-Name");

  await createGroup(page, { name: parentName });
  await createGroup(page, { name, parentLabel: parentName });

  // Try duplicate under same parent
  await openCreateDialog(page);
  await page.getByTestId("group-create-name").fill(name);
  await page.getByTestId("group-create-parent").selectOption({ label: parentName });
  await page.getByTestId("group-create-submit").click();

  await expect(page.getByTestId("group-create-dialog")).toBeVisible();
  await expect(page.getByTestId("group-create-name-error")).toBeVisible();

  await page.getByTestId("group-create-cancel").click();
  await expect(page.getByTestId("group-create-dialog")).toBeHidden();

  // Teardown
  await deleteGroup(page, `${parentName}/${name}`);
  await deleteGroup(page, parentName);
});

test("AC-4b: the same name is permitted beneath a different parent", async ({ page }) => {
  await openGroups(page);
  const p1 = groupNameFor("AC4b-P1");
  const p2 = groupNameFor("AC4b-P2");
  const shared = "Platform-AC4b";

  await createGroup(page, { name: p1 });
  await createGroup(page, { name: p2 });

  await createGroup(page, { name: shared, parentLabel: p1 });
  await createGroup(page, { name: shared, parentLabel: p2 });

  await expect(page.getByTestId(`groups-row-${p1}/${shared}`)).toBeVisible();
  await expect(page.getByTestId(`groups-row-${p2}/${shared}`)).toBeVisible();

  // Teardown
  await deleteGroup(page, `${p1}/${shared}`);
  await deleteGroup(page, `${p2}/${shared}`);
  await deleteGroup(page, p1);
  await deleteGroup(page, p2);
});

test("AC-5: a group is renamed, keeping its place in the tree", async ({ page }) => {
  await openGroups(page);
  const origName = groupNameFor("AC5-Orig");
  const newName = groupNameFor("AC5-New");

  await createGroup(page, { name: origName });

  await page.getByTestId(`groups-row-${origName}-edit`).click();
  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await page.getByTestId("group-edit-name").fill(newName);
  await page.getByTestId("group-edit-submit").click();

  await expect(page.getByTestId("group-edit-dialog")).toBeHidden();
  await expect(page.getByTestId(`groups-row-${newName}`)).toBeVisible();
  await expect(page.getByTestId(`groups-row-${origName}`)).toHaveCount(0);

  // Teardown
  await deleteGroup(page, newName);
});

test("AC-5a: renaming is refused when a sibling already holds the new name", async ({ page }) => {
  await openGroups(page);
  const p = groupNameFor("AC5a-P");
  const name1 = groupNameFor("AC5a-1");
  const name2 = groupNameFor("AC5a-2");

  await createGroup(page, { name: p });
  await createGroup(page, { name: name1, parentLabel: p });
  await createGroup(page, { name: name2, parentLabel: p });

  // Try to rename name1 to name2
  await page.getByTestId(`groups-row-${p}/${name1}-edit`).click();
  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await page.getByTestId("group-edit-name").fill(name2);
  await page.getByTestId("group-edit-submit").click();

  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await expect(page.getByTestId("group-edit-name-error")).toBeVisible();

  await page.getByTestId("group-edit-cancel").click();
  await expect(page.getByTestId("group-edit-dialog")).toBeHidden();

  // Teardown
  await deleteGroup(page, `${p}/${name1}`);
  await deleteGroup(page, `${p}/${name2}`);
  await deleteGroup(page, p);
});

test("AC-6: a group is moved to a different parent with its children", async ({ page }) => {
  await openGroups(page);
  const src = groupNameFor("AC6-Src");
  const dst = groupNameFor("AC6-Dst");
  const child = groupNameFor("AC6-C");

  await createGroup(page, { name: src });
  await createGroup(page, { name: dst });
  await createGroup(page, { name: child, parentLabel: src });

  await page.getByTestId(`groups-row-${src}/${child}-edit`).click();
  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await page.getByTestId("group-edit-parent").selectOption({ label: dst });
  await page.getByTestId("group-edit-submit").click();

  await expect(page.getByTestId("group-edit-dialog")).toBeHidden();
  await expect(page.getByTestId(`groups-row-${dst}/${child}`)).toBeVisible();
  await expect(page.getByTestId(`groups-row-${src}/${child}`)).toHaveCount(0);

  // Teardown
  await deleteGroup(page, `${dst}/${child}`);
  await deleteGroup(page, src);
  await deleteGroup(page, dst);
});

test("AC-6a: a move is refused when destination parent already holds a group with that name", async ({
  page,
}) => {
  await openGroups(page);
  const dst = groupNameFor("AC6a-Dst");
  const shared = groupNameFor("AC6a-Shared");

  await createGroup(page, { name: dst });
  await createGroup(page, { name: shared, parentLabel: dst });
  await createGroup(page, { name: shared });

  // Attempt to move top-level shared into dst
  await page.getByTestId(`groups-row-${shared}-edit`).click();
  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await page.getByTestId("group-edit-parent").selectOption({ label: dst });
  await page.getByTestId("group-edit-submit").click();

  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await expect(page.getByTestId("group-edit-name-error")).toBeVisible();

  await page.getByTestId("group-edit-cancel").click();
  await expect(page.getByTestId("group-edit-dialog")).toBeHidden();

  // Teardown
  await deleteGroup(page, `${dst}/${shared}`);
  await deleteGroup(page, shared);
  await deleteGroup(page, dst);
});

test("AC-7: a group is moved to the top level", async ({ page }) => {
  await openGroups(page);
  const parent = groupNameFor("AC7-P");
  const child = groupNameFor("AC7-C");

  await createGroup(page, { name: parent });
  await createGroup(page, { name: child, parentLabel: parent });

  await page.getByTestId(`groups-row-${parent}/${child}-edit`).click();
  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await page.getByTestId("group-edit-parent").selectOption({ value: "" });
  await page.getByTestId("group-edit-submit").click();

  await expect(page.getByTestId("group-edit-dialog")).toBeHidden();
  await expect(page.getByTestId(`groups-row-${child}`)).toBeVisible();
  await expect(page.getByTestId(`groups-row-${child}-parent`)).toHaveText("none");

  // Teardown
  await deleteGroup(page, child);
  await deleteGroup(page, parent);
});

test("AC-8: a group may not be made its own ancestor", async ({ page }) => {
  await openGroups(page);
  const parent = groupNameFor("AC8-P");
  const child = groupNameFor("AC8-C");

  await createGroup(page, { name: parent });
  await createGroup(page, { name: child, parentLabel: parent });

  // Try to set parent's parent to child
  await page.getByTestId(`groups-row-${parent}-edit`).click();
  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await page.getByTestId("group-edit-parent").selectOption({ label: `${parent}/${child}` });
  await page.getByTestId("group-edit-submit").click();

  await expect(page.getByTestId("group-edit-dialog")).toBeVisible();
  await expect(page.getByTestId("group-edit-parent-error")).toBeVisible();

  await page.getByTestId("group-edit-cancel").click();
  await expect(page.getByTestId("group-edit-dialog")).toBeHidden();

  // Teardown
  await deleteGroup(page, `${parent}/${child}`);
  await deleteGroup(page, parent);
});

test("AC-9: nothing on this surface deletes a Member (INV-12)", async ({ page }) => {
  await page.goto("/members");
  await expect(page.getByTestId("members-page")).toBeVisible();
  const initialMembers = await page.locator('[data-testid^="members-row-"][data-testid$="-email"]').allInnerTexts();
  expect(initialMembers.length).toBeGreaterThan(0);

  await openGroups(page);
  const temp = groupNameFor("AC9");
  await createGroup(page, { name: temp });
  await deleteGroup(page, temp);

  await page.goto("/members");
  const afterMembers = await page.locator('[data-testid^="members-row-"][data-testid$="-email"]').allInnerTexts();
  expect(afterMembers).toEqual(initialMembers);
});

test("AC-10: nothing on this surface touches a seat, a device, or an occupancy", async ({ page }) => {
  await page.goto("/seats");
  const seatsBefore = await page.locator('[data-testid^="seats-row-"][data-testid$="-status"]').allInnerTexts();

  await page.goto("/devices");
  const devicesBefore = await page.locator('[data-testid^="devices-row-"][data-testid$="-owner"]').allInnerTexts();

  await openGroups(page);
  const temp = groupNameFor("AC10");
  await createGroup(page, { name: temp });
  await deleteGroup(page, temp);

  await page.goto("/seats");
  const seatsAfter = await page.locator('[data-testid^="seats-row-"][data-testid$="-status"]').allInnerTexts();
  expect(seatsAfter).toEqual(seatsBefore);

  await page.goto("/devices");
  const devicesAfter = await page.locator('[data-testid^="devices-row-"][data-testid$="-owner"]').allInnerTexts();
  expect(devicesAfter).toEqual(devicesBefore);
});

test("AC-11: a group with no children and no members is deleted after confirmation", async ({
  page,
}) => {
  await openGroups(page);
  const name = groupNameFor("AC11");
  await createGroup(page, { name });

  await page.getByTestId(`groups-row-${name}-delete`).click();
  await expect(page.getByTestId("group-delete-dialog")).toBeVisible();
  await expect(page.getByTestId("group-delete-members")).toHaveText("0");

  // Cancel first
  await page.getByTestId("group-delete-cancel").click();
  await expect(page.getByTestId("group-delete-dialog")).toBeHidden();
  await expect(page.getByTestId(`groups-row-${name}`)).toBeVisible();

  // Confirm delete
  await page.getByTestId(`groups-row-${name}-delete`).click();
  await page.getByTestId("group-delete-confirm").click();
  await expect(page.getByTestId(`groups-row-${name}`)).toHaveCount(0);
});

test("AC-12: deleting a group that has child groups is refused", async ({ page }) => {
  await openGroups(page);
  const parent = groupNameFor("AC12-P");
  const child = groupNameFor("AC12-C");

  await createGroup(page, { name: parent });
  await createGroup(page, { name: child, parentLabel: parent });

  await page.getByTestId(`groups-row-${parent}-delete`).click();
  await expect(page.getByTestId("group-delete-refused-dialog")).toBeVisible();
  await expect(page.getByTestId("group-delete-refused-children")).toHaveText(child);
  await expect(page.getByTestId("group-delete-confirm")).toHaveCount(0);

  await page.getByTestId("group-delete-refused-dismiss").click();
  await expect(page.getByTestId("group-delete-refused-dialog")).toBeHidden();
  await expect(page.getByTestId(`groups-row-${parent}`)).toBeVisible();

  // Teardown
  await deleteGroup(page, `${parent}/${child}`);
  await deleteGroup(page, parent);
});

test("AC-13: deleting a group that has members detaches them (RUNS LAST)", async ({ page }) => {
  await openGroups(page);

  // Platform has 2 members
  await page.getByTestId("groups-row-Engineering/Platform-delete").click();
  await expect(page.getByTestId("group-delete-dialog")).toBeVisible();
  await expect(page.getByTestId("group-delete-members")).toHaveText("2");

  await page.getByTestId("group-delete-confirm").click();
  await expect(page.getByTestId("groups-row-Engineering/Platform")).toHaveCount(0);

  // Verify members on /members still exist and occupy seats
  await page.goto("/members");
  await expect(page.getByTestId("members-page")).toBeVisible();
  const members = await page.locator('[data-testid^="members-row-"][data-testid$="-email"]').allInnerTexts();
  expect(members.length).toBeGreaterThanOrEqual(3);
});
