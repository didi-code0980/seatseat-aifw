// Derivations that must be identical on both sides of the seam.
//
// INV-03 says seat status is derived, never stored. If each implementation derived it separately,
// "derived" would quietly become "derived twice, two ways", and the mock and the database would
// disagree about a value that no column holds. One function, re-exported by both.

import type { Seat, SeatStatus } from "./types";

export function deriveSeatStatus(seat: Seat): SeatStatus {
  return seat.occupantId === null ? "VACANT" : "OCCUPIED";
}
