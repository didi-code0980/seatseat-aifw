import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/shared/DataTable";
import { seats } from "@/lib/data";

export default async function SeatsPage() {
  const rows = await seats.listSeats();

  return (
    <section data-testid="seats-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Seats</h1>
      <DataTable
        rows={rows}
        rowKey={(s) => s.id}
        testIdPrefix="seats"
        emptyMessage="No seats yet."
        columns={[
          { key: "code", header: "Code", mono: true, render: (s) => s.code },
          { key: "room", header: "Room", mono: true, render: (s) => s.roomId },
          { key: "ports", header: "Ports", mono: true, render: (s) => s.ports.map((p) => p.portCode).join(", ") },
          {
            key: "status",
            header: "Status",
            // INV-03: derived on read, never a stored column.
            render: (s) => (
              <Badge tone={seats.deriveSeatStatus(s) === "OCCUPIED" ? "accent" : "muted"} data-testid={`seats-status-${s.id}`}>
                {seats.deriveSeatStatus(s)}
              </Badge>
            ),
          },
        ]}
      />
    </section>
  );
}
