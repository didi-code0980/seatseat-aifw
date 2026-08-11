import { devices } from "../fixtures";
import type { Device } from "../types";

export async function listDevices(): Promise<Device[]> {
  return structuredClone(devices);
}

export async function getDevice(id: string): Promise<Device | null> {
  return structuredClone(devices.find((d) => d.id === id) ?? null);
}

/** INV-07: devices may exist unassigned in inventory, so this is a first-class query, not a filter. */
export async function listUnassignedDevices(): Promise<Device[]> {
  return structuredClone(devices.filter((d) => d.seatId === null));
}
