import type { JSX } from "react";

import { SeatsManager } from "./seats-manager";
import { members, rooms, seats } from "@/lib/data";
import type { Seat } from "@/lib/data";

/**
 * One rendered row. `occupantName === null` is the whole of "this seat is vacant" (AC-1).
 *
 * The room is carried as a value on the row rather than as a scope on the screen — 02-design.md F-2
 * answers `Q-2` flat, so every seat the system holds is listed and the room is a column.
 */
export interface SeatRow {
  seat: Seat;
  /** The occupant's full name, or null when the seat is vacant. AC-1. */
  occupantName: string | null;
  /** The code of the room this seat belongs to. F-2: the room is a column, not a scope. */
  roomCode: string;
}

/**
 * A member offered as an occupant. AC-2 and assumption A-4: an occupant is a member the system
 * already holds, chosen rather than typed — a free-text occupant would either invent a member or
 * record a person the system does not hold, and INV-08 forbids the first.
 */
export interface OccupantOption {
  id: string;
  fullName: string;
}

/**
 * A server component that reads through the seam and holds no state.
 *
 * Three existing reads and no new seam function for the join. It happens here rather than behind a
 * `listSeatRows()` because a joined DTO puts a new *shape* across the seam rather than a new name,
 * and shape is the one thing `tests/unit/seam-parity.test.ts` does not check — a mock returning a
 * joined row the Prisma implementation cannot reproduce passes parity and breaks at the swap
 * (02-design.md section 1.5).
 */
export default async function SeatsPage(): Promise<JSX.Element> {
  const [seatList, memberList, roomList] = await Promise.all([
    seats.listSeats(),
    members.listMembers(),
    rooms.listRooms(),
  ]);

  const memberName = new Map(memberList.map((m) => [m.id, m.fullName]));
  const roomCode = new Map(roomList.map((r) => [r.id, r.code]));

  const rows: SeatRow[] = seatList.map((seat) => ({
    seat,
    occupantName: seat.occupantId === null ? null : (memberName.get(seat.occupantId) ?? null),
    // A seat always belongs to a room — `deleteRoom` destroys a room's seats with it — so this
    // fallback is unreachable. It falls back to the seat's own `roomId` rather than to an invented
    // literal, so if it ever does fire the cell carries a real identifier instead of a word no
    // artifact defines.
    roomCode: roomCode.get(seat.roomId) ?? seat.roomId,
  }));

  const occupantOptions: OccupantOption[] = memberList.map((m) => ({
    id: m.id,
    fullName: m.fullName,
  }));

  return (
    <section data-testid="seats-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Seats</h1>
      <SeatsManager rows={rows} occupantOptions={occupantOptions} />
    </section>
  );
}
