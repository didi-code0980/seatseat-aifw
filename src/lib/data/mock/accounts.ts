import { accounts } from "../fixtures";
import type { Account } from "../types";

export async function listAccounts(): Promise<Account[]> {
  return structuredClone(accounts);
}

export async function getAccount(id: string): Promise<Account | null> {
  return structuredClone(accounts.find((a) => a.id === id) ?? null);
}
