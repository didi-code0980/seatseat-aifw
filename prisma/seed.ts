// Database seed.
//
// It reads the SAME fixture module the mock seam reads (`src/lib/data/fixtures.ts`), so a seeded
// database and `DATA_SOURCE=mock` render identically. If this file held its own copy of the data,
// the two modes would drift, and the mock would stop being a faithful stand-in for the thing it
// stands in for.
//
// NOT RUNNABLE YET, and deliberately so: prisma/schema.prisma is a DRAFT awaiting human approval
// (RULE-09) and no migration has been applied. Running this against an unmigrated database fails at
// the first insert. `pnpm db:seed` is wired so the command exists once the schema lands.
//
// TODO(verify): the writes below are commented rather than written, because writing them now would
// bake unapproved model and field names into a file that is hard to notice later. The mapping is
// one insert per fixture array, parents before children:
//   groups -> members -> accounts -> rooms -> seats -> ports -> devices -> requests
//
// TODO(verify): Prisma 7 constructs PrismaClient with a driver adapter rather than a datasource URL
// (see prisma.config.ts). `@prisma/adapter-pg` is not installed; adding it is a dependency change
// and needs an ADR under review check R9.

import { accounts, devices, groups, members, ports, requests, rooms, seats } from "../src/lib/data/fixtures";

function summarise(): void {
  const primaries = devices.filter((d) => d.rank === "PRIMARY").length;
  const unassigned = devices.filter((d) => d.seatId === null).length;

  console.log("Fixture set that will be seeded once the schema is approved:");
  console.log(`  groups   ${groups.length}`);
  console.log(`  members  ${members.length} (roles: ${[...new Set(members.map((m) => m.role))].join(", ")})`);
  console.log(`  accounts ${accounts.length}`);
  console.log(`  rooms    ${rooms.length}`);
  console.log(`  seats    ${seats.length}`);
  console.log(`  ports    ${ports.length}`);
  console.log(`  devices  ${devices.length} (${primaries} primary, ${unassigned} unassigned — INV-07)`);
  console.log(`  requests ${requests.length}`);
}

function main(): void {
  summarise();
  throw new Error(
    "Seeding is not enabled: prisma/schema.prisma is a draft awaiting human approval (RULE-09) and " +
      "no migration has been applied. Approve the schema, generate and apply a migration, then " +
      "replace this guard with the inserts described above.",
  );
}

main();
