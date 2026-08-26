import { expect, test, type Page } from "@playwright/test";

// GRP-02 — Member assignment to groups, and the group column restored to `/members`.
//
// Acceptance criteria from `01-story.md`. Selectors from `02-design.md` **section 6 only** (RULE-05).
// `src/**` was not read to write this file, and no selector below is absent from section 6 — the
// dialog-wrapper testids that `tests/e2e/members.spec.ts` and `tests/e2e/groups.spec.ts` use for
// their own waits (`member-create-dialog`, `group-delete-dialog`) are deliberately NOT used here,
// because section 6.4 does not restate them; each wait below is on a control section 6 does list.
//
// The four constraints in section 6.2 are obeyed and each is visible in the code:
//
// 1. Serial mode, below. `playwright.config.ts` already pins `workers: 1`, but "no other member's
//    group changes" is an assertion about a shared mutable store and the order should be explicit.
// 2. Nothing here depends on the seeded `Platform` group or on any seeded member's group.
//    `tests/e2e/groups.spec.ts` sorts first alphabetically and deletes `Platform` as its AC-13,
//    detaching Mo and Uma for the rest of the run. Every Given below is constructed.
// 3. Every group and every member this suite creates, it deletes again. Seeded rows are read and
//    never written — including in AC-1, which section 6.2 constraint 3 allows to read one.
// 4. AC-4's Given is built by AC-3's verb: create a member (no group), assign, re-assign.
//
// GROUP NAMES CARRY NO `-` ON PURPOSE. Section 6.1 asks for "an assertion that the cell does not
// contain a `-`" as the cheap second half of AC-1's *never its identifier*, and every id is a
// `crypto.randomUUID()`, which always does. A name containing a dash would make that assertion
// vacuous, so the mint below is alphanumeric.

test.describe.configure({ mode: "serial" });

/** Unique per run, so a store surviving between runs cannot collide on a sibling name or an email. */
const RUN = Date.now().toString(36).toLowerCase();
let minted = 0;

/** Alphanumeric only — see the note above about AC-1's second clause. */
function groupNameFor(label: string): string {
  minted += 1;
  return `QAGrp${RUN}${label}${minted}`;
}

/**
 * Lowercase on purpose. Section 6 records that the row testid uses the email exactly as stored and
 * that `memberEmailSchema` trims but does not lowercase; supplying lowercase avoids the question.
 */
function emailFor(label: string): string {
  minted += 1;
  return `qa-grp02-${RUN}-${label.toLowerCase()}-${minted}@qa.internal`;
}

const ASSIGN_DIALOG = "member-assign-dialog";

// ---------------------------------------------------------------------------------------------
// `/members` — MEM-01's selectors as section 6.4 restates them, plus this ticket's `-group` cell.
// ---------------------------------------------------------------------------------------------

async function openMembers(page: Page): Promise<void> {
  await page.goto("/members");
  await expect(page.getByTestId("members-page")).toBeVisible();
  await expect(page.getByTestId("members-table")).toBeVisible();
}

async function cellText(page: Page, email: string, cell: string): Promise<string> {
  return (await page.getByTestId(`members-row-${email}-${cell}`).innerText()).trim();
}

/** Every email currently listed, read from the `members-row-<email>-email` cells. */
async function listedEmails(page: Page): Promise<string[]> {
  const cells = page.locator('[data-testid^="members-row-"][data-testid$="-email"]');
  return (await cells.allInnerTexts()).map((t) => t.trim()).filter((t) => t.length > 0);
}

type RowState = {
  name: string;
  email: string;
  role: string;
  seats: string;
  signin: string;
  group: string;
};

/** The whole visible state of one row — what AC-8's "unchanged" clauses are about. */
async function rowState(page: Page, email: string): Promise<RowState> {
  return {
    name: await cellText(page, email, "name"),
    email: await cellText(page, email, "email"),
    role: await cellText(page, email, "role"),
    seats: await cellText(page, email, "seats"),
    signin: await cellText(page, email, "signin"),
    group: await cellText(page, email, "group"),
  };
}

/** Every row on the page, keyed by email. The subject of AC-4's "no other member's group changes". */
async function memberSnapshot(page: Page): Promise<Record<string, RowState>> {
  const out: Record<string, RowState> = {};
  for (const email of await listedEmails(page)) out[email] = await rowState(page, email);
  return out;
}

function without(snap: Record<string, RowState>, email: string): Record<string, RowState> {
  return Object.fromEntries(Object.entries(snap).filter(([key]) => key !== email));
}

async function createMember(
  page: Page,
  fields: { name: string; email: string; role: "USER" | "MANAGER" | "ADMIN" }
): Promise<void> {
  await page.getByTestId("members-create-open").click();
  await expect(page.getByTestId("member-create-name")).toBeVisible();
  await page.getByTestId("member-create-name").fill(fields.name);
  await page.getByTestId("member-create-email").fill(fields.email);
  await page.getByTestId("member-create-role").selectOption(fields.role);
  await page.getByTestId("member-create-submit").click();
  await expect(page.getByTestId(`members-row-${fields.email}-email`)).toBeVisible();
}

/**
 * Teardown, never the act under test. Section 6.2 constraint 3: a member this suite created occupies
 * no seat and owns no device, so INV-12 does not refuse the delete.
 */
async function deleteMember(page: Page, email: string): Promise<void> {
  await openMembers(page);
  await page.getByTestId(`members-row-${email}-delete`).click();
  await expect(page.getByTestId("member-delete-confirm")).toBeVisible();
  await page.getByTestId("member-delete-confirm").click();
  await expect(page.getByTestId(`members-row-${email}-email`)).toHaveCount(0);
}

// ---------------------------------------------------------------------------------------------
// The assign dialog — this ticket's own controls, section 6's first table.
// ---------------------------------------------------------------------------------------------

async function openAssign(page: Page, email: string): Promise<void> {
  await page.getByTestId(`members-row-${email}-assign`).click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeVisible();
}

/** Option labels of the group chooser, placeholder included, in the order rendered. */
async function chooserLabels(page: Page): Promise<string[]> {
  return page
    .getByTestId("member-assign-group")
    .locator("option")
    .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? "").trim()));
}

/** Option values of the group chooser, placeholder included. */
async function chooserValues(page: Page): Promise<string[]> {
  return page
    .getByTestId("member-assign-group")
    .locator("option")
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value));
}

/**
 * Assign through the surface. `groupLabel` is the group's **path** — section 6.3 item 1: the chooser
 * labels options with the full path, ancestor names joined by `/`, because two groups may share a
 * name under different parents.
 */
async function assign(page: Page, email: string, groupLabel: string): Promise<void> {
  await openAssign(page, email);
  await page.getByTestId("member-assign-group").selectOption({ label: groupLabel });
  await page.getByTestId("member-assign-submit").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();
}

// ---------------------------------------------------------------------------------------------
// `/groups` — GRP-01's selectors as section 6.4 restates them.
// ---------------------------------------------------------------------------------------------

async function openGroups(page: Page): Promise<void> {
  await page.goto("/groups");
  await expect(page.getByTestId("groups-page")).toBeVisible();
}

const ROW_SUFFIXES = ["-name", "-parent", "-children", "-edit", "-delete"];

/** Every group path on the page, read off the `groups-row-<path>` row testids. */
async function groupPaths(page: Page): Promise<string[]> {
  const ids = await page
    .locator('[data-testid^="groups-row-"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-testid") ?? ""));
  return ids
    .map((id) => id.slice("groups-row-".length))
    .filter((p) => p.length > 0 && !ROW_SUFFIXES.some((s) => p.endsWith(s)))
    .sort();
}

type GroupRow = { name: string; parent: string; children: string };

/** The whole visible group tree. AC-10 is this value, before an assignment and after it. */
async function groupSnapshot(page: Page): Promise<Record<string, GroupRow>> {
  const out: Record<string, GroupRow> = {};
  for (const path of await groupPaths(page)) {
    out[path] = {
      name: (await page.getByTestId(`groups-row-${path}-name`).innerText()).trim(),
      parent: (await page.getByTestId(`groups-row-${path}-parent`).innerText()).trim(),
      children: (await page.getByTestId(`groups-row-${path}-children`).innerText()).trim(),
    };
  }
  return out;
}

/** Create a group and return its path — its own name when top level, `parent/name` when nested. */
async function createGroup(
  page: Page,
  fields: { name: string; parentPath?: string }
): Promise<string> {
  await openGroups(page);
  await page.getByTestId("groups-create-open").click();
  await expect(page.getByTestId("group-create-name")).toBeVisible();
  await page.getByTestId("group-create-name").fill(fields.name);
  if (fields.parentPath) {
    await page.getByTestId("group-create-parent").selectOption({ label: fields.parentPath });
  }
  await page.getByTestId("group-create-submit").click();
  const path = fields.parentPath ? `${fields.parentPath}/${fields.name}` : fields.name;
  await expect(page.getByTestId(`groups-row-${path}`)).toBeVisible();
  return path;
}

async function deleteGroup(page: Page, path: string): Promise<void> {
  await openGroups(page);
  await page.getByTestId(`groups-row-${path}-delete`).click();
  await expect(page.getByTestId("group-delete-confirm")).toBeVisible();
  await page.getByTestId("group-delete-confirm").click();
  await expect(page.getByTestId(`groups-row-${path}`)).toHaveCount(0);
}

// ---------------------------------------------------------------------------------------------
// `/seats` and `/devices` — SEA-01 and DEV-01, AC-11 only, and READ-ONLY (section 6.4).
// ---------------------------------------------------------------------------------------------

async function tableSnapshot(
  page: Page,
  route: string,
  prefix: string,
  cells: string[]
): Promise<Record<string, Record<string, string>>> {
  await page.goto(route);
  const anchor = cells[0];
  const ids = await page
    .locator(`[data-testid^="${prefix}"][data-testid$="-${anchor}"]`)
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-testid") ?? ""));
  const keys = ids.map((id) => id.slice(prefix.length, id.length - `-${anchor}`.length));
  const out: Record<string, Record<string, string>> = {};
  for (const key of keys) {
    const row: Record<string, string> = {};
    for (const cell of cells) {
      row[cell] = (await page.getByTestId(`${prefix}${key}-${cell}`).innerText()).trim();
    }
    out[key] = row;
  }
  return out;
}

const seatSnapshot = (page: Page) =>
  tableSnapshot(page, "/seats", "seats-row-", ["occupant", "status"]);

const deviceSnapshot = (page: Page) =>
  tableSnapshot(page, "/devices", "devices-row-", ["owner", "seat", "rank"]);

// =============================================================================================
// AC-1
// =============================================================================================

test("AC-1: the members list shows each member's group by name, never its identifier", async ({
  page,
}) => {
  // Constructed rather than taken from the seed — section 6.2 constraint 2. The name carries no
  // `-`; the id it resolves from is a UUID and always does.
  const name = groupNameFor("AC1");
  const path = await createGroup(page, { name });

  const email = emailFor("AC1");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC1", email, role: "USER" });
  await assign(page, email, path);

  const cell = page.getByTestId(`members-row-${email}-group`);
  await expect(cell, "the row shows the group's NAME").toHaveText(name);
  expect(
    (await cell.innerText()).trim(),
    "and nothing else — section 6: the `-group` cell renders bare"
  ).toBe(name);
  expect(
    (await cell.innerText()).includes("-"),
    "never the identifier — every group id is a crypto.randomUUID() and contains `-` (section 6.1)"
  ).toBe(false);

  // Section 6.2 constraint 3: the seed may be read here, and only read. Every listed member shows
  // something in the group column, so the column exists for rows this suite did not create.
  for (const other of await listedEmails(page)) {
    expect(
      (await cellText(page, other, "group")).length,
      `${other} shows a group or the empty state — never a blank cell`
    ).toBeGreaterThan(0);
  }

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

// =============================================================================================
// AC-2
// =============================================================================================

test("AC-2: a member who belongs to no group is shown as belonging to no group", async ({ page }) => {
  // Section 6.2: a member created through the interface belongs to no group, and the create form has
  // no field for one. That is this Given, and it costs nothing to construct.
  const email = emailFor("AC2");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC2", email, role: "USER" });

  const cell = page.getByTestId(`members-row-${email}-group`);
  await expect(cell, "an explicit empty state, section 6: the literal `none`").toHaveText("none");
  // "distinguishable from a group whose name is blank" — GRP-01's AC-4 makes a blank name
  // unreachable, so the distinguishing evidence is that the cell renders text rather than nothing.
  expect((await cell.innerText()).trim().length, "and it is not an empty cell").toBeGreaterThan(0);

  // Section 6: `members-row-<email>-assign` is present on EVERY row, with or without a group.
  await expect(
    page.getByTestId(`members-row-${email}-assign`),
    "the assign control is present on a row with no group"
  ).toBeVisible();

  await deleteMember(page, email);
});

// =============================================================================================
// AC-3
// =============================================================================================

test("AC-3: a member with no group is assigned to one, and the list shows it without a reload", async ({
  page,
}) => {
  const name = groupNameFor("AC3");
  const path = await createGroup(page, { name });

  const email = emailFor("AC3");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC3", email, role: "USER" });
  expect(await cellText(page, email, "group"), "the Given: the member belongs to no group").toBe("none");

  let loads = 0;
  page.on("load", () => {
    loads += 1;
  });

  await assign(page, email, path);

  await expect(
    page.getByTestId(`members-row-${email}-group`),
    "the member belongs to that group, and the row shows its name"
  ).toHaveText(name);
  expect(loads, "without a manual reload").toBe(0);

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

// =============================================================================================
// AC-4
// =============================================================================================

test("AC-4: a member is re-assigned between groups, and no other member's group changes", async ({
  page,
}) => {
  // Section 6.2 constraint 4: this Given is built by AC-3's verb.
  const engineering = groupNameFor("AC4Eng");
  const platform = groupNameFor("AC4Plat");
  const engPath = await createGroup(page, { name: engineering });
  const platPath = await createGroup(page, { name: platform });

  const subject = emailFor("AC4Subject");
  // A bystander who also belongs to a group, so "no other member's group changes" has something to
  // say beyond the members who belong to none.
  const bystander = emailFor("AC4Bystander");

  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC4 Subject", email: subject, role: "USER" });
  await createMember(page, { name: "QA GRP02 AC4 Bystander", email: bystander, role: "USER" });
  await assign(page, subject, engPath);
  await assign(page, bystander, engPath);

  // Taken immediately before the act, never in setup — the store is process-global and shared.
  const before = await memberSnapshot(page);
  expect(before[subject]?.group, "the Given: the subject belongs to Engineering").toBe(engineering);

  await assign(page, subject, platPath);

  await expect(
    page.getByTestId(`members-row-${subject}-group`),
    "the member belongs to Platform"
  ).toHaveText(platform);
  expect(
    await cellText(page, subject, "group"),
    "and no longer belongs to Engineering"
  ).not.toBe(engineering);

  const after = await memberSnapshot(page);
  expect(after[bystander]?.group, "the bystander still belongs to Engineering").toBe(engineering);
  expect(without(after, subject), "and no other member's group changes").toEqual(
    without(before, subject)
  );

  await deleteMember(page, subject);
  await deleteMember(page, bystander);
  await deleteGroup(page, platPath);
  await deleteGroup(page, engPath);
});

// =============================================================================================
// AC-5
// =============================================================================================

test("AC-5: every group in the tree is offered including nested ones, nothing else is, and the chooser is not free text", async ({
  page,
}) => {
  const parent = groupNameFor("AC5Parent");
  const child = groupNameFor("AC5Child");
  const parentPath = await createGroup(page, { name: parent });
  const childPath = await createGroup(page, { name: child, parentPath: parent });
  expect(childPath, "the nested group's path is parent/child — section 6.3 item 1").toBe(
    `${parent}/${child}`
  );

  // The tree as GRP-01 renders it, read from `/groups` rather than assumed.
  const tree = await groupPaths(page);
  expect(tree, "the tree contains the group just nested").toContain(childPath);

  const email = emailFor("AC5");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC5", email, role: "USER" });
  await openAssign(page, email);

  const labels = await chooserLabels(page);
  const values = await chooserValues(page);

  // Section 6: the placeholder `Select a group` carries `value=""`; every other option's value is a
  // group id and its label is that group's path.
  expect(values.filter((v) => v === "").length, "exactly one placeholder option").toBe(1);
  const placeholderIndex = values.indexOf("");
  expect(labels[placeholderIndex], "the placeholder reads `Select a group`").toBe("Select a group");

  const offered = labels.filter((_, i) => values[i] !== "").sort();
  expect(offered, "every group in the tree is offered, nested groups included").toEqual(tree);
  expect(offered, "and nothing outside that tree is offered").toEqual(tree);
  expect(
    values.filter((v) => v !== "").every((v) => v.length > 0),
    "every non-placeholder option carries a group id as its value"
  ).toBe(true);

  // "the chooser is not a free-text field"
  const tag = await page
    .getByTestId("member-assign-group")
    .evaluate((el) => el.tagName.toUpperCase());
  expect(tag, "the chooser is a select, not an input").toBe("SELECT");

  await page.getByTestId("member-assign-cancel").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();

  await deleteMember(page, email);
  await deleteGroup(page, childPath);
  await deleteGroup(page, parentPath);
});

// =============================================================================================
// AC-6
// =============================================================================================

test("AC-6: assignment is refused when the chosen group no longer exists, and the member is unchanged", async ({
  page,
  context,
}) => {
  // The sequence is section 6.3 item 4's, exactly: open the chooser, delete the group from a second
  // page on the same context, return and submit. The store is shared by the server, not the browser.
  const name = groupNameFor("AC6");
  const path = await createGroup(page, { name });

  const email = emailFor("AC6");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC6", email, role: "USER" });

  await openAssign(page, email);
  await page.getByTestId("member-assign-group").selectOption({ label: path });

  const second = await context.newPage();
  await deleteGroup(second, path);
  await second.close();

  await page.getByTestId("member-assign-submit").click();

  const error = page.getByTestId("member-assign-group-error");
  await expect(error, "the assignment is refused against the group").toBeVisible();
  expect(
    (await error.innerText()).trim().length,
    "and the refusal carries a message"
  ).toBeGreaterThan(0);
  await expect(page.getByTestId(ASSIGN_DIALOG), "the dialog stays open on a refusal").toBeVisible();

  await page.getByTestId("member-assign-cancel").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();
  expect(await cellText(page, email, "group"), "the member's group is unchanged").toBe("none");

  await deleteMember(page, email);
});

// =============================================================================================
// AC-7
// =============================================================================================

test("AC-7: a member belongs to at most one group, and no surface offers a way to hold both", async ({
  page,
}) => {
  const first = groupNameFor("AC7First");
  const second = groupNameFor("AC7Second");
  const firstPath = await createGroup(page, { name: first });
  const secondPath = await createGroup(page, { name: second });

  const email = emailFor("AC7");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC7", email, role: "USER" });
  await assign(page, email, firstPath);
  expect(await cellText(page, email, "group"), "the Given").toBe(first);

  await assign(page, email, secondPath);

  const cell = await cellText(page, email, "group");
  expect(cell, "the member belongs to the second group alone").toBe(second);
  expect(cell, "and not to both").not.toContain(first);

  // "no surface offers a way to hold both at once" — the chooser is single-valued, and it defaults
  // to the member's current group (section 6), which is one value and not a set.
  await openAssign(page, email);
  const multiple = await page
    .getByTestId("member-assign-group")
    .evaluate((el) => (el as HTMLSelectElement).multiple);
  expect(multiple, "the group chooser is not multi-select").toBe(false);
  const selected = await page
    .getByTestId("member-assign-group")
    .evaluate((el) => Array.from((el as HTMLSelectElement).selectedOptions).map((o) => o.textContent?.trim()));
  expect(selected, "exactly one group is selected, the member's current one").toEqual([secondPath]);
  await page.getByTestId("member-assign-cancel").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();

  await deleteMember(page, email);
  await deleteGroup(page, secondPath);
  await deleteGroup(page, firstPath);
});

// =============================================================================================
// AC-8
// =============================================================================================

test("AC-8: assigning a member changes nothing else about that member", async ({ page }) => {
  const name = groupNameFor("AC8");
  const path = await createGroup(page, { name });

  const email = emailFor("AC8");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC8", email, role: "MANAGER" });

  const before = await rowState(page, email);
  // The seat and device half of AC-8's Given cannot be constructed here: section 6.4 makes `/seats`
  // and `/devices` read-only for this spec, and section 6.2 constraint 3 forbids writing a seeded
  // row, so no member this suite may write can be given a seat or a device. It is covered instead by
  // AC-11 below, which asserts that the WHOLE of both tables is byte-identical across an assignment
  // — a stronger statement than "this one member's seat did not move". 05-test-plan.md records this.
  const seatsBefore = await seatSnapshot(page);
  const devicesBefore = await deviceSnapshot(page);

  await openMembers(page);
  await assign(page, email, path);

  const after = await rowState(page, email);
  expect(after.name, "the member's name is unchanged").toBe(before.name);
  expect(after.email, "their email is unchanged").toBe(before.email);
  expect(after.role, "their role is unchanged").toBe(before.role);
  expect(after.signin, "and their sign-in state is unchanged").toBe(before.signin);
  expect(after.seats, "their seat occupancy is unchanged").toBe(before.seats);
  expect(after.group, "the group is the one thing that moved").toBe(name);

  expect(await seatSnapshot(page), "no seat occupancy moved").toEqual(seatsBefore);
  expect(await deviceSnapshot(page), "no device ownership moved").toEqual(devicesBefore);

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

// =============================================================================================
// AC-9
// =============================================================================================

test("AC-9: nothing on this surface deletes a Member (INV-12)", async ({ page }) => {
  const name = groupNameFor("AC9");
  const path = await createGroup(page, { name });

  const email = emailFor("AC9");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC9", email, role: "USER" });

  const before = await memberSnapshot(page);

  // Every control this ticket adds, used: the row control, the chooser, submit, and cancel.
  await openAssign(page, email);
  // "no control on this surface offers to delete one" — the dialog carries no delete control, and
  // MEM-01's confirm is not reachable from inside it.
  await expect(
    page.getByTestId(ASSIGN_DIALOG).locator('[data-testid*="delete"]'),
    "the assign dialog offers no delete control"
  ).toHaveCount(0);
  await expect(page.getByTestId("member-delete-confirm"), "and no confirmation is open").toHaveCount(0);
  await page.getByTestId("member-assign-cancel").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();

  await assign(page, email, path);

  const after = await memberSnapshot(page);
  expect(Object.keys(after).sort(), "no member is deleted by any of them").toEqual(
    Object.keys(before).sort()
  );
  expect(without(after, email), "and every other member is untouched").toEqual(
    without(before, email)
  );

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

// =============================================================================================
// AC-10
// =============================================================================================

test("AC-10: nothing on this surface creates, renames, moves or deletes a group", async ({ page }) => {
  const name = groupNameFor("AC10");
  const path = await createGroup(page, { name });

  const email = emailFor("AC10");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC10", email, role: "USER" });

  await openGroups(page);
  const before = await groupSnapshot(page);
  expect(Object.keys(before), "the tree under test contains the group just created").toContain(path);

  await openMembers(page);
  await openAssign(page, email);
  // Out-of-scope item 1: the convenient control — create a group while assigning — is not here.
  await expect(
    page.getByTestId(ASSIGN_DIALOG).locator('[data-testid*="create"]'),
    "the assign dialog offers no way to create a group"
  ).toHaveCount(0);
  await expect(
    page.getByTestId(ASSIGN_DIALOG).locator('[data-testid*="edit"]'),
    "nor to rename or move one"
  ).toHaveCount(0);
  await page.getByTestId("member-assign-group").selectOption({ label: path });
  await page.getByTestId("member-assign-submit").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();
  await expect(page.getByTestId(`members-row-${email}-group`)).toHaveText(name);

  await openGroups(page);
  expect(
    await groupSnapshot(page),
    "the set of groups, their names and their parents are all unchanged — the tree is only read"
  ).toEqual(before);

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

// =============================================================================================
// AC-11
// =============================================================================================

test("AC-11: nothing on this surface touches a seat, a device, a room or an occupancy", async ({
  page,
}) => {
  const name = groupNameFor("AC11");
  const path = await createGroup(page, { name });

  const email = emailFor("AC11");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 AC11", email, role: "USER" });

  // Read-only on both routes. Section 6.4: a test that pressed a control on `/seats` or `/devices`
  // would be writing another ticket's data.
  const seatsBefore = await seatSnapshot(page);
  const devicesBefore = await deviceSnapshot(page);
  expect(
    Object.keys(seatsBefore).length,
    "the Given needs seats to exist for the assertion to say anything"
  ).toBeGreaterThan(0);
  expect(Object.keys(devicesBefore).length, "and devices").toBeGreaterThan(0);
  expect(
    Object.values(seatsBefore).some((r) => r.occupant !== "no occupant"),
    "and at least one seat to be occupied — 'a member who occupies a seat' (AC-11's Given)"
  ).toBe(true);
  expect(
    Object.values(devicesBefore).some((r) => r.owner !== "unowned"),
    "and at least one device to be owned"
  ).toBe(true);

  await openMembers(page);
  await assign(page, email, path);
  await expect(page.getByTestId(`members-row-${email}-group`)).toHaveText(name);

  expect(
    await seatSnapshot(page),
    "no seat or occupancy record is created, changed or removed — occupant and derived status both"
  ).toEqual(seatsBefore);
  expect(
    await deviceSnapshot(page),
    "no device record is created, changed or removed — owner, seat and designation all"
  ).toEqual(devicesBefore);

  // "two members of the same group need not sit near each other remains true of the data": the two
  // members now in this group are not brought together by it, which is what the unchanged seat rows
  // above say. Rooms are reached only through their seats (INV-11) and this surface has no room
  // control at all — the room half is the seat table above plus the dialog check in AC-10.
  await deleteMember(page, email);
  await deleteGroup(page, path);
});

// =============================================================================================
// Section 6.3 — behavioural facts that carry no AC, tested because each one guards something that
// would otherwise be deleted as dead code or silently regress.
// =============================================================================================

test("F-4 (section 6.3 item 2): submitting with the placeholder chosen is refused and does not unassign", async ({
  page,
}) => {
  // The placeholder is a validation refusal, not an unassignment. This is the guard on out-of-scope
  // item 2 and Q-4: if the empty option ever started removing a member from their group, this ticket
  // would have grown the verb the story declined to grant, with no criterion to fail.
  const name = groupNameFor("F4");
  const path = await createGroup(page, { name });

  const email = emailFor("F4");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 F4", email, role: "USER" });

  // First half: a member with no group. Submitting the placeholder refuses.
  await openAssign(page, email);
  await page.getByTestId("member-assign-group").selectOption({ value: "" });
  await page.getByTestId("member-assign-submit").click();
  await expect(page.getByTestId("member-assign-group-error")).toHaveText("A group is required.");
  await page.getByTestId("member-assign-cancel").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();
  expect(await cellText(page, email, "group"), "and the member's group is unchanged").toBe("none");

  // Second half, and the one that matters: a member who IS in a group is not removed from it.
  await assign(page, email, path);
  await openAssign(page, email);
  await page.getByTestId("member-assign-group").selectOption({ value: "" });
  await page.getByTestId("member-assign-submit").click();
  await expect(page.getByTestId("member-assign-group-error")).toHaveText("A group is required.");
  await page.getByTestId("member-assign-cancel").click();
  await expect(page.getByTestId(ASSIGN_DIALOG)).toBeHidden();
  expect(
    await cellText(page, email, "group"),
    "it does not remove them from the group they were in"
  ).toBe(name);

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

test("F-5 (section 6.3 item 3): assigning a member to the group they already belong to succeeds", async ({
  page,
}) => {
  const name = groupNameFor("F5");
  const path = await createGroup(page, { name });

  const email = emailFor("F5");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 F5", email, role: "USER" });
  await assign(page, email, path);

  await openAssign(page, email);
  await page.getByTestId("member-assign-group").selectOption({ label: path });
  await page.getByTestId("member-assign-submit").click();
  await expect(page.getByTestId(ASSIGN_DIALOG), "no refusal — the dialog closes").toBeHidden();
  await expect(page.getByTestId("member-assign-group-error"), "and no error element").toHaveCount(0);
  await expect(
    page.getByTestId(`members-row-${email}-group`),
    "the cell reads the same name afterwards"
  ).toHaveText(name);

  await deleteMember(page, email);
  await deleteGroup(page, path);
});

test("F-3 (section 6.3 item 6): a group rename is visible on /members, which is what the revalidation buys", async ({
  page,
}) => {
  // Not an acceptance criterion. It is the observable half of the three `revalidatePath("/members")`
  // lines this ticket adds to `src/actions/groups.ts`, and without a test they read as dead code to
  // whoever tidies up next. MEM-01's F-6 is the precedent: the same revalidation was missing there,
  // the seam route would have hidden it, and the e2e test is what reported it.
  const before = groupNameFor("F3Before");
  const path = await createGroup(page, { name: before });

  const email = emailFor("F3");
  await openMembers(page);
  await createMember(page, { name: "QA GRP02 F3", email, role: "USER" });
  await assign(page, email, path);
  await expect(page.getByTestId(`members-row-${email}-group`)).toHaveText(before);

  const renamed = groupNameFor("F3After");
  await openGroups(page);
  await page.getByTestId(`groups-row-${path}-edit`).click();
  await expect(page.getByTestId("group-edit-name")).toBeVisible();
  await page.getByTestId("group-edit-name").fill(renamed);
  await page.getByTestId("group-edit-submit").click();
  await expect(page.getByTestId(`groups-row-${renamed}`)).toBeVisible();

  await openMembers(page);
  await expect(
    page.getByTestId(`members-row-${email}-group`),
    "the members list shows the new name"
  ).toHaveText(renamed);

  await deleteMember(page, email);
  await deleteGroup(page, renamed);
});
