import { requests } from "../fixtures";
import type { SeatRequest } from "../types";

export async function listRequests(): Promise<SeatRequest[]> {
  return structuredClone(requests);
}

export async function getRequest(id: string): Promise<SeatRequest | null> {
  return structuredClone(requests.find((r) => r.id === id) ?? null);
}

export async function listPendingRequests(): Promise<SeatRequest[]> {
  return structuredClone(requests.filter((r) => r.state === "PENDING"));
}
