import React, { useState } from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox, RAG_COLOR, RAG_LABEL } from "./common";
import { PmWorkloadData, RagStatus } from "./types";

function HealthPill({ rag }: { rag: RagStatus }) {
  const color = RAG_COLOR[rag] ?? "#6c757d";
  return (
    <span className="ipm-health-pill" style={{ borderColor: color, color }}>
      {RAG_LABEL[rag].toUpperCase()}
    </span>
  );
}

export function PmWorkloadDash() {
  const [pm, setPm] = useState("");
  const { data, loading, error } = useApiData<PmWorkloadData>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_pm_workload",
    pm ? { pm } : null,
    [pm]
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;

  if (!data || (!data.is_smt && !data.employee)) {
    return <div className="p-3 alert alert-info">No Project Managers with active projects found.</div>;
  }

  const isSmt = !!data.is_smt;
  const pms = data.pms ?? [];
  const myView = data.my_view;
  const smtView = data.smt_view ?? [];

  return (
    <div className="container-fluid p-3">
      {isSmt && (
        <div className="d-flex justify-content-end mb-3">
          <select
            className="form-select form-select-sm ipm-pm-filter"
            value={pm}
            onChange={(e) => setPm(e.target.value)}
          >
            <option value="">All PMs</option>
            {pms.map((row) => (
              <option key={row.employee} value={row.employee}>{row.employee_name}</option>
            ))}
          </select>
        </div>
      )}

      {myView && (
        <>
          <div className="row mb-3">
            <div className="col-4">
              <div className="ipm-stat-tile">
                <div className="ipm-stat-tile-val">{myView.active_projects}</div>
                <div className="ipm-stat-tile-label">Active Projects</div>
              </div>
            </div>
            <div className="col-4">
              <div className="ipm-stat-tile">
                <div className="ipm-stat-tile-val">{myView.open_tasks}</div>
                <div className="ipm-stat-tile-label">Open Tasks</div>
              </div>
            </div>
            <div className="col-4">
              <div className={`ipm-stat-tile${myView.overdue_reports > 0 ? " ipm-stat-tile-danger" : ""}`}>
                <div className="ipm-stat-tile-val">{myView.overdue_reports}</div>
                <div className="ipm-stat-tile-label">Overdue Reports</div>
              </div>
            </div>
          </div>

          <div className="card border mb-3">
            <div className="card-header bg-light">
              <strong style={{ fontSize: 13 }}>Project Breakdown - {data.employee_name}</strong>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                <thead className="thead-light">
                  <tr>
                    <th>Project</th>
                    <th>Phase</th>
                    <th style={{ textAlign: "center" }}>Open Tasks</th>
                    <th style={{ textAlign: "center" }}>Overdue</th>
                    <th>Next Milestone</th>
                  </tr>
                </thead>
                <tbody>
                  {myView.projects.length === 0 ? (
                    <tr><td colSpan={5} className="text-muted text-center py-3">No active projects.</td></tr>
                  ) : myView.projects.map((p) => (
                    <tr key={p.project}>
                      <td>
                        <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 600 }}>
                          {p.project}
                        </a>
                      </td>
                      <td>{p.phase ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{p.open_tasks}</td>
                      <td style={{ textAlign: "center", color: p.overdue_tasks > 0 ? "#dc3545" : "#2e9e5b", fontWeight: 600 }}>
                        {p.overdue_tasks}
                      </td>
                      <td>{p.next_milestone ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isSmt && (
        <div className="card border mb-3">
          <div className="card-header bg-light">
            <strong style={{ fontSize: 13 }}>SMT view - Cross-PM Comparison</strong>
          </div>
          <div className="table-responsive">
            <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
              <thead className="thead-light">
                <tr>
                  <th>PM Name</th>
                  <th style={{ textAlign: "center" }}>Active</th>
                  <th style={{ textAlign: "center" }}>Tasks</th>
                  <th>Overdue</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {smtView.map((row) => (
                  <tr
                    key={row.employee}
                    className={row.health === "Red" ? "ipm-workload-row-danger" : undefined}
                  >
                    <td style={{ fontWeight: 600 }}>{row.employee_name}</td>
                    <td style={{ textAlign: "center" }}>{row.active_projects}</td>
                    <td style={{ textAlign: "center" }}>{row.open_tasks}</td>
                    <td>
                      {row.overdue_tasks === 0 && row.overdue_reports === 0
                        ? "-"
                        : `${row.overdue_tasks} task${row.overdue_tasks !== 1 ? "s" : ""}, ${row.overdue_reports} report${row.overdue_reports !== 1 ? "s" : ""}`}
                    </td>
                    <td><HealthPill rag={row.health} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
