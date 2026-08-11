import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/shared/DataTable";
import { devices } from "@/lib/data";

export default async function DevicesPage() {
  const rows = await devices.listDevices();

  return (
    <section data-testid="devices-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Devices</h1>
      <DataTable
        rows={rows}
        rowKey={(d) => d.id}
        testIdPrefix="devices"
        emptyMessage="No devices yet."
        columns={[
          { key: "tag", header: "Asset tag", mono: true, render: (d) => d.assetTag },
          { key: "model", header: "Model", render: (d) => d.model },
          // INV-07: an unassigned device is a normal state, not a missing value.
          { key: "seat", header: "Seat", mono: true, render: (d) => d.seatId ?? "unassigned" },
          {
            key: "rank",
            header: "Rank",
            render: (d) => (
              <Badge tone={d.rank === "PRIMARY" ? "accent" : "muted"} data-testid={`devices-rank-${d.id}`}>
                {d.rank}
              </Badge>
            ),
          },
        ]}
      />
    </section>
  );
}
