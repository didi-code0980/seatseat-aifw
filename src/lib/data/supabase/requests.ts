import type { SeatRequest } from "../types";
import { db } from "./client";

const COLUMNS = "id, requesterId, kind, seatId, roomId, state";

export async function listRequests(): Promise<SeatRequest[]> {
  const { data, error } = await db().from("SeatRequest").select(COLUMNS).order("id");
  if (error !== null) throw error;
  return data;
}

export async function getRequest(id: string): Promise<SeatRequest | null> {
  const { data, error } = await db().from("SeatRequest").select(COLUMNS).eq("id", id).maybeSingle();
  if (error !== null) throw error;
  return data;
}

export async function listPendingRequests(): Promise<SeatRequest[]> {
  const { data, error } = await db()
    .from("SeatRequest")
    .select(COLUMNS)
    .eq("state", "PENDING")
    .order("id");
  if (error !== null) throw error;
  return data;
}
