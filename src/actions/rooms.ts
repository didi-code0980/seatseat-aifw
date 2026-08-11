"use server";

// Server actions for rooms.
//
// Deliberately read-only for now. Room CRUD is ticket ROO-01, and its write signatures are a DESIGN
// contract (RULE-04) — writing them here first would mean the Developer inherits names nobody
// reviewed. What this file establishes is the shape every action follows: validate, check
// permission, call the seam, never touch the database.

import { rooms } from "@/lib/data";
import type { Room } from "@/lib/data";

export async function getRooms(): Promise<Room[]> {
  return rooms.listRooms();
}
