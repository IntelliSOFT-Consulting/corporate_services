import React, { useState } from "react";
import { useEmployeesOnLeave } from "./hooks/useEmployeesOnLeave";

function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function OnLeaveCard({ onOpen }: { onOpen: (employee: string) => void }) {
  const { leaves, loading } = useEmployeesOnLeave();
  const [expanded, setExpanded] = useState(true);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="frappe-card p-3 mb-3 sm-fade-in">
      <div
        className="d-flex align-items-center justify-content-between"
        style={{ cursor: "pointer", marginBottom: expanded ? 12 : 0 }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="d-flex align-items-center" style={{ gap: 10 }}>
          <h6 className="font-weight-bold mb-0">On Leave Today</h6>
          <span className="text-muted" style={{ fontSize: 12 }}>{today}</span>
          {!loading && (
            <span
              className={`indicator-pill ${leaves.length > 0 ? "orange" : "green"}`}
              style={{ fontSize: 11 }}
            >
              <span>{leaves.length} {leaves.length === 1 ? "employee" : "employees"}</span>
            </span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <>
          {loading ? (
            <div className="text-muted text-center py-3" style={{ fontSize: 13 }}>
              <div className="spinner-border spinner-border-sm mr-2" role="status" />
              Loading…
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 13 }}>
              No employees on leave today.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
                <thead className="thead-light">
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Days</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((row) => (
                    <tr
                      key={`${row.employee}-${row.from_date}`}
                      onClick={() => onOpen(row.employee)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className="font-weight-semibold">{row.employee_name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{row.employee}</div>
                      </td>
                      <td>{row.department || <span className="text-muted">-</span>}</td>
                      <td>
                        <span className="indicator-pill blue" style={{ fontSize: 11 }}>
                          <span>{row.leave_type}</span>
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.from_date)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.to_date)}</td>
                      <td>{row.total_leave_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
