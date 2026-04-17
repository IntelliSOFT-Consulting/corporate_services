import React from "react";
import { useProjectDetail } from "./hooks/useProjectDetail";
import { ProjectChartCard } from "./ProjectCharts";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Completed: "green",
  Cancelled: "red",
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const isEmpty = value == null || value === "";
  return (
    <div>
      <div className="pm-field-label">{label}</div>
      <div className={`pm-field-value${isEmpty ? " empty" : ""}`}>
        {isEmpty ? "-" : String(value)}
      </div>
    </div>
  );
}

function formatCurrency(amount?: number) {
  if (amount == null) return null;
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateOrDash(date?: string) {
  return formatDate(date) ?? "-";
}

function ProgressBar({ value }: { value?: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-color, #333)" }}>
        {pct}%
      </div>
      <div className="pm-progress-bar-track" style={{ marginTop: 8 }}>
        <div className="pm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Props {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: Props) {
  const { doc, loading, error } = useProjectDetail(projectId);
  const linkedUsers = doc?.linked_users ?? [];
  const timesheets = doc?.timesheets ?? [];
  const travelRequests = doc?.travel_requests ?? [];

  return (
    <div className="pm-fade-in">
      {/* ── Header ── */}
      <div className="pm-detail-header">
        <button type="button" className="pm-detail-back" onClick={onBack} title="Back to list">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span style={{ marginLeft: 4, fontSize: 13 }}>Back</span>
        </button>

        <h5 className="pm-detail-title">
          {loading ? "Loading…" : (doc?.project_name || projectId)}
          <span className="pm-detail-id">{projectId}</span>
        </h5>

        {doc && <StatusBadge status={doc.status} />}

        <div className="pm-detail-actions">
          <button
            type="button"
            className="btn btn-default btn-sm"
            onClick={() =>
              (globalThis as any).frappe?.set_route("Form", "Project", projectId)
            }
          >
            Edit in Form
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="text-center text-muted" style={{ padding: "48px 0" }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ marginTop: 10 }}>Loading project…</div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Content ── */}
      {doc && !loading && (
        <div className="row">
          <div className="col-md-8">

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="pm-section-title">Overview</h6>
              <div className="pm-field-grid">
                <Field label="Project Name" value={doc.project_name} />
                <div>
                  <div className="pm-field-label">Status</div>
                  <div className="pm-field-value">
                    <StatusBadge status={doc.status} />
                  </div>
                </div>
                <Field label="Customer" value={doc.customer} />
                <Field label="Department" value={doc.department} />
                <Field label="Company" value={doc.company} />
                <Field label="Priority" value={doc.priority} />
                <div>
                  <div className="pm-field-label">Opportunity Bid</div>
                  <div className="pm-field-value">
                    {doc.custom_bid ? (
                      <a
                        href="#"
                        style={{ color: "var(--primary, #5e64ff)", textDecoration: "none" }}
                        onClick={(e) => {
                          e.preventDefault();
                          (globalThis as any).frappe?.set_route(
                            "icl-opportunity-module",
                            doc.custom_bid
                          );
                        }}
                      >
                        {doc.custom_bid}
                      </a>
                    ) : (
                      <span className="empty">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="pm-section-title">Progress</h6>
              <div style={{ marginBottom: 16 }}>
                <div className="pm-field-label">Percent Complete</div>
                <ProgressBar value={doc.percent_complete} />
              </div>
              <div className="pm-field-grid">
                <Field label="Actual Start Date" value={formatDate(doc.actual_start_date)} />
                <Field label="Actual End Date" value={formatDate(doc.actual_end_date)} />
                <Field label="Actual Time (hrs)" value={doc.actual_time != null ? String(doc.actual_time) : null} />
              </div>
            </div>

            <div className="pm-charts-grid">
              <ProjectChartCard
                title="Timesheets by Status"
                items={(doc.charts?.timesheet_status_breakdown ?? []).map((item) => ({
                  label: item.label,
                  value: item.count,
                }))}
                emptyText="No timesheets are linked to this project yet."
              />
              <ProjectChartCard
                title="Travel Requests by Workflow State"
                items={(doc.charts?.travel_request_workflow_breakdown ?? []).map((item) => ({
                  label: item.label,
                  value: item.count,
                }))}
                emptyText="No travel requests are linked to this project yet."
              />
            </div>

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <div className="pm-list-section-header">
                <h6 className="pm-section-title" style={{ marginBottom: 0 }}>
                  Linked Project Users
                </h6>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {linkedUsers.length} user{linkedUsers.length === 1 ? "" : "s"}
                </span>
              </div>

              {linkedUsers.length === 0 ? (
                <div className="pm-empty-inline">No users are linked to this project.</div>
              ) : (
                <div className="pm-related-table-wrap">
                  <table className="table table-sm pm-related-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Employee</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Allocated LOEs</th>
                        <th>Total Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedUsers.map((user) => (
                        <tr key={user.user}>
                          <td>{user.user}</td>
                          <td>{user.employee_name || user.employee || "-"}</td>
                          <td>{user.full_name || "-"}</td>
                          <td>{user.email || "-"}</td>
                          <td>{user.allocated_loes ?? "-"}</td>
                          <td>{user.total_hours ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <div className="pm-list-section-header">
                <h6 className="pm-section-title" style={{ marginBottom: 0 }}>
                  Project Timesheets
                </h6>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {timesheets.length} record{timesheets.length === 1 ? "" : "s"}
                </span>
              </div>

              {timesheets.length === 0 ? (
                <div className="pm-empty-inline">No timesheets are linked to this project.</div>
              ) : (
                <div className="pm-related-table-wrap">
                  <table className="table table-sm pm-related-table">
                    <thead>
                      <tr>
                        <th>Timesheet</th>
                        <th>Employee</th>
                        <th>Status</th>
                        <th>Hours</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timesheets.map((timesheet) => (
                        <tr key={timesheet.name}>
                          <td>
                            <a
                              className="pm-proj-link"
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (globalThis as any).frappe?.set_route("Form", "Timesheet", timesheet.name);
                              }}
                            >
                              {timesheet.name}
                            </a>
                          </td>
                          <td>{timesheet.employee_name || timesheet.employee || "-"}</td>
                          <td>{timesheet.status || "-"}</td>
                          <td>{timesheet.total_hours ?? "-"}</td>
                          <td>{formatDateOrDash(timesheet.start_date)}</td>
                          <td>{formatDateOrDash(timesheet.end_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <div className="pm-list-section-header">
                <h6 className="pm-section-title" style={{ marginBottom: 0 }}>
                  Travel Requests
                </h6>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {travelRequests.length} record{travelRequests.length === 1 ? "" : "s"}
                </span>
              </div>

              {travelRequests.length === 0 ? (
                <div className="pm-empty-inline">No travel requests are linked to this project.</div>
              ) : (
                <div className="pm-related-table-wrap">
                  <table className="table table-sm pm-related-table">
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Employee</th>
                        <th>Workflow State</th>
                        <th>Travel Date</th>
                        <th>Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {travelRequests.map((request) => (
                        <tr key={request.name}>
                          <td>
                            <a
                              className="pm-proj-link"
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (globalThis as any).frappe?.set_route("Form", "Travel Request", request.name);
                              }}
                            >
                              {request.name}
                            </a>
                          </td>
                          <td>{request.employee_name || request.employee || "-"}</td>
                          <td>{request.workflow_state || "-"}</td>
                          <td>{formatDateOrDash(request.custom_travel_date)}</td>
                          <td>{request.custom_travel_place || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          <div className="col-md-4">

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="pm-section-title">Financial</h6>
              <div className="pm-field-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Field label="Estimated Costing" value={formatCurrency(doc.estimated_costing)} />
                <Field label="Total Costing Amount" value={formatCurrency(doc.total_costing_amount)} />
                <Field label="Total Purchase Cost" value={formatCurrency(doc.total_purchase_cost)} />
                <Field label="Gross Margin" value={formatCurrency(doc.gross_margin)} />
                <Field label="Gross Margin (%)" value={doc.per_gross_margin != null ? `${doc.per_gross_margin}%` : null} />
              </div>
            </div>

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="pm-section-title">Assignment</h6>
              <div className="pm-field-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Field label="Owner" value={doc.owner} />
                <Field label="Created On" value={formatDate(doc.creation)} />
                <Field label="Last Modified" value={formatDate(doc.modified)} />
                <Field label="Cost Center" value={doc.cost_center} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
