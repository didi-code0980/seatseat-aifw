import type {
  AssignDeviceOutcome,
  CreateDeviceOutcome,
  DeleteDeviceOutcome,
  DesignatePrimaryOutcome,
  Device,
  DevicePatch,
  NewDevice,
  UnassignDeviceOutcome,
  UpdateDeviceOutcome,
} from "../types";
import { notWired } from "./client";

// Every signature here is final and every body throws. `tests/unit/seam-parity.test.ts` holds this
// module to the same exported names and the same arity as `../mock/devices.ts`, so each parameter is
// declared and discarded with `void` rather than omitted — an omitted parameter is an arity drift
// the type system will not see and the parity test will.

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

export async function createDevice(input: NewDevice): Promise<CreateDeviceOutcome> {
  void input;
  return notWired("createDevice");
}

export async function updateDevice(id: string, patch: DevicePatch): Promise<UpdateDeviceOutcome> {
  void id;
  void patch;
  return notWired("updateDevice");
}

export async function assignDeviceToSeat(
  deviceId: string,
  seatId: string
): Promise<AssignDeviceOutcome> {
  void deviceId;
  void seatId;
  return notWired("assignDeviceToSeat");
}

export async function unassignDevice(deviceId: string): Promise<UnassignDeviceOutcome> {
  void deviceId;
  return notWired("unassignDevice");
}

export async function designatePrimaryDevice(deviceId: string): Promise<DesignatePrimaryOutcome> {
  void deviceId;
  return notWired("designatePrimaryDevice");
}

export async function deleteDevice(id: string): Promise<DeleteDeviceOutcome> {
  void id;
  return notWired("deleteDevice");
}
