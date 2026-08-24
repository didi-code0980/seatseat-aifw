import { expect, test, type Page } from "@playwright/test";

// MEM-01 — Member CRUD UI. Acceptance criteria from `01-story.md`, selectors from `02-design.md`
// section 6 and nowhere else (RULE-05). `src/**` was not read to write this file.
//
// Rows are keyed by member `email`, not by id — section 6. Every member this suite edits or deletes
// is one it created, so the key is a value the test supplied. The one exception is AC-10, whose
// Given is a member who occupies a seat and which section 6.2 says must use the seed READ-ONLY: it
// discovers that member by reading the seats cell, presses delete, and asserts the refusal. Pressing
// delete on that member writes nothing, by INV-12, so it leaves the seed as it found it. No fixture
// identifier is hardcoded anywhere below.
//
// Two constraints this file did not choose; section 6.2 imposes both.
//
// 1. Serial mode. `playwright.config.ts` sets `fullyParallel: true` and one production server holds
//    one mutable store. AC-3, AC-5 and AC-9 all assert that nothing else moved, which is not
//    meaningful while another worker is writing to the same array.
// 2. No member that was already there when this spec started is mutated. Spec files still run
//    against the server concurrently and `tests/e2e/devices.spec.ts` reads member full names out of
//    `device-create-owner`; renaming a seeded member would make an unrelated spec fail
//    intermittently, which is the worst failure this suite can produce because it does not reproduce.
//
// Every test that creates a member deletes it again unless the criterion consumed it, so the surface
// this suite leaves behind is the surface it found. AC-11 is the one exception and the note at the
// foot of this file says why the residue is left rather than cleaned up.
//
// AC-11 is covered here as well as at the seam. It was seam-only in the first QA pass, because the
// route section 6.3 describes did not work: a member created on /members was absent from
// `device-create-owner` on /devices. That was finding F-6, it was routed to `tech-lead-design`, and
// design version 2 resolved it in favour of section 6.3 — the member write actions now revalidate
// /devices too. The e2e test asserts that sentence directly and before it needs it, so if the
// revalidation ever goes away this file reports it rather than silently taking the seam route.

test.describe.configure({ mode: "serial" });

/** Unique per run, so a store surviving between runs cannot collide on the `@unique` email. */
const RUN = Date.now().toString(36).toLowerCase();
let minted = 0;

/**
 * Lowercase on purpose. Section 6 records that the row testid uses the email exactly as stored and
 * that `memberEmailSchema` trims but does not lowercase; supplying lowercase avoids the question.
 */
function emailFor(label: string): string {
  minted += 1;
  return `qa-e2e-${RUN}-${label.toLowerCase()}-${minted}@qa.internal`;
}

/**
 * A mixed-case address, for AC-3b only.
 *
 * Section 6: row testids use the email exactly as stored, so `members-row-QA-E2E-...@QA.Internal`
 * and its lowercase twin are two different, non-colliding testids — `getByTestId` matches an exact
 * string. A test that lowercased either value before building the selector would address the wrong
 * row or none, which is why this helper exists rather than an inline `.toUpperCase()` at the call
 * site.
 */
function mixedCaseEmailFor(label: string): string {
  minted += 1;
  return `QA-E2E-${RUN}-${label}-${minted}@QA.Internal`;
}

type RowState = { name: string; email: string; role: string; seats: string; signin: string };

/** Every email currently listed, read from the `members-row-<email>-email` cells. */
async function listedEmails(page: Page): Promise<string[]> {
  const cells = page.locator('[data-testid^="members-row-"][data-testid$="-email"]');
  return (await cells.allInnerTexts()).map((t) => t.trim()).filter((t) => t.length > 0);
}

async function cellText(page: Page, email: string, cell: string): Promise<string> {
  return (await page.getByTestId(`members-row-${email}-${cell}`).innerText()).trim();
}

/** The whole visible state of one row — what every "unchanged" clause in the story is about. */
async function rowState(page: Page, email: string): Promise<RowState> {
  return {
    name: await cellText(page, email, "name"),
    email: await cellText(page, email, "email"),
    role: await cellText(page, email, "role"),
    seats: await cellText(page, email, "seats"),
    signin: await cellText(page, email, "signin"),
  };
}

/** Every row on the page, keyed by email. The subject of "the member list is unchanged". */
async function snapshot(page: Page): Promise<Record<string, RowState>> {
  const out: Record<string, RowState> = {};
  for (const email of await listedEmails(page)) out[email] = await rowState(page, email);
  return out;
}

function without(snap: Record<string, RowState>, email: string): Record<string, RowState> {
  return Object.fromEntries(Object.entries(snap).filter(([key]) => key !== email));
}

async function openMembers(page: Page): Promise<void> {
  await page.goto("/members");
  await expect(page.getByTestId("members-page")).toBeVisible();
  await expect(page.getByTestId("members-table")).toBeVisible();
}

async function openCreateDialog(page: Page): Promise<void> {
  await page.getByTestId("members-create-open").click();
  await expect(page.getByTestId("member-create-dialog")).toBeVisible();
}

/** Create a member through the surface and return once its row is on the page. */
async function createMember(
  page: Page,
  fields: { name: string; email: string; role: "USER" | "MANAGER" | "ADMIN" }
): Promise<void> {
  await openCreateDialog(page);
  await page.getByTestId("member-create-name").fill(fields.name);
  await page.getByTestId("member-create-email").fill(fields.email);
  await page.getByTestId("member-create-role").selectOption(fields.role);
  await page.getByTestId("member-create-submit").click();
  await expect(page.getByTestId("member-create-dialog")).toBeHidden();
  await expect(page.getByTestId(`members-row-${fields.email}`)).toBeVisible();
}

/**
 * Delete a member through the surface, confirmation and all.
 *
 * Used as teardown, not as the act under test — AC-8 and AC-9 drive the dialog themselves and assert
 * on it. Teardown matters here: section 6.2 asks that the surface be left as it was found.
 */
async function deleteMember(page: Page, email: string): Promise<void> {
  await page.getByTestId(`members-row-${email}-delete`).click();
  await expect(page.getByTestId("member-delete-dialog")).toBeVisible();
  await page.getByTestId("member-delete-confirm").click();
  await expect(page.getByTestId(`members-row-${email}`)).toHaveCount(0);
}

test("AC-1: every member is listed with their role and their occupancy, and a create control is present", async ({
  page,
}) => {
  await openMembers(page);

  // The Given's second half — a member who occupies no seat — is constructible and is built here
  // rather than looked for (01-story.md A-6). The first half is the seed, read-only (section 6.2).
  const unseated = emailFor("AC1");
  await createMember(page, { name: "QA E2E AC1", email: unseated, role: "USER" });

  const emails = await listedEmails(page);
  expect(emails.length, "every member held by the system is listed").toBeGreaterThan(1);
  expect(emails, "including the one just created").toContain(unseated);

  for (const email of emails) {
    const row = await rowState(page, email);
    expect(["USER", "MANAGER", "ADMIN"], `${email} shows the role recorded for them`).toContain(row.role);
    expect(
      row.seats.length,
      `${email} shows either the seats they occupy or that they occupy none — never blank`
    ).toBeGreaterThan(0);
  }

  // "either the seats they currently occupy, or that they occupy none" — both halves are on screen.
  const seatCells = await Promise.all(emails.map((e) => cellText(page, e, "seats")));
  expect(
    seatCells.filter((s) => s !== "none").length,
    "at least one member is shown occupying seats — 01-story.md A-5"
  ).toBeGreaterThan(0);
  expect(await cellText(page, unseated, "seats"), "and the member just created occupies none").toBe("none");

  await expect(page.getByTestId("members-create-open"), "a control to create a member is present").toBeVisible();

  await deleteMember(page, unseated);
});

test("AC-2: a member is created with the role chosen, occupies no seat, and is confirmed without a reload", async ({
  page,
}) => {
  await openMembers(page);
  const before = await snapshot(page);

  const email = emailFor("AC2");
  let loads = 0;
  page.on("load", () => {
    loads += 1;
  });

  await openCreateDialog(page);
  await page.getByTestId("member-create-name").fill("QA E2E AC2");
  await page.getByTestId("member-create-email").fill(email);
  await page.getByTestId("member-create-role").selectOption("MANAGER");
  await page.getByTestId("member-create-submit").click();

  // "And the outcome is confirmed to me without my having to reload the page." No `goto`, no
  // `reload`, and no document load fired by the act.
  await expect(page.getByTestId("member-create-dialog")).toBeHidden();
  await expect(page.getByTestId(`members-row-${email}`)).toBeVisible();
  // Retrying, and before the snapshot below. A server action returns before the refreshed list has
  // landed, so a bare innerText() read here is a race that only loses under load.
  await expect(page.getByTestId(`members-row-${email}-role`)).toHaveText("MANAGER");
  expect(loads, "the page did not reload to show the outcome").toBe(0);

  const row = await rowState(page, email);
  expect(row.name, "the new member appears with the name supplied").toBe("QA E2E AC2");
  expect(row.role, "with the role I chose").toBe("MANAGER");
  expect(row.seats, "and is shown as occupying no seat").toBe("none");

  const after = await snapshot(page);
  expect(without(after, email), "no other member changed").toEqual(before);

  await deleteMember(page, email);
});

test("AC-3: creation is refused when a required field is missing, blank, or no role is chosen", async ({ page }) => {
  await openMembers(page);
  const before = await snapshot(page);

  // Submitted empty. The role select opens on its placeholder (`value=""`, section 6), which is what
  // makes "no role chosen" reachable at all.
  await openCreateDialog(page);
  await page.getByTestId("member-create-submit").click();

  await expect(page.getByTestId("member-create-name-error"), "a message against the name").toBeVisible();
  await expect(page.getByTestId("member-create-email-error"), "a message against the email").toBeVisible();
  await expect(page.getByTestId("member-create-role-error"), "a message against the role").toBeVisible();
  await expect(page.getByTestId("member-create-dialog"), "and the dialog is still open").toBeVisible();

  // The whitespace half of the criterion — "consisting only of whitespace" — which a `required`
  // attribute alone would let through.
  await page.getByTestId("member-create-name").fill("   ");
  await page.getByTestId("member-create-email").fill("   ");
  await page.getByTestId("member-create-submit").click();

  await expect(page.getByTestId("member-create-name-error"), "whitespace is not a name").toBeVisible();
  await expect(page.getByTestId("member-create-email-error"), "whitespace is not an email").toBeVisible();
  await expect(page.getByTestId("member-create-role-error"), "and the role is still unchosen").toBeVisible();

  // A valid name and email with the role left on its placeholder: the role refusal on its own, so a
  // form that refuses everything whenever any field is blank is not what is being observed.
  const email = emailFor("AC3");
  await page.getByTestId("member-create-name").fill("QA E2E AC3");
  await page.getByTestId("member-create-email").fill(email);
  await page.getByTestId("member-create-submit").click();
  await expect(page.getByTestId("member-create-role-error"), "no role chosen is refused on its own").toBeVisible();
  await expect(page.getByTestId("member-create-dialog")).toBeVisible();

  await page.getByTestId("member-create-cancel").click();
  await expect(page.getByTestId("member-create-dialog")).toBeHidden();

  expect(await listedEmails(page), "no member is created").not.toContain(email);
  expect(await snapshot(page), "and the member list is unchanged").toEqual(before);
});

test("AC-3a: creation is refused when the email is already held by another member", async ({ page }) => {
  await openMembers(page);

  // The Given: "a member exists whose email is a known value". Created here, because no seeded email
  // may be quoted (RULE-05) and section 6.2 forbids mutating a member that was already there.
  const incumbent = emailFor("AC3a");
  await createMember(page, { name: "QA E2E AC3a incumbent", email: incumbent, role: "MANAGER" });

  const before = await snapshot(page);

  await openCreateDialog(page);
  await page.getByTestId("member-create-name").fill("QA E2E AC3a duplicate");
  await page.getByTestId("member-create-email").fill(incumbent); // character for character
  await page.getByTestId("member-create-role").selectOption("USER");
  await page.getByTestId("member-create-submit").click();

  await expect(
    page.getByTestId("member-create-email-error"),
    "a validation message is shown against the email"
  ).toBeVisible();
  await expect(page.getByTestId("member-create-dialog"), "and the dialog stays open").toBeVisible();
  // The name and role were valid, so neither may be blamed. Section 6: the `-error` elements are
  // absent until the corresponding failure occurs, so their absence is the assertion that the
  // refusal is the email's and not a blanket rejection of the whole form.
  await expect(page.getByTestId("member-create-name-error"), "and not against the name").toHaveCount(0);
  await expect(page.getByTestId("member-create-role-error"), "nor against the role").toHaveCount(0);

  await page.getByTestId("member-create-cancel").click();
  await expect(page.getByTestId("member-create-dialog")).toBeHidden();

  const after = await snapshot(page);
  expect(Object.keys(after).length, "no member is created").toBe(Object.keys(before).length);
  expect(after, "the member list is unchanged, and so is the member who holds that email").toEqual(before);

  await deleteMember(page, incumbent);
});

test("AC-3b: an email differing only in case is created, and both members are listed with their own email", async ({
  page,
}) => {
  // The one criterion in this story asserting that a refusal must NOT happen. `Member.email` is
  // `@unique` and Postgres compares it case-sensitively, so these are two members. An over-strict,
  // case-folding check never produces a wrong row — only a rejected one — so no other test here
  // would see it.
  await openMembers(page);

  const upper = mixedCaseEmailFor("AC3b");
  const lower = upper.toLowerCase();
  expect(upper, "the two addresses differ, and differ only in case").not.toBe(lower);

  await createMember(page, { name: "QA E2E AC3b upper", email: upper, role: "USER" });

  const before = await snapshot(page);

  // Not `createMember`: this submission is the act under test and must be observed rather than
  // asserted through a helper that presumes success.
  await openCreateDialog(page);
  await page.getByTestId("member-create-name").fill("QA E2E AC3b lower");
  await page.getByTestId("member-create-email").fill(lower);
  await page.getByTestId("member-create-role").selectOption("USER");
  await page.getByTestId("member-create-submit").click();

  await expect(
    page.getByTestId("member-create-email-error"),
    "no duplicate message — section 6 records this element as absent on AC-3b, which is a permitted creation"
  ).toHaveCount(0);
  await expect(page.getByTestId("member-create-dialog"), "the dialog closed, so the member was created").toBeHidden();

  // "And both members appear in the member list, each with their own email." Both testids are built
  // from the address exactly as stored, and they do not collide.
  await expect(page.getByTestId(`members-row-${lower}`), "the lower-case member is listed").toBeVisible();
  await expect(page.getByTestId(`members-row-${upper}`), "and so is the upper-case one").toBeVisible();
  await expect(page.getByTestId(`members-row-${lower}-name`)).toHaveText("QA E2E AC3b lower");

  const after = await snapshot(page);
  expect(Object.keys(after).length, "exactly one member was added").toBe(Object.keys(before).length + 1);
  expect(await cellText(page, upper, "email"), "the upper-case address is stored as supplied").toBe(upper);
  expect(await cellText(page, lower, "email"), "and the lower-case one as supplied").toBe(lower);
  expect(
    await cellText(page, upper, "name"),
    "the two rows are distinct members, not one row overwritten"
  ).toBe("QA E2E AC3b upper");

  await deleteMember(page, lower);
  await deleteMember(page, upper);
});

test("AC-3c: creation is refused when the email is not a well-formed address", async ({ page }) => {
  await openMembers(page);
  const before = await snapshot(page);

  // A blank email first, to read the message the blank check produces. Section 6: `memberEmailSchema`
  // runs `.min(1)` before `.email()` and the action takes the first message per field, so the two
  // refusals are distinguishable — and a form with no format check at all would show this message
  // for the blank and nothing at all for `banana`.
  await openCreateDialog(page);
  await page.getByTestId("member-create-name").fill("QA E2E AC3c");
  await page.getByTestId("member-create-role").selectOption("USER");
  await page.getByTestId("member-create-submit").click();
  await expect(page.getByTestId("member-create-email-error")).toBeVisible();
  const blankMessage = (await page.getByTestId("member-create-email-error").innerText()).trim();

  // The criterion: a malformed address, every other field valid.
  await page.getByTestId("member-create-email").fill("banana");
  await page.getByTestId("member-create-submit").click();

  await expect(
    page.getByTestId("member-create-email-error"),
    "a validation message is shown against the email"
  ).toBeVisible();
  // RETRYING, and it has to be. The blank message is already on screen from the submission above,
  // and the server action that replaces it returns on a later tick — a one-shot `innerText()` here
  // reads the stale message whenever the server is busy. Asserted as "a different message from the
  // blank one" rather than by literal text: section 6 documents both strings and warns that
  // asserting the wrong one of the two looks like a defect in the code, and what the criterion
  // needs is only that the format check exists and is its own refusal.
  await expect(
    page.getByTestId("member-create-email-error"),
    "the format refusal is its own message, not the blank-field one"
  ).not.toHaveText(blankMessage);
  await expect(page.getByTestId("member-create-dialog"), "and the dialog stays open").toBeVisible();
  await expect(page.getByTestId("member-create-name-error"), "and not against the name").toHaveCount(0);
  await expect(page.getByTestId("member-create-role-error"), "nor against the role").toHaveCount(0);

  // A second malformed shape, so the criterion is not carried by one string that happens to fail.
  await page.getByTestId("member-create-email").fill("qa@");
  await page.getByTestId("member-create-submit").click();
  await expect(page.getByTestId("member-create-email-error"), "an address with no domain is refused").toBeVisible();
  await expect(page.getByTestId("member-create-dialog")).toBeVisible();

  await page.getByTestId("member-create-cancel").click();
  await expect(page.getByTestId("member-create-dialog")).toBeHidden();

  expect(await listedEmails(page), "no member is created").not.toContain("banana");
  expect(await snapshot(page), "and the member list is unchanged").toEqual(before);
});

test("AC-4: the create form offers no way to sign in, and the member it creates has no account (INV-08)", async ({
  page,
}) => {
  await openMembers(page);
  await openCreateDialog(page);

  const dialog = page.getByTestId("member-create-dialog");

  // "no field asks for a password, a credential, or any other means of signing in"
  await expect(dialog.locator('input[type="password"]'), "no password input").toHaveCount(0);
  const fieldAttrs = await dialog.locator("input, select, textarea").evaluateAll((nodes) =>
    nodes.map((n) =>
      ["type", "name", "id", "placeholder", "autocomplete", "data-testid"]
        .map((a) => n.getAttribute(a) ?? "")
        .join(" ")
        .toLowerCase()
    )
  );
  expect(fieldAttrs.length, "the dialog does have fields, so the sweep is not vacuous").toBeGreaterThan(0);
  for (const attrs of fieldAttrs) {
    expect(attrs, `a field asks for a credential: ${attrs}`).not.toMatch(
      /password|passphrase|credential|secret|otp|sign-?in|login|invite/
    );
  }

  // "no control offers to grant the new member the ability to sign in"
  const controlLabels = await dialog.locator("button, a, [role='button']").allInnerTexts();
  for (const label of controlLabels) {
    expect(label.toLowerCase(), `a control offers sign-in: ${label}`).not.toMatch(
      /password|credential|invite|grant access|sign in|create account|send invitation/
    );
  }

  await expect(
    page.getByTestId("member-create-no-account"),
    "the form states plainly that creating a member creates no sign-in account"
  ).toBeVisible();

  const email = emailFor("AC4");
  await page.getByTestId("member-create-name").fill("QA E2E AC4");
  await page.getByTestId("member-create-email").fill(email);
  await page.getByTestId("member-create-role").selectOption("ADMIN");
  await page.getByTestId("member-create-submit").click();
  await expect(page.getByTestId("member-create-dialog")).toBeHidden();
  await expect(page.getByTestId(`members-row-${email}`)).toBeVisible();

  expect(
    await cellText(page, email, "signin"),
    "the surface reports no account as having been created"
  ).toBe("no account");

  // The control. Without it the assertion above is trivially true of every row and would still pass
  // against a surface whose sign-in column always read `no account` (section 6).
  const signins = await Promise.all((await listedEmails(page)).map((e) => cellText(page, e, "signin")));
  expect(
    signins.filter((s) => s === "account").length,
    "some member does hold an account, so `no account` is informative"
  ).toBeGreaterThan(0);

  await deleteMember(page, email);
});

test("AC-5: an existing member's attributes are changed, and nothing else is", async ({ page }) => {
  await openMembers(page);
  const email = emailFor("AC5");
  await createMember(page, { name: "QA E2E AC5", email, role: "USER" });

  const before = await snapshot(page);
  const beforeSelf = before[email]!;

  await page.getByTestId(`members-row-${email}-edit`).click();
  await expect(page.getByTestId("member-edit-dialog")).toBeVisible();
  expect(
    await page.getByTestId("member-edit-name").inputValue(),
    "the edit form is pre-filled with the current value"
  ).toBe("QA E2E AC5");
  await page.getByTestId("member-edit-name").fill("QA E2E AC5 edited");
  await page.getByTestId("member-edit-submit").click();
  await expect(page.getByTestId("member-edit-dialog")).toBeHidden();
  // Retrying, and before the snapshot: the dialog closes when the action returns, not when the
  // refreshed list arrives.
  await expect(page.getByTestId(`members-row-${email}-name`)).toHaveText("QA E2E AC5 edited");

  const after = await snapshot(page);
  const self = after[email]!;
  expect(self.name, "the list shows that member with the new value").toBe("QA E2E AC5 edited");
  expect(self.role, "and their role is unchanged").toBe(beforeSelf.role);
  expect(self.seats, "and the seats they occupy are unchanged").toBe(beforeSelf.seats);
  expect(self.email, "and their email is unchanged").toBe(beforeSelf.email);

  // "And no other member is changed in any respect."
  expect(without(after, email), "no other member is changed in any respect").toEqual(without(before, email));

  await deleteMember(page, email);
});

test("AC-6: a member's role is changed, and nothing else about them or anyone else changes", async ({ page }) => {
  await openMembers(page);
  const email = emailFor("AC6");
  await createMember(page, { name: "QA E2E AC6", email, role: "USER" });

  const before = await snapshot(page);
  const beforeSelf = before[email]!;
  expect(beforeSelf.role, "the Given: their recorded role is USER").toBe("USER");

  await page.getByTestId(`members-row-${email}-edit`).click();
  await expect(page.getByTestId("member-edit-dialog")).toBeVisible();
  expect(
    await page.getByTestId("member-edit-role").inputValue(),
    "the role select is pre-selected to the current role"
  ).toBe("USER");
  await page.getByTestId("member-edit-role").selectOption("MANAGER");
  await page.getByTestId("member-edit-submit").click();
  await expect(page.getByTestId("member-edit-dialog")).toBeHidden();
  await expect(page.getByTestId(`members-row-${email}-role`)).toHaveText("MANAGER");

  const after = await snapshot(page);
  const self = after[email]!;
  expect(self.role, "the list shows that member with the role MANAGER").toBe("MANAGER");
  expect(
    { name: self.name, email: self.email, seats: self.seats, signin: self.signin },
    "nothing else about that member changes"
  ).toEqual({
    name: beforeSelf.name,
    email: beforeSelf.email,
    seats: beforeSelf.seats,
    signin: beforeSelf.signin,
  });

  // "And no other member's role changes."
  for (const [other, state] of Object.entries(before)) {
    if (other === email) continue;
    expect(after[other]?.role, `${other} keeps the role they had`).toBe(state.role);
  }

  await deleteMember(page, email);
});

test("AC-7: editing is refused when a required field is cleared, and the member keeps its previous values", async ({
  page,
}) => {
  await openMembers(page);
  const email = emailFor("AC7");
  await createMember(page, { name: "QA E2E AC7", email, role: "MANAGER" });

  const before = await snapshot(page);
  const beforeSelf = before[email]!;

  // Cleared, then whitespace — the criterion says "emptied or reduced to whitespace" and they are
  // two different inputs to the same schema.
  await page.getByTestId(`members-row-${email}-edit`).click();
  await expect(page.getByTestId("member-edit-dialog")).toBeVisible();
  await page.getByTestId("member-edit-name").fill("");
  await page.getByTestId("member-edit-email").fill("");
  await page.getByTestId("member-edit-submit").click();
  await expect(page.getByTestId("member-edit-name-error"), "a message against the name").toBeVisible();
  await expect(page.getByTestId("member-edit-email-error"), "a message against the email").toBeVisible();
  await expect(page.getByTestId("member-edit-dialog"), "the dialog stays open").toBeVisible();

  await page.getByTestId("member-edit-name").fill("   ");
  await page.getByTestId("member-edit-email").fill("   ");
  await page.getByTestId("member-edit-submit").click();
  await expect(page.getByTestId("member-edit-name-error"), "whitespace is not a name").toBeVisible();
  await expect(page.getByTestId("member-edit-email-error"), "whitespace is not an email").toBeVisible();

  // "or with no role selected" — reachable because the edit select carries the same empty
  // placeholder as create (section 6).
  await page.getByTestId("member-edit-name").fill("QA E2E AC7 attempted");
  await page.getByTestId("member-edit-email").fill(email);
  await page.getByTestId("member-edit-role").selectOption("");
  await page.getByTestId("member-edit-submit").click();
  await expect(page.getByTestId("member-edit-role-error"), "a message against the role").toBeVisible();
  await expect(page.getByTestId("member-edit-dialog")).toBeVisible();

  await page.getByTestId("member-edit-cancel").click();
  await expect(page.getByTestId("member-edit-dialog")).toBeHidden();

  const after = await snapshot(page);
  expect(after[email], "the list still shows that member's previous values").toEqual(beforeSelf);
  expect(after, "and the member is not changed, nor is anyone else").toEqual(before);

  await deleteMember(page, email);
});

test("AC-7a: editing is refused when the email is already held by a different member", async ({ page }) => {
  await openMembers(page);

  // "Given two members exist with different emails."
  const subject = emailFor("AC7a-subject");
  const other = emailFor("AC7a-other");
  await createMember(page, { name: "QA E2E AC7a subject", email: subject, role: "USER" });
  await createMember(page, { name: "QA E2E AC7a other", email: other, role: "MANAGER" });

  const before = await snapshot(page);

  await page.getByTestId(`members-row-${subject}-edit`).click();
  await expect(page.getByTestId("member-edit-dialog")).toBeVisible();
  await page.getByTestId("member-edit-email").fill(other); // character for character
  await page.getByTestId("member-edit-submit").click();

  await expect(
    page.getByTestId("member-edit-email-error"),
    "a validation message is shown against the email"
  ).toBeVisible();
  await expect(page.getByTestId("member-edit-dialog"), "and the dialog stays open").toBeVisible();
  await expect(page.getByTestId("member-edit-name-error"), "and not against the name").toHaveCount(0);
  await expect(page.getByTestId("member-edit-role-error"), "nor against the role").toHaveCount(0);

  await page.getByTestId("member-edit-cancel").click();
  await expect(page.getByTestId("member-edit-dialog")).toBeHidden();

  // "Then neither member is changed ... And the list still shows both members with the emails they had."
  const after = await snapshot(page);
  expect(after, "neither member is changed, and nor is anyone else").toEqual(before);
  await expect(page.getByTestId(`members-row-${subject}`), "the subject keeps the email it had").toBeVisible();
  await expect(page.getByTestId(`members-row-${other}`), "and so does the other member").toBeVisible();

  await deleteMember(page, subject);
  await deleteMember(page, other);
});

test("AC-7b: editing is refused when the email is not a well-formed address", async ({ page }) => {
  await openMembers(page);
  const email = emailFor("AC7b");
  await createMember(page, { name: "QA E2E AC7b", email, role: "USER" });

  const before = await snapshot(page);
  const beforeSelf = before[email]!;

  await page.getByTestId(`members-row-${email}-edit`).click();
  await expect(page.getByTestId("member-edit-dialog")).toBeVisible();

  // The blank message first, so the format refusal below is asserted as a distinct one rather than
  // as "some message appeared" — the same reasoning as AC-3c, and section 6 gives the same ordering
  // rule for the edit schema.
  await page.getByTestId("member-edit-email").fill("");
  await page.getByTestId("member-edit-submit").click();
  await expect(page.getByTestId("member-edit-email-error")).toBeVisible();
  const blankMessage = (await page.getByTestId("member-edit-email-error").innerText()).trim();

  await page.getByTestId("member-edit-email").fill("banana");
  await page.getByTestId("member-edit-submit").click();

  await expect(
    page.getByTestId("member-edit-email-error"),
    "a validation message is shown against the email"
  ).toBeVisible();
  // Retrying, for the same reason AC-3c is: the blank message is still on screen when the click
  // returns, and the format message replaces it a tick later.
  await expect(
    page.getByTestId("member-edit-email-error"),
    "the format refusal is its own message, not the blank-field one"
  ).not.toHaveText(blankMessage);
  await expect(page.getByTestId("member-edit-dialog"), "and the dialog stays open").toBeVisible();
  await expect(page.getByTestId("member-edit-name-error"), "and not against the name").toHaveCount(0);

  await page.getByTestId("member-edit-cancel").click();
  await expect(page.getByTestId("member-edit-dialog")).toBeHidden();

  // "Then the member is not changed. And the list still shows that member's previous values."
  const after = await snapshot(page);
  expect(after[email], "the list still shows that member's previous values").toEqual(beforeSelf);
  expect(after, "and nobody else moved").toEqual(before);

  await deleteMember(page, email);
});

test("AC-8: deletion is not performed until it is confirmed", async ({ page }) => {
  await openMembers(page);
  const email = emailFor("AC8");
  await createMember(page, { name: "QA E2E AC8", email, role: "USER" });

  const before = await snapshot(page);
  const beforeSelf = before[email]!;
  expect(beforeSelf.seats, "the Given: they occupy no seat").toBe("none");

  await page.getByTestId(`members-row-${email}-delete`).click();
  await expect(
    page.getByTestId("member-delete-dialog"),
    "a member who can be deleted is asked to confirm"
  ).toBeVisible();
  await expect(page.getByTestId("member-delete-message"), "and told what will happen").toBeVisible();
  await page.getByTestId("member-delete-cancel").click();
  await expect(page.getByTestId("member-delete-dialog")).toBeHidden();

  await expect(
    page.getByTestId(`members-row-${email}`),
    "that member still appears in the member list"
  ).toBeVisible();
  const after = await snapshot(page);
  expect(after[email], "with their role and the seats they occupy unchanged").toEqual(beforeSelf);
  expect(after, "and nothing else moved").toEqual(before);

  await deleteMember(page, email);
});

test("AC-9: a member who is referenced by nothing is deleted, and no one else is affected", async ({ page }) => {
  await openMembers(page);
  const email = emailFor("AC9");
  await createMember(page, { name: "QA E2E AC9", email, role: "USER" });

  const before = await snapshot(page);
  expect(before[email]?.seats, "the Given: they occupy no seat").toBe("none");

  await page.getByTestId(`members-row-${email}-delete`).click();
  await expect(page.getByTestId("member-delete-dialog")).toBeVisible();
  await page.getByTestId("member-delete-confirm").click();
  await expect(page.getByTestId("member-delete-dialog")).toBeHidden();

  await expect(
    page.getByTestId(`members-row-${email}`),
    "that member no longer appears in the member list"
  ).toHaveCount(0);

  const after = await snapshot(page);
  // "And no other member is affected. And no seat changes its occupant." The seats cell of every
  // surviving row is this surface's account of occupancy, and it is what AC-1 put there.
  expect(after, "no other member is affected, and no seat changes its occupant").toEqual(without(before, email));
});

test("AC-10: deleting a member who occupies a seat is refused, and the refusal names the seat (INV-12)", async ({
  page,
}) => {
  await openMembers(page);

  // Section 6.2: this is the one criterion that needs the seed, and it needs it read-only. The
  // member is identified by reading the seats cell, and the seat codes reach the assertion from that
  // cell rather than from a fixture QA may not read.
  const emails = await listedEmails(page);
  const seatCells = await Promise.all(emails.map(async (e) => [e, await cellText(page, e, "seats")] as const));
  const occupied = seatCells.find(([, seats]) => seats !== "none");
  expect(occupied, "no member occupies a seat; AC-10 has no Given (01-story.md A-5)").toBeDefined();
  const [email, seatsOnRow] = occupied!;

  const before = await snapshot(page);

  await page.getByTestId(`members-row-${email}-delete`).click();

  await expect(
    page.getByTestId("member-delete-refused-dialog"),
    "the deletion is refused"
  ).toBeVisible();
  // "a member who cannot be deleted is not asked to confirm something that will not happen"
  await expect(page.getByTestId("member-delete-dialog"), "no confirmation dialog opens").toHaveCount(0);
  await expect(page.getByTestId("member-delete-confirm"), "and the refusal has no confirm control").toHaveCount(0);
  await expect(page.getByTestId("member-delete-refused-message")).toBeVisible();

  expect(
    (await page.getByTestId("member-delete-refused-seats").innerText()).trim(),
    "the refusal names each seat that member occupies, and agrees with the row"
  ).toBe(seatsOnRow);

  await page.getByTestId("member-delete-refused-dismiss").click();
  await expect(page.getByTestId("member-delete-refused-dialog")).toBeHidden();

  const after = await snapshot(page);
  expect(
    after[email],
    "that member still appears, with their role and their occupied seats unchanged"
  ).toEqual(before[email]);
  expect(after, "and no seat changes its occupant").toEqual(before);
});

test("AC-11: deleting a member who owns a device is refused, and the refusal states how many (INV-12)", async ({
  page,
}) => {
  // AC-11's Given — a member who occupies no seat and owns at least one device — has no member-side
  // write that can build it, so it is built through DEV-01's create dialog using the five selectors
  // section 6.3 restates. This test exists at e2e as well as at the seam because section 6.3's
  // load-bearing sentence is now true: the member actions revalidate `/devices` as well as
  // `/members`, so a member created on `/members` reaches `device-create-owner` without a device
  // being written first, and the assertion below is what would catch that revalidation going away.
  const email = emailFor("AC11");
  const fullName = `QA E2E AC11 ${RUN}-${minted}`;

  await openMembers(page);
  await createMember(page, { name: fullName, email, role: "USER" });
  expect(await cellText(page, email, "seats"), "the Given holds occupancy at zero").toBe("none");

  // Straight to /devices with no intervening device write. Section 6.3: "if the new member is absent
  // from device-create-owner, the revalidation is missing, and the correct response is to report it
  // rather than to create a throwaway device first to force the refresh."
  await page.goto("/devices");
  await page.getByTestId("devices-create-open").click();
  // Waited for through one of the five selectors section 6.3 restates. `device-create-dialog` is not
  // among them, and section 6 says a control absent from the table does not exist as far as QA is
  // concerned — so the owner select's own visibility is what marks the dialog open.
  await expect(page.getByTestId("device-create-owner")).toBeVisible();

  const ownerLabels = await page
    .getByTestId("device-create-owner")
    .locator("option")
    .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? "").trim()));
  expect(
    ownerLabels,
    "the member just created on /members is offered as a device owner — DEV-01 AC-2, and the sentence section 6.3 calls load-bearing"
  ).toContain(fullName);

  const assetTag = `AST-9${RUN}${minted}`.toUpperCase().slice(0, 20);
  await page.getByTestId("device-create-tag").fill(assetTag);
  await page.getByTestId("device-create-model").fill("QA model AC11");
  await page.getByTestId("device-create-owner").selectOption({ label: fullName });
  await page.getByTestId("device-create-submit").click();
  // The device row's own selectors are NOT asserted on, here or below. Section 6.3 restates exactly
  // five DEV-01 selectors and section 6 says a control absent from it does not exist as far as QA is
  // concerned; `devices-row-*` is not among the five. That the device exists and is owned by this
  // member is established where this ticket's own contract states it — the refusal count below.
  await expect(page.getByTestId("device-create-owner"), "the device was created").toHaveCount(0);

  await openMembers(page);
  const before = await snapshot(page);
  expect(before[email]?.seats, "still occupying no seat, so the device half is tested alone").toBe("none");

  await page.getByTestId(`members-row-${email}-delete`).click();

  await expect(page.getByTestId("member-delete-refused-dialog"), "the deletion is refused").toBeVisible();
  // "a member who cannot be deleted is not asked to confirm something that will not happen"
  await expect(page.getByTestId("member-delete-dialog"), "no confirmation dialog opens").toHaveCount(0);
  await expect(page.getByTestId("member-delete-confirm"), "and the refusal has no confirm control").toHaveCount(0);
  await expect(page.getByTestId("member-delete-refused-message")).toBeVisible();

  // "And the refusal states how many devices that member owns." Section 6: a bare integer, always
  // rendered, `0` when none — so this is read as a number and not searched for in the sentence.
  expect(
    (await page.getByTestId("member-delete-refused-devices").innerText()).trim(),
    "the refusal states how many devices that member owns"
  ).toBe("1");
  // And the seat half reads `none` in the same dialog, which is what makes AC-10 and AC-11 separable
  // rather than two readings of one combined refusal.
  expect(
    (await page.getByTestId("member-delete-refused-seats").innerText()).trim(),
    "the seat half is empty — this is the device half of INV-12 on its own"
  ).toBe("none");

  await page.getByTestId("member-delete-refused-dismiss").click();
  await expect(page.getByTestId("member-delete-refused-dialog")).toBeHidden();

  const after = await snapshot(page);
  expect(after[email], "that member still appears in the member list, unchanged in every respect").toEqual(
    before[email]
  );
  expect(after, "and no other member is affected").toEqual(before);

  // "And every device that member owns is unchanged — same owner, same seat, same primary or
  // secondary designation." Asserted here as the strongest statement available inside this ticket's
  // channel: the refusal still reports the same one device, so the refused delete released nothing.
  // The full statement — the entire device table bit-identical across the refusal, owner, seat and
  // rank included — is `tests/unit/members.test.ts`'s AC-11 case, which can read the device rows by
  // value through the seam call section 6.1 grants.
  await page.getByTestId(`members-row-${email}-delete`).click();
  await expect(page.getByTestId("member-delete-refused-dialog")).toBeVisible();
  expect(
    (await page.getByTestId("member-delete-refused-devices").innerText()).trim(),
    "the device that member owns is still theirs after the refusal"
  ).toBe("1");
  await page.getByTestId("member-delete-refused-dismiss").click();
  await expect(page.getByTestId("member-delete-refused-dialog")).toBeHidden();
});

// WHAT THIS TEST LEAVES BEHIND, AND WHY IT IS LEFT.
//
// The member and the device AC-11 created both survive the run. That is not an omission: INV-12 makes
// that member undeletable for exactly as long as it owns the device, and releasing it would mean a
// device write — which `01-story.md` out-of-scope item 4 forbids this ticket in terms ("a member
// surface that grows a reassign this device control has left this ticket") and section 6.3 repeats
// ("no device is assigned, designated or deleted").
//
// Section 6.2's rule is that no member **that was already there when the spec started** is mutated,
// and this residue is a member this spec created. It touches no seeded row, and `devices.spec.ts`
// picks owners by label from whatever the select holds, so one extra option changes nothing there.
