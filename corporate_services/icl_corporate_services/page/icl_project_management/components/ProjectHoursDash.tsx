import React, { useEffect, useState } from "react";
import { ProjectHoursData } from "./types";

export function ProjectHoursDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<ProjectHoursData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_project_hours_summary",
        args: { month_year: month },
      })
      .then((r: any) => {
        setData((r && r.message) || {});
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load timesheet hours.");
        setLoading(false);
      });
  }, [month]);

  useEffect(() => {
    if (loading) return;
    const rows = data.projects || [];
    const target = document.getElementById("icl-project-hours-chart");
    if (!target) return;
    target.innerHTML = "";
    if (!rows.length) return;
    new globalThis.frappe.Chart("#icl-project-hours-chart", {
      data: {
        labels: rows.map((row) => row.project_title),
        datasets: [{ values: rows.map((row) => row.percentage) }],
      },
      type: "bar",
      height: 260,
      barOptions: { spaceRatio: 0.5 },
    });
  }, [loading, data.projects]);

  const projects = data.projects || [];
  const topProject = projects[0];

  return (
    <div className="card border mb-3">
      <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
        <strong style={{ fontSize: 13 }}>Timesheet Hours by Project</strong>
        <select
          className="form-control form-control-sm"
          style={{ width: 180 }}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="">All Time</option>
          {(data.months || []).map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-muted" style={{ fontSize: 13 }}>Loading timesheet hours...</div>
        ) : error ? (
          <div className="alert alert-danger mb-0">{error}</div>
        ) : !projects.length ? (
          <div className="text-muted" style={{ fontSize: 13 }}>No timesheet hours logged against projects yet.</div>
        ) : (
          <>
            <div className="row mb-3">
              <div className="col-md-4 col-6 mb-2">
                <div className="text-muted" style={{ fontSize: 12 }}>Total Hours Worked</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{(data.total_hours || 0).toFixed(1)}h</div>
              </div>
              <div className="col-md-4 col-6 mb-2">
                <div className="text-muted" style={{ fontSize: 12 }}>Employees Logging Time</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{data.employee_count || 0}</div>
              </div>
              <div className="col-md-4 col-6 mb-2">
                <div className="text-muted" style={{ fontSize: 12 }}>Highest Share of Hours</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {topProject ? `${topProject.project_title} - ${topProject.percentage}%` : "-"}
                </div>
              </div>
            </div>
            <div id="icl-project-hours-chart" className="mb-3" />
            <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
              <thead>
                <tr><th>Project</th><th>Hours</th><th>% of Total</th></tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.project}
                    className="ipm-hours-row"
                    onClick={() => onOpenProject(p.project)}
                    title="Open project"
                  >
                    <td>{p.project_title}</td>
                    <td>{p.total_hours.toFixed(1)}</td>
                    <td>{p.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
