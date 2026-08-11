import type { Device } from "../types";
import { notWired } from "./client";

export async function listDevices(): Promise<Device[]> {
  return notWired("listDevices");
}

export async function getDevice(id: string): Promise<Device | null> {
  void id;
  return notWired("getDevice");
}

export async function listUnassignedDevices(): Promise<Device[]> {
  return notWired("listUnassignedDevices");
}
