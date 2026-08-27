import type { Account } from "../types";
import { db } from "./client";

// The DTO's four fields, named explicitly. `SELECT *` would carry `createdAt`, `updatedAt` and
// `auth_user_id` across the seam, and `Account` in `../types.ts` declares none of them.
const COLUMNS = "id, memberId, email, createdById";

// Ordered by `id` throughout this directory. PostgREST returns rows in no defined order otherwise,
// and the mock returns them in fixture order — which for every seeded collection is the same thing,
// because the fixture ids sort into the order `fixtures.ts` writes them (`acc-admin`,
// `acc-manager`, `acc-user`). AC-12 compares the two modes and needs them to agree.
export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await db().from("Account").select(COLUMNS).order("id");
  if (error !== null) throw error;
  return data;
}

export async function getAccount(id: string): Promise<Account | null> {
  const { data, error } = await db().from("Account").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data;
}
