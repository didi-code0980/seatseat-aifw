import type { JSX } from "react";

import { DevicesManager } from "./devices-manager";
import { devices, members, rooms, seats } from "@/lib/data";
import type { Device } from "@/lib/data";

/**
 * One rendered row. `seatCode === null` is the whole of "this device is unassigned".
 *
 * The occupant is carried because INV-05 makes a primary designation legal or illegal according to a
 * fact about the seat, and a person cannot make that designation correctly against a screen that
 * hides the fact (01-story.md AC-1).
 */
export interface DeviceRow {
  device: Device;
  /** The owner's full name, or null when the device has no owner (02-design.md F-3). */
  ownerName: string | null;
  /** The code of the seat the device sits on, or null when it sits in inventory. */
  seatCode: string | null;
  /** The occupant of that seat, or null when the seat is vacant. Meaningless when seatCode is null. */
  occupantName: string | null;
}

export interface MemberOption {
  id: string;
  fullName: string;
}

export interface SeatOption {
  id: string;
  code: string;
  roomCode: string;
  occupantName: string | null;
}

/**
 * A server component that reads through the seam and holds no state.
 *
 * Four existing reads and no new seam function. The join into `DeviceRow[]` happens here rather than
 * behind a `listDeviceRows()` because a joined DTO puts a new *shape* across the seam rather than a
 * new name, and shape is the one thing `tests/unit/seam-parity.test.ts` does not check — a mock
 * returning a joined row the Prisma implementation cannot reproduce passes parity and breaks at the
 * swap (02-design.md section 7, alternative D).
 */
export default async function DevicesPage(): Promise<JSX.Element> {
  const [deviceList, seatList, memberList, roomList] = await Promise.all([
    devices.listDevices(),
    seats.listSeats(),
    members.listMembers(),
    rooms.listRooms(),
  ]);

  const memberName = new Map(memberList.map((m) => [m.id, m.fullName]));
  const roomCode = new Map(roomList.map((r) => [r.id, r.code]));
  const seatById = new Map(seatList.map((s) => [s.id, s]));

  const rows: DeviceRow[] = deviceList.map((device) => {
    const seat = device.seatId === null ? undefined : seatById.get(device.seatId);
    return {
      device,
      ownerName: device.ownerId === null ? null : (memberName.get(device.ownerId) ?? null),
      seatCode: seat?.code ?? null,
      occupantName:
        seat === undefined || seat.occupantId === null
          ? null
          : (memberName.get(seat.occupantId) ?? null),
    };
  });

  const memberOptions: MemberOption[] = memberList.map((m) => ({
    id: m.id,
    fullName: m.fullName,
  }));

  const seatOptions: SeatOption[] = seatList.map((s) => ({
    id: s.id,
    // A seat always belongs to a room — `deleteRoom` destroys a room's seats with it — so this
    // fallback is unreachable. It falls back to the seat's own `roomId` rather than to an invented
    // literal, so if it ever does fire the label carries a real identifier instead of a word no
    // artifact defines.
    roomCode: roomCode.get(s.roomId) ?? s.roomId,
    code: s.code,
    occupantName: s.occupantId === null ? null : (memberName.get(s.occupantId) ?? null),
  }));

  return (
    <section data-testid="devices-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Devices</h1>
      <DevicesManager rows={rows} memberOptions={memberOptions} seatOptions={seatOptions} />
    </section>
  );
}
