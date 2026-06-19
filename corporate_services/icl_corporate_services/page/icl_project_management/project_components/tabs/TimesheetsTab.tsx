import React from "react";
import type { ProjectDetail, ProjectTimesheet } from "../types";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { ProjectChartCard } from "../ProjectCharts";
import { openForm } from "../utils/frappe";
import { formatDateOrDash } from "../utils/format";

const columns: Column<ProjectTimesheet>[] = [
  {
    header: "Timesheet",
    render: (ts) => (
      <a
        className="pm-proj-link"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openForm("Timesheet", ts.name);
        }}
      >
        {ts.name}
      </a>
    ),
  },
  { header: "Employee", render: (ts) => ts.employee_name || ts.employee || "-" },
  { header: "Status", render: (ts) => ts.status || "-" },
  { header: "Hours", render: (ts) => ts.total_hours ?? "-" },
  { header: "Start Date", render: (ts) => formatDateOrDash(ts.start_date) },
  { header: "End Date", render: (ts) => formatDateOrDash(ts.end_date) },
];

export function TimesheetsTab({ doc }: { doc: ProjectDetail }) {
  const timesheets = doc.timesheets ?? [];
  return (
    <div>
      <div className="pm-charts-grid" style={{ marginBottom: 16 }}>
        <ProjectChartCard
          title="Timesheets by Status"
          items={(doc.charts?.timesheet_status_breakdown ?? []).map((item) => ({
            label: item.label,
            value: item.count,
          }))}
          emptyText="No timesheets are linked to this project yet."
        />
      </div>
      <SectionCard title="Project Timesheets" count={timesheets.length}>
        <RelatedTable
          columns={columns}
          rows={timesheets}
          getKey={(ts) => ts.name}
          emptyText="No timesheets are linked to this project."
        />
      </SectionCard>
    </div>
  );
}
