import React from "react";
import type { ProjectLinkedUser } from "../types";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";

const columns: Column<ProjectLinkedUser>[] = [
  { header: "User", render: (u) => u.user },
  { header: "Employee", render: (u) => u.employee_name || u.employee || "-" },
  { header: "Full Name", render: (u) => u.full_name || "-" },
  { header: "Email", render: (u) => u.email || "-" },
  { header: "Allocated LOEs", render: (u) => u.allocated_loes ?? "-" },
  { header: "Total Hours", render: (u) => u.total_hours ?? 0 },
];

export function TeamTab({ users }: { users: ProjectLinkedUser[] }) {
  return (
    <SectionCard title="Linked Project Users" count={users.length} countLabel="user">
      <RelatedTable
        columns={columns}
        rows={users}
        getKey={(u) => u.user}
        emptyText="No users are linked to this project."
      />
    </SectionCard>
  );
}
