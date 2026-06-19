import React from "react";
import type { ProjectDetail } from "../types";
import { formatCurrency, formatDate } from "../utils/format";

const CLOSED = new Set(["Completed", "Cancelled", "Closed"]);

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="pm-kpi">
      <div className="pm-kpi-label">{label}</div>
      <div className="pm-kpi-value">{value}</div>
      {sub != null && <div className="pm-kpi-sub">{sub}</div>}
    </div>
  );
}

export function ProjectSummaryStrip({ doc }: { doc: ProjectDetail }) {
  const tasks = doc.tasks ?? [];
  const openTasks = tasks.filter((t) => !CLOSED.has(t.status ?? "")).length;
  const team = doc.linked_users ?? [];
  const margin = doc.per_gross_margin;

  return (
    <div className="pm-kpi-strip">
      <Kpi label="Status" value={doc.status || "-"} />
      <Kpi label="Progress" value={`${doc.percent_complete ?? 0}%`} />
      <Kpi
        label="Open Tasks"
        value={openTasks}
        sub={`${tasks.length} total`}
      />
      <Kpi label="Team" value={team.length} sub="members" />
      <Kpi
        label="Budget"
        value={formatCurrency(doc.estimated_costing) ?? "-"}
        sub={margin != null ? `${margin}% margin` : undefined}
      />
      <Kpi
        label="End Date"
        value={formatDate(doc.expected_end_date) ?? "-"}
      />
    </div>
  );
}
