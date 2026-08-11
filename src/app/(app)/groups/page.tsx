import { DataTable } from "@/components/shared/DataTable";
import { groups } from "@/lib/data";

export default async function GroupsPage() {
  const rows = await groups.listGroups();

  return (
    <section data-testid="groups-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Groups</h1>
      <DataTable
        rows={rows}
        rowKey={(g) => g.id}
        testIdPrefix="groups"
        emptyMessage="No groups yet."
        columns={[
          { key: "name", header: "Name", render: (g) => g.name },
          // Groups nest. Maximum depth is an open question in the glossary; nothing here assumes one.
          { key: "parent", header: "Parent", mono: true, render: (g) => g.parentId ?? "none" },
        ]}
      />
    </section>
  );
}
