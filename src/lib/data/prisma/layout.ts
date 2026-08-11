import type { RoomLayout } from "../types";
import { notWired } from "./client";

export async function getRoomLayout(roomId: string): Promise<RoomLayout | null> {
  void roomId;
  return notWired("getRoomLayout");
}

export async function listRoomLayouts(): Promise<RoomLayout[]> {
  return notWired("listRoomLayouts");
}
