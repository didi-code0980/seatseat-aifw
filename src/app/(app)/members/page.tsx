import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/shared/DataTable";
import { members } from "@/lib/data";

export default async function MembersPage() {
  const rows = await members.listMembers();

  return (
    <section data-testid="members-page">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Members</h1>
      <DataTable
        rows={rows}
        rowKey={(m) => m.id}
        testIdPrefix="members"
        emptyMessage="No members yet."
        columns={[
          { key: "name", header: "Name", render: (m) => m.fullName },
          { key: "email", header: "Email", mono: true, render: (m) => m.email },
          { key: "group", header: "Group", mono: true, render: (m) => m.groupId ?? "none" },
          {
            key: "role",
            header: "Role",
            render: (m) => <Badge data-testid={`members-role-${m.id}`}>{m.role}</Badge>,
          },
        ]}
      />
    </section>
  );
}
