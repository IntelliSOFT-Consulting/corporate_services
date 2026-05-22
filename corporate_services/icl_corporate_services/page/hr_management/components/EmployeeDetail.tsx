import React from "react";
import { useEmployeeProfile } from "./hooks/useEmployeeProfile";
import {
  LeaveRecord,
  LeaveAllocation,
  TravelRequest,
  TravelReconciliation,
  LeaveApplication,
  AssetRequisition,
  TimesheetSubmission,
} from "./types";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-3">
      <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: value ? "var(--text-color, #333)" : "var(--text-muted, #adb5bd)" }}>
        {value || "-"}
      </div>
    </div>
  );
}

function formatDate(d?: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function tenure(joining?: string | null) {
  if (!joining) return null;
  const d1 = new Date(joining);
  const d2 = new Date();
  const months =
    (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (months < 1) return "Less than a month";
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0
    ? `${years} year${years !== 1 ? "s" : ""}, ${rem} month${rem !== 1 ? "s" : ""}`
    : `${years} year${years !== 1 ? "s" : ""}`;
}

interface Props {
  employee: string;
  onBack: () => void;
}

export function EmployeeDetail({ employee, onBack }: Props) {
  const { data, loading, error } = useEmployeeProfile(employee);
  const emp = data?.employee;

  return (
    <div className="sm-fade-in">
      {/* Header */}
      <div
        className="d-flex align-items-center flex-wrap mb-4"
        style={{
          gap: 10,
          paddingBottom: 12,
          borderBottom: "1px solid var(--border-color, #e2e6ea)",
        }}
      >
        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={onBack}
          style={{ padding: "4px 8px" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{ flex: 1 }}>
          <h5 className="font-weight-bold mb-0">
            {loading ? "Loading…" : emp?.employee_name || employee}
          </h5>
          {emp && (
            <span className="text-muted" style={{ fontSize: 12 }}>
              {employee}
              {emp.department && ` · ${emp.department}`}
              {emp.designation && ` · ${emp.designation}`}
            </span>
          )}
        </div>

        {emp && (
          <div className="d-flex" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-default btn-sm"
              onClick={() =>
                (globalThis as any).frappe?.set_route("Form", "Employee", employee)
              }
            >
              Open in Form
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center text-muted py-5">
          <div className="spinner-border spinner-border-sm mr-2" role="status" />
          Loading employee profile…
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {emp && !loading && (
        <div className="row">
          {/* Left: main info */}
          <div className="col-md-8">
            {/* Employment details */}
            <div className="frappe-card p-3 mb-3">
              <h6
                className="font-weight-bold text-muted mb-3"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                Employment Details
              </h6>
              <div className="row">
                <div className="col-sm-6">
                  <Field label="Employee ID" value={emp.name} />
                  <Field label="Department" value={emp.department} />
                  <Field label="Designation" value={emp.designation} />
                  <Field label="Employment Type" value={emp.employment_type} />
                </div>
                <div className="col-sm-6">
                  <Field label="Date of Joining" value={formatDate(emp.date_of_joining)} />
                  <Field label="Tenure" value={tenure(emp.date_of_joining)} />
                  <Field label="Reports To" value={emp.reports_to} />
                  <Field label="Company" value={emp.company} />
                </div>
              </div>
            </div>

            {/* Leave balance */}
            {data.leave_allocations.length > 0 && (
            <div className="frappe-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6
                  className="font-weight-bold text-muted mb-0"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Leave Balance (Current Year)
                </h6>
                <button
                  type="button"
                  className="btn btn-default btn-xs"
                  onClick={() =>
                    (globalThis as any).frappe?.set_route("List", "Leave Allocation", { employee })
                  }
                >
                  View Allocations
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm mb-0" style={{ fontSize: 13 }}>
                  <thead className="thead-light">
                    <tr>
                      <th>Leave Type</th>
                      <th className="text-right">Allocated</th>
                      <th className="text-right">Carried Fwd</th>
                      <th className="text-right">Used</th>
                      <th className="text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leave_allocations.map((a: LeaveAllocation, i: number) => {
                      const balance = a.balance ?? 0;
                      const balanceColor =
                        balance <= 0 ? "var(--red-500, #e53e3e)"
                        : balance <= 2 ? "var(--orange-500, #dd6b20)"
                        : "var(--green-600, #276749)";
                      return (
                        <tr key={i}>
                          <td>{a.leave_type}</td>
                          <td className="text-right">{a.total_leaves_allocated}</td>
                          <td className="text-right">{a.carry_forwarded_leaves_count || 0}</td>
                          <td className="text-right">{a.leaves_taken || 0}</td>
                          <td className="text-right font-weight-bold" style={{ color: balanceColor }}>
                            {balance}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Leave Applications */}
            {data.leave_applications.length > 0 && (
            <div className="frappe-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6
                  className="font-weight-bold text-muted mb-0"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Leave Applications (Last 12 Months)
                </h6>
                <button
                  type="button"
                  className="btn btn-default btn-xs"
                  onClick={() =>
                    (globalThis as any).frappe?.set_route("List", "Leave Application", { employee })
                  }
                >
                  View All
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
                  <thead className="thead-light">
                    <tr>
                      <th>Leave Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Days</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leave_applications.map((l: LeaveApplication) => {
                      const leaveColor: Record<string, string> = {
                        Approved: "green",
                        Pending: "orange",
                        Rejected: "red",
                        Cancelled: "red",
                        Open: "blue",
                      };
                      return (
                        <tr
                          key={l.name}
                          onClick={() =>
                            (globalThis as any).frappe?.set_route("Form", "Leave Application", l.name)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <span className="indicator-pill blue" style={{ fontSize: 11 }}>
                              <span>{l.leave_type}</span>
                            </span>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDate(l.from_date)}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDate(l.to_date)}</td>
                          <td>{l.total_leave_days}</td>
                          <td>
                            <span
                              className={`indicator-pill ${leaveColor[l.status] || "gray"}`}
                              style={{ fontSize: 11 }}
                            >
                              <span>{l.status}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Asset Requisitions */}
            {data.asset_requisitions.length > 0 && (
            <div className="frappe-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6
                  className="font-weight-bold text-muted mb-0"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Asset Requisitions
                </h6>
                <button
                  type="button"
                  className="btn btn-default btn-xs"
                  onClick={() =>
                    (globalThis as any).frappe?.set_route("List", "Asset Requisition", {
                      requested_by: employee,
                    })
                  }
                >
                  View All
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
                  <thead className="thead-light">
                    <tr>
                      <th>Reference</th>
                      <th>Requisition Date</th>
                      <th>Urgency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.asset_requisitions.map((a: AssetRequisition) => {
                      const urgencyColor: Record<string, string> = {
                        High: "red",
                        Medium: "orange",
                        Low: "gray",
                      };
                      return (
                        <tr
                          key={a.name}
                          onClick={() =>
                            (globalThis as any).frappe?.set_route(
                              "Form",
                              "Asset Requisition",
                              a.name
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <a className="text-primary" style={{ fontSize: 12 }} href="#">
                              {a.name}
                            </a>
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {formatDate(a.requisition_date)}
                          </td>
                          <td>
                            {a.urgency ? (
                              <span
                                className={`indicator-pill ${urgencyColor[a.urgency] || "gray"}`}
                                style={{ fontSize: 11 }}
                              >
                                <span>{a.urgency}</span>
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Timesheet Submissions */}
            {data.timesheet_submissions.length > 0 && (
            <div className="frappe-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6
                  className="font-weight-bold text-muted mb-0"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Timesheet Submissions
                </h6>
                <button
                  type="button"
                  className="btn btn-default btn-xs"
                  onClick={() =>
                    (globalThis as any).frappe?.set_route("timesheet_workflow", "employee", employee)
                  }
                >
                  View in Workflow
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
                  <thead className="thead-light">
                    <tr>
                      <th>Month</th>
                      <th className="text-right">Hours</th>
                      <th>Status</th>
                      <th>Workflow State</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.timesheet_submissions.map((ts: TimesheetSubmission) => {
                      const statusColor: Record<string, string> = {
                        Approved: "green",
                        Open: "orange",
                        Rejected: "red",
                        Cancelled: "gray",
                      };
                      const [m, y] = (ts.month_year || "").split("-");
                      const months = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
                      const monthLabel = m && y ? `${months[parseInt(m)] || m} ${y}` : ts.month_year || "-";
                      return (
                        <tr
                          key={ts.name}
                          onClick={() =>
                            (globalThis as any).frappe?.set_route(
                              "Form",
                              "Timesheet Submission",
                              ts.name
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td style={{ fontWeight: 500 }}>{monthLabel}</td>
                          <td className="text-right">{ts.total_working_hours ?? "-"}</td>
                          <td>
                            <span
                              className={`indicator-pill ${statusColor[ts.status || ""] || "gray"}`}
                              style={{ fontSize: 11 }}
                            >
                              <span>{ts.status || "-"}</span>
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--text-muted, #6c757d)" }}>
                            {ts.workflow_state || "-"}
                          </td>
                          <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                            {ts.creation ? formatDate(ts.creation) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Travel Request Reconciliations */}
            {data.travel_reconciliations.length > 0 && (
            <div className="frappe-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6
                  className="font-weight-bold text-muted mb-0"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Travel Reconciliations
                </h6>
                <button
                  type="button"
                  className="btn btn-default btn-xs"
                  onClick={() =>
                    (globalThis as any).frappe?.set_route(
                      "List",
                      "Travel Request Reconciliation",
                      { employee }
                    )
                  }
                >
                  View All
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
                  <thead className="thead-light">
                    <tr>
                      <th>Reference</th>
                      <th>Trip Dates</th>
                      <th>Advance</th>
                      <th>Spent</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.travel_reconciliations.map((r: TravelReconciliation) => {
                      const balance = r.total_balance ?? 0;
                      const balanceColor = balance < 0 ? "red" : balance > 0 ? "orange" : "green";
                      return (
                        <tr
                          key={r.name}
                          onClick={() =>
                            (globalThis as any).frappe?.set_route(
                              "Form",
                              "Travel Request Reconciliation",
                              r.name
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <a className="text-primary" style={{ fontSize: 12 }} href="#">
                              {r.name}
                            </a>
                            {r.travel_request && (
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {r.travel_request}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {formatDate(r.trip_dates_from)}
                            {r.trip_datesto && r.trip_datesto !== r.trip_dates_from
                              ? ` – ${formatDate(r.trip_datesto)}`
                              : ""}
                          </td>
                          <td>{r.currency} {r.total_advance?.toLocaleString() ?? "-"}</td>
                          <td>{r.currency} {r.total_spent?.toLocaleString() ?? "-"}</td>
                          <td>
                            <span
                              className={`indicator-pill ${balanceColor}`}
                              style={{ fontSize: 11 }}
                            >
                              <span>
                                {r.currency} {balance.toLocaleString()}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* Travel requests */}
            {data.travel_requests.length > 0 && (
            <div className="frappe-card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6
                  className="font-weight-bold text-muted mb-0"
                  style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  Travel Requests (Last 12 Months)
                </h6>
                <button
                  type="button"
                  className="btn btn-default btn-xs"
                  onClick={() =>
                    (globalThis as any).frappe?.set_route("List", "Travel Request", {
                      employee,
                    })
                  }
                >
                  View All
                </button>
              </div>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
                  <thead className="thead-light">
                    <tr>
                      <th>Reference</th>
                      <th>Purpose</th>
                      <th>Destination</th>
                      <th>Travel Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.travel_requests.map((t: TravelRequest) => {
                      const stateColor: Record<string, string> = {
                        Approved: "green",
                        Pending: "orange",
                        Rejected: "red",
                        Cancelled: "red",
                        Draft: "gray",
                      };
                      const color = stateColor[t.workflow_state || ""] || "gray";
                      const destination = t.custom_local_travel
                        ? t.custom_local_place_of_travel || t.custom_duty_station || "-"
                        : t.custom_place_of_travel_per_diem || t.custom_duty_station || "-";
                      return (
                        <tr
                          key={t.name}
                          onClick={() =>
                            (globalThis as any).frappe?.set_route(
                              "Form",
                              "Travel Request",
                              t.name
                            )
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <a
                              className="text-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                (globalThis as any).frappe?.set_route(
                                  "Form",
                                  "Travel Request",
                                  t.name
                                );
                              }}
                              href="#"
                              style={{ fontSize: 12 }}
                            >
                              {t.name}
                            </a>
                          </td>
                          <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.purpose_of_travel || <span className="text-muted">-</span>}
                          </td>
                          <td>{destination}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {formatDate(t.custom_travel_date)}
                          </td>
                          <td>
                            <span
                              className={`indicator-pill ${color}`}
                              style={{ fontSize: 11 }}
                            >
                              <span>{t.workflow_state || "Draft"}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>

          {/* Right: personal info */}
          <div className="col-md-4">
            <div className="frappe-card p-3 mb-3">
              <h6
                className="font-weight-bold text-muted mb-3"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                Personal Details
              </h6>
              <Field label="Gender" value={emp.gender} />
              <Field label="Company Email" value={emp.company_email} />
              <Field label="Phone" value={emp.cell_number} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
