import React, { useState } from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox } from "./common";
import { OverdueDeliverablesData } from "./types";

function StatTile({ value, label, color }: { value: number; label: string; color: "red" | "amber" | "green" }) {
  return (
    <div className="col-md-3 mb-3">
      <div className={`ipm-risk-tile ipm-risk-tile-${color === "red" ? "red" : color === "green" ? "green" : "amber"} h-100`}>
        <div className="ipm-risk-tile-val">{value}</div>
        <div className="ipm-risk-tile-label">{label}</div>
      </div>
    </div>
  );
}

export function OverdueDeliverablesDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [pm, setPm] = useState("");
  const { data, loading, error } = useApiData<OverdueDeliverablesData>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_overdue_deliverables",
    pm ? { pm } : null,
    [pm]
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;

  const isSmt = !!data?.is_smt;
  const pms = data?.pms ?? [];
  const overdueReports = data?.overdue_reports ?? [];
  const milestones = data?.milestones ?? [];
  const paymentAlerts = data?.payment_alerts ?? [];
  const summary = data?.summary ?? { overdue_reports: 0, overdue_milestones: 0, overdue_payments: 0, approaching_payments: 0 };

  return (
    <div className="container-fluid p-3">
      {isSmt && (
        <div className="d-flex justify-content-end mb-2">
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
      {isSmt && (
        <div className="ipm-portfolio-banner mb-3">
          SMT sees all PMs' overdue items. PM column added. Filter by PM.
        </div>
      )}

      <div className="row mb-2">
        <StatTile value={summary.overdue_reports} label="Overdue Reports" color="red" />
        <StatTile value={summary.overdue_milestones} label="Overdue Milestone" color="amber" />
        <StatTile value={summary.overdue_payments} label="Overdue Payments" color="green" />
        <StatTile value={summary.approaching_payments} label="Approaching (7 days)" color="amber" />
      </div>

      <div className="card border mb-3">
        <div className="card-header bg-light">
          <strong style={{ fontSize: 13, color: "#c0392b" }}>Overdue Status Reports</strong>
        </div>
        <div className="table-responsive">
          <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
            <thead className="thead-light">
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Report Type</th>
                <th>Frequency</th>
                <th>Due Date</th>
                <th>Days Over</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueReports.length === 0 ? (
                <tr><td colSpan={7} className="text-muted text-center py-3">No overdue status reports.</td></tr>
              ) : overdueReports.map((r, i) => (
                <tr key={i}>
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); onOpenProject(r.project); }}>{r.project}</a>
                  </td>
                  <td>{r.client ?? "-"}</td>
                  <td>{r.report_type}</td>
                  <td>{r.frequency ?? "-"}</td>
                  <td>{r.due_date}</td>
                  <td style={{ color: "#dc3545", fontWeight: 600 }}>{r.days_over} days</td>
                  <td>
                    <button
                      className="ipm-report-alert-btn"
                      style={{ padding: "4px 12px", fontSize: 11 }}
                      onClick={() => globalThis.frappe.new_doc("Project Update", { project: r.project })}
                    >
                      Create Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border mb-3">
        <div className="card-header bg-light">
          <strong style={{ fontSize: 13 }}>Overdue and Approaching Milestones</strong>
        </div>
        <div className="table-responsive">
          <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
            <thead className="thead-light">
              <tr>
                <th>Project</th>
                <th>Milestone</th>
                <th>Phase</th>
                <th>Due Date</th>
                <th>Days</th>
                <th>Assigned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {milestones.length === 0 ? (
                <tr><td colSpan={7} className="text-muted text-center py-3">No overdue or approaching milestones.</td></tr>
              ) : milestones.map((m, i) => (
                <tr
                  key={i}
                  className="ipm-pipeline-row"
                  onClick={() => onOpenProject(m.project)}
                  style={{ background: m.overdue ? "#fdecee" : "#fff8e6" }}
                >
                  <td>{m.project}</td>
                  <td>{m.milestone}</td>
                  <td>{m.phase ?? "-"}</td>
                  <td>{m.due_date}</td>
                  <td style={{ color: m.overdue ? "#dc3545" : "#b8860b", fontWeight: 600 }}>
                    {m.overdue ? `${m.days} day${m.days !== 1 ? "s" : ""} overdue` : `${m.days} day${m.days !== 1 ? "s" : ""} remaining`}
                  </td>
                  <td>{m.assigned ?? "-"}</td>
                  <td>
                    <span className="ipm-badge-pill" style={{ background: "#fff3cd", color: "#8a6416" }}>
                      {(m.status || "").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border mb-3">
        <div className="card-header bg-light">
          <strong style={{ fontSize: 13 }}>Payment Alerts</strong>
        </div>
        <div className="table-responsive">
          <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
            <thead className="thead-light">
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Deliverable</th>
                <th>Due Date</th>
                <th>Days</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {paymentAlerts.length === 0 ? (
                <tr><td colSpan={6} className="text-muted text-center py-3">No overdue or approaching payments.</td></tr>
              ) : paymentAlerts.map((r, i) => (
                <tr
                  key={i}
                  className="ipm-pipeline-row"
                  onClick={() => onOpenProject(r.project)}
                  style={{ background: r.overdue ? "#fdecee" : "#fff8e6" }}
                >
                  <td>{r.project}</td>
                  <td>{r.client ?? "-"}</td>
                  <td>{r.deliverable ?? "-"}</td>
                  <td>{r.due_date}</td>
                  <td style={{ color: r.overdue ? "#dc3545" : "#b8860b", fontWeight: 600 }}>
                    {r.overdue ? `${r.days} day${r.days !== 1 ? "s" : ""} overdue` : `${r.days} day${r.days !== 1 ? "s" : ""} remaining`}
                  </td>
                  <td>{r.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
