import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/shared/DataTable";
import { requests } from "@/lib/data";

export default async function RequestsPage() {
  const rows = await requests.listRequests();

  return (
    <section data-testid="requests-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Seat requests</h1>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        testIdPrefix="requests"
        emptyMessage="No requests yet."
        columns={[
          { key: "requester", header: "Requester", mono: true, render: (r) => r.requesterId },
          // TARGETED names a seat; OPEN names only a room. Both need Manager or Admin approval.
          { key: "kind", header: "Kind", render: (r) => <Badge tone="muted">{r.kind}</Badge> },
          { key: "target", header: "Target", mono: true, render: (r) => r.seatId ?? r.roomId },
          {
            key: "state",
            header: "State",
            render: (r) => <Badge data-testid={`requests-state-${r.id}`}>{r.state}</Badge>,
          },
        ]}
      />
    </section>
  );
}
