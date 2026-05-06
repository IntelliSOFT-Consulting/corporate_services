import React, { useState, useEffect, useCallback } from "react";
import { ConsultantTimeOffRow } from "./types";

function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toCSV(rows: ConsultantTimeOffRow[]): string {
  const headers = [
    "Employee ID",
    "Employee Name",
    "Department",
    "Designation",
    "Employment Type",
    "Leave Type",
    "From Date",
    "To Date",
    "Total Days",
    "Leave Application",
  ];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.employee,
        r.employee_name,
        r.department ?? "",
        r.designation ?? "",
        r.employment_type ?? "",
        r.leave_type,
        r.from_date,
        r.to_date,
        r.total_leave_days,
        r.leave_application,
      ]
        .map(escape)
        .join(",")
    ),
  ];
  return lines.join("\r\n");
}

function downloadCSV(rows: ConsultantTimeOffRow[], fromDate: string, toDate: string) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consultant_time_off_${fromDate}_to_${toDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function defaultFromDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

export function ConsultantTimeOffTab() {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [department, setDepartment] = useState("");
  const [rows, setRows] = useState<ConsultantTimeOffRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    (globalThis as any).frappe
      .call({ method: "corporate_services.api.staff_management.get_staff_stats" })
      .then((r: any) => {
        const depts: string[] = (r.message?.department_breakdown ?? []).map(
          (d: { department: string }) => d.department
        );
        setDepartments(depts.filter(Boolean).sort());
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    (globalThis as any).frappe
      .call({
        method:
          "corporate_services.api.staff_management.get_consultant_time_off_report",
        args: { from_date: fromDate, to_date: toDate, department: department || undefined },
      })
      .then((r: any) => {
        setRows(r.message || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [fromDate, toDate, department]);

  useEffect(() => {
    load();
  }, [load]);

  const totalDays = rows.reduce((s, r) => s + (r.total_leave_days || 0), 0);
  const uniqueConsultants = new Set(rows.map((r) => r.employee)).size;

  return (
    <div className="sm-fade-in" style={{ padding: "0 4px" }}>
      <div
        className="d-flex align-items-center justify-content-between flex-wrap mb-3"
        style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-color, #e2e6ea)", marginTop: 4, gap: 10 }}
      >
        <div>
          <h5 className="font-weight-bold mb-0">Consultant Time Off Report</h5>
          <p className="text-muted mb-0" style={{ fontSize: 12 }}>
            Approved leave taken by consultants within the selected period.
          </p>
        </div>
        <button
          className="btn btn-sm btn-success"
          disabled={rows.length === 0}
          onClick={() => downloadCSV(rows, fromDate, toDate)}
        >
          Download CSV
        </button>
      </div>

      <div className="frappe-card p-3 mb-3 d-flex flex-wrap align-items-end" style={{ gap: 12 }}>
        <div>
          <label className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
            From Date
          </label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        <div>
          <label className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
            To Date
          </label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        <div>
          <label className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
            Department
          </label>
          <select
            className="form-control form-control-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-sm btn-primary" onClick={load} style={{ marginTop: 18 }}>
          Apply
        </button>
      </div>

      <div className="row mb-3">
        <div className="col-md-3 col-sm-6 mb-2">
          <div className="frappe-card p-3 text-center">
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Consultants</div>
            <div className="sm-stat-value">{uniqueConsultants}</div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-2">
          <div className="frappe-card p-3 text-center">
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Records</div>
            <div className="sm-stat-value">{rows.length}</div>
          </div>
        </div>
        <div className="col-md-3 col-sm-6 mb-2">
          <div className="frappe-card p-3 text-center">
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>Total Days Off</div>
            <div className="sm-stat-value">{totalDays}</div>
          </div>
        </div>
      </div>

      <div className="frappe-card p-0 mb-3">
        {loading ? (
          <div className="text-muted text-center py-4" style={{ fontSize: 13 }}>
            <div className="spinner-border spinner-border-sm mr-2" role="status" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-muted p-4" style={{ fontSize: 13 }}>
            No consultant time off records found for the selected period.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0" style={{ fontSize: 13 }}>
              <thead className="thead-light">
                <tr>
                  <th>Consultant</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.leave_application}>
                    <td>
                      <div className="font-weight-semibold">{r.employee_name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {r.employee} {r.designation ? `· ${r.designation}` : ""}
                      </div>
                    </td>
                    <td>{r.department || <span className="text-muted">-</span>}</td>
                    <td>
                      <span className="indicator-pill blue" style={{ fontSize: 11 }}>
                        <span>{r.leave_type}</span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.from_date)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(r.to_date)}</td>
                    <td>{r.total_leave_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
