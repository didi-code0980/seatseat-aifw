import type { SeatRequest } from "../types";
import { notWired } from "./client";

export async function listRequests(): Promise<SeatRequest[]> {
  return notWired("listRequests");
}

export async function getRequest(id: string): Promise<SeatRequest | null> {
  void id;
  return notWired("getRequest");
}

export async function listPendingRequests(): Promise<SeatRequest[]> {
  return notWired("listPendingRequests");
}
