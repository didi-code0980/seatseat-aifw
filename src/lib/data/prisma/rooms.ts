import type { Room } from "../types";
import { notWired } from "./client";

export async function listRooms(): Promise<Room[]> {
  return notWired("listRooms");
}

export async function getRoom(id: string): Promise<Room | null> {
  void id;
  return notWired("getRoom");
}
