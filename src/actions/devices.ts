"use server";

// See the note in ./rooms.ts. Device CRUD is DEV-01 and its write contract is set at DESIGN.

import { devices } from "@/lib/data";
import type { Device } from "@/lib/data";

export async function getDevices(): Promise<Device[]> {
  return devices.listDevices();
}

/** INV-07: inventory is a real state, so it has a query of its own rather than a caller-side filter. */
export async function getUnassignedDevices(): Promise<Device[]> {
  return devices.listUnassignedDevices();
}
