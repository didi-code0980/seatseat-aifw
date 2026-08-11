import type { Account } from "../types";
import { notWired } from "./client";

export async function listAccounts(): Promise<Account[]> {
  return notWired("listAccounts");
}

export async function getAccount(id: string): Promise<Account | null> {
  void id;
  return notWired("getAccount");
}
