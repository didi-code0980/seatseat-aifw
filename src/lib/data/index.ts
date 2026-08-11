// THE SEAM.
//
// Every component, page, and server action reaches data through this module and no other (RULE-02,
// enforced by the `no-restricted-imports` rule in eslint.config.mjs, checked again at review as R4).
//
// This is the one file allowed to name both implementations, because choosing between them is what
// it does. That is why it appears in the lint rule's exception list alongside `prisma/**` and
// `prisma/seed.ts`.
//
// The switch is read once, at module load. DATA_SOURCE is not a per-request concern: a process that
// served one request from the mock and the next from the database would make every bug report
// ambiguous.

import * as mockAccounts from "./mock/accounts";
import * as mockDevices from "./mock/devices";
import * as mockGroups from "./mock/groups";
import * as mockLayout from "./mock/layout";
import * as mockMembers from "./mock/members";
import * as mockRequests from "./mock/requests";
import * as mockRooms from "./mock/rooms";
import * as mockSeats from "./mock/seats";

import * as prismaAccounts from "./prisma/accounts";
import * as prismaDevices from "./prisma/devices";
import * as prismaGroups from "./prisma/groups";
import * as prismaLayout from "./prisma/layout";
import * as prismaMembers from "./prisma/members";
import * as prismaRequests from "./prisma/requests";
import * as prismaRooms from "./prisma/rooms";
import * as prismaSeats from "./prisma/seats";

export type DataSource = "mock" | "prisma";

/**
 * `mock` is the default, and an unrecognised value is an error rather than a silent fallback — a
 * typo that quietly served mock data from a production process is the failure this refuses to have.
 */
export function resolveDataSource(raw: string | undefined): DataSource {
  if (raw === undefined || raw === "") return "mock";
  if (raw === "mock" || raw === "prisma") return raw;
  throw new Error(`DATA_SOURCE must be "mock" or "prisma", received ${JSON.stringify(raw)}`);
}

export const DATA_SOURCE: DataSource = resolveDataSource(process.env.DATA_SOURCE);

const usePrisma = DATA_SOURCE === "prisma";

export const accounts = usePrisma ? prismaAccounts : mockAccounts;
export const devices = usePrisma ? prismaDevices : mockDevices;
export const groups = usePrisma ? prismaGroups : mockGroups;
export const layout = usePrisma ? prismaLayout : mockLayout;
export const members = usePrisma ? prismaMembers : mockMembers;
export const requests = usePrisma ? prismaRequests : mockRequests;
export const rooms = usePrisma ? prismaRooms : mockRooms;
export const seats = usePrisma ? prismaSeats : mockSeats;

export type * from "./types";
