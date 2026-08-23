import type { JSX } from "react";

import { RoomsManager } from "./rooms-manager";
import type { RoomRow } from "./rooms-manager";
import { rooms } from "@/lib/data";

// A server component that reads through the seam and holds no state. The seat count comes from
// `countSeatsInRoom` rather than from anything the client derives, so the number the delete
// confirmation names is the seam's own answer (INV-11, 02-design.md section 3.1).
export default async function RoomsPage(): Promise<JSX.Element> {
  const list = await rooms.listRooms();
  const rows: RoomRow[] = await Promise.all(
    list.map(async (room) => ({ room, seatCount: await rooms.countSeatsInRoom(room.id) }))
  );

  return (
    <section data-testid="rooms-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Rooms</h1>
      <RoomsManager rows={rows} />
    </section>
  );
}
