import { DataTable } from "@/components/shared/DataTable";
import { rooms } from "@/lib/data";

export default async function RoomsPage() {
  const rows = await rooms.listRooms();

  return (
    <section data-testid="rooms-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Rooms</h1>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        testIdPrefix="rooms"
        emptyMessage="No rooms yet."
        columns={[
          { key: "code", header: "Code", mono: true, render: (r) => r.code },
          { key: "name", header: "Name", render: (r) => r.name },
          { key: "grid", header: "Grid", mono: true, render: (r) => `${r.gridWidth} x ${r.gridHeight}` },
        ]}
      />
    </section>
  );
}
