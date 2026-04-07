import React, { useEffect, useState, useMemo } from "react";

const PAGE = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow";
const NOTIFY_API = "corporate_services.api.timesheet.notify_non_submitters.notify_non_submitters";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_BADGE = {
  Approved:  "bg-success",
  Rejected:  "bg-danger",
  Cancelled: "bg-secondary",
  Open:      "bg-warning text-dark",
};

const WF_STYLE = {
  "Approved by Finance":    "color:#16a34a;font-weight:600",
  "Approved By HR":         "color:#16a34a;font-weight:600",
  "Approved by Supervisor": "color:#16a34a;font-weight:600",
  "Rejected By Supervisor": "color:#dc2626;font-weight:600",
  "Rejected By HR":         "color:#dc2626;font-weight:600",
  "Rejected by Finance":    "color:#dc2626;font-weight:600",
  "Submitted to Supervisor":"color:#f59e0b;font-weight:600",
  "Submitted to HR":        "color:#f59e0b;font-weight:600",
  "Submitted to Finance":   "color:#f59e0b;font-weight:600",
};

// Convert MM-YYYY → "March 2026"
function fmtMonth(value) {
  if (!value || !value.includes("-")) return value || "";
  const [m, y] = value.split("-");
  const n = parseInt(m);
  return n >= 1 && n <= 12 ? `${MONTH_NAMES[n]} ${y}` : value;
}

// Generate [{value:"MM-YYYY", label:"Month YYYY"}, ...] for last 24 + next 3 months
function buildMonthOptions() {
  const opts = [{ value: "", label: "All Months" }];
  const now = new Date();
  for (let i = 24; i >= -3; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    opts.push({ value: `${m}-${y}`, label: `${MONTH_NAMES[d.getMonth() + 1]} ${y}` });
  }
  return opts;
}

function TimesheetSubmissions({
  employee = null,      // Employee dict when viewing a specific employee
  roleContext = null,   // { role, employee, reportees }
  onBack,
  onEmployeeClick,
  onSubmissionClick,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [nonSubmitters, setNonSubmitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("");

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const role = roleContext?.role || "employee";
  const showWorkflowState = role === "hr_finance";
  const showNonSubmittersSection = role !== "employee";

  // ── Fetch submissions whenever employee or monthFilter changes ───────────
  useEffect(() => {
    setLoading(true);
    setNonSubmitters([]);

    const method = employee
      ? `${PAGE}.get_timesheet_submissions_by_employee`
      : `${PAGE}.get_all_timesheet_submissions`;

    const args = employee
      ? { employee_name: employee.name || employee.employee_name, month_year: monthFilter || null }
      : { month_year: monthFilter || null };

    frappe.call({
      method,
      args,
      callback: (r) => {
        setSubmissions(r.message || []);
        setLoading(false);
      },
    });

    // Fetch non-submitters when a month is selected and user has scope
    if (monthFilter && showNonSubmittersSection) {
      frappe.call({
        method: `${PAGE}.get_not_submitted_employees`,
        args: { month_year: monthFilter },
        callback: (r) => {
          setNonSubmitters(r.message || []);
        },
      });
    }
  }, [employee, monthFilter]);

  // ── Re-render charts after submissions load ──────────────────────────────
  useEffect(() => {
    if (submissions.length > 0) renderCharts();
  }, [submissions]);

  // ── Notify non-submitters ────────────────────────────────────────────────
  const handleNotify = () => {
    if (!monthFilter) {
      frappe.msgprint({ title: "Select a Month", message: "Please select a Month-Year filter first.", indicator: "orange" });
      return;
    }
    if (!nonSubmitters.length) {
      frappe.msgprint({ title: "No Non-Submitters", message: `All employees have submitted for ${fmtMonth(monthFilter)}.`, indicator: "green" });
      return;
    }
    const employeeList = nonSubmitters.map((e) => e.name);
    const preview = nonSubmitters.slice(0, 5).map((e) => e.employee_name).join(", ");
    const extra = nonSubmitters.length > 5 ? ` and ${nonSubmitters.length - 5} more` : "";

    frappe.confirm(
      `Send a reminder to <strong>${nonSubmitters.length}</strong> employee(s)?<br><small style="color:#6c757d">${preview}${extra}</small>`,
      () => {
        frappe.call({
          method: NOTIFY_API,
          args: { month_year: monthFilter, employee_list: JSON.stringify(employeeList) },
          freeze: true,
          freeze_message: "Sending reminders…",
          callback: (r) => {
            frappe.show_alert({ message: r.message, indicator: "green" });
          },
        });
      }
    );
  };

  // ── Chart rendering (Chart.js) ───────────────────────────────────────────
  const renderCharts = () => {
    if (typeof window.Chart === "undefined") return;
    const Chart = window.Chart;
    ["hoursChart", "statusChart", "trendChart", "employeeChart"].forEach((id) => {
      const c = Chart.getChart(id);
      if (c) c.destroy();
    });

    const hoursCtx = document.getElementById("hoursChart");
    if (hoursCtx) {
      const monthlyData = {};
      submissions.forEach((ts) => {
        const m = ts.month_year || "Unknown";
        monthlyData[m] = (monthlyData[m] || 0) + parseFloat(ts.total_working_hours || 0);
      });
      new Chart(hoursCtx, {
        type: "bar",
        data: {
          labels: Object.keys(monthlyData).map(fmtMonth),
          datasets: [{ label: "Total Hours", data: Object.values(monthlyData), backgroundColor: "rgba(54,162,235,0.6)", borderColor: "rgba(54,162,235,1)", borderWidth: 1 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Total Hours by Month", font: { size: 14 } } }, scales: { y: { beginAtZero: true } } },
      });
    }

    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
      const statusData = {};
      submissions.forEach((ts) => { const s = ts.status || "Unknown"; statusData[s] = (statusData[s] || 0) + 1; });
      const colors = { Open: "rgba(255,206,86,.6)", Approved: "rgba(75,192,192,.6)", Rejected: "rgba(255,99,132,.6)", Cancelled: "rgba(201,203,207,.6)" };
      new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusData),
          datasets: [{ data: Object.values(statusData), backgroundColor: Object.keys(statusData).map((s) => colors[s] || "rgba(153,102,255,.6)"), borderWidth: 1 }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Status Distribution", font: { size: 14 } }, legend: { position: "bottom" } } },
      });
    }

    const trendCtx = document.getElementById("trendChart");
    if (trendCtx) {
      const trendData = {};
      [...submissions].sort((a, b) => new Date(a.creation) - new Date(b.creation))
        .forEach((ts) => { const m = ts.month_year || "Unknown"; trendData[m] = (trendData[m] || 0) + 1; });
      new Chart(trendCtx, {
        type: "line",
        data: {
          labels: Object.keys(trendData).map(fmtMonth),
          datasets: [{ label: "Submissions", data: Object.values(trendData), borderColor: "rgba(75,192,192,1)", backgroundColor: "rgba(75,192,192,.2)", tension: 0.4, fill: true }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Submission Trend", font: { size: 14 } } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
      });
    }

    if (!employee) {
      const employeeCtx = document.getElementById("employeeChart");
      if (employeeCtx) {
        const empData = {};
        submissions.forEach((ts) => {
          const n = ts.employee_name || ts.employee || "Unknown";
          empData[n] = (empData[n] || 0) + parseFloat(ts.total_working_hours || 0);
        });
        const sorted = Object.entries(empData).sort((a, b) => b[1] - a[1]).slice(0, 10);
        new Chart(employeeCtx, {
          type: "bar",
          data: {
            labels: sorted.map((e) => e[0]),
            datasets: [{ label: "Total Hours", data: sorted.map((e) => e[1]), backgroundColor: "rgba(153,102,255,.6)", borderColor: "rgba(153,102,255,1)", borderWidth: 1 }],
          },
          options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: "Top 10 Employees by Hours", font: { size: 14 } } }, scales: { x: { beginAtZero: true } } },
        });
      }
    }
  };

  // ── Page title ────────────────────────────────────────────────────────────
  const title = employee
    ? `${employee.employee_name}'s Timesheet Submissions`
    : role === "employee"
    ? "My Timesheet Submissions"
    : role === "supervisor"
    ? "My Team's Timesheet Submissions"
    : "All Timesheet Submissions";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // ── Controls bar (month filter + notify) ─────────────────────────────────
  const controlsBar = (
    <div className="d-flex align-items-center gap-3 flex-wrap mb-4">
      {/* Month filter */}
      <div className="d-flex align-items-center gap-2">
        <label style={{ fontSize: 13, fontWeight: 500, color: "#495057", marginBottom: 0, whiteSpace: "nowrap" }}>
          Month:
        </label>
        <select
          className="form-select form-select-sm"
          style={{ minWidth: 160, fontSize: 13 }}
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Notify button — supervisor / hr_finance only when month selected */}
      {showNonSubmittersSection && monthFilter && (
        <button
          className="btn btn-sm btn-warning"
          onClick={handleNotify}
          title="Send reminder to employees who haven't submitted"
        >
          Notify Non-Submitters
          {nonSubmitters.length > 0 && (
            <span className="badge bg-danger ms-2" style={{ fontSize: 10 }}>
              {nonSubmitters.length}
            </span>
          )}
        </button>
      )}
    </div>
  );

  // ── Empty state ───────────────────────────────────────────────────────────
  if (submissions.length === 0 && nonSubmitters.length === 0) {
    return (
      <div className="container py-5">
        {onBack && (
          <button className="btn btn-secondary mb-3" onClick={onBack}>
            ← Back
          </button>
        )}
        <h1 className="mb-4 text-center" style={{ fontSize: 22 }}>{title}</h1>
        {controlsBar}
        <div className="card">
          <div className="card-body text-center py-5">
            <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>📋</div>
            <h5 className="text-muted mt-2">No Timesheet Submissions Found</h5>
            <p className="text-muted" style={{ fontSize: 13 }}>
              {monthFilter
                ? `No submissions for ${fmtMonth(monthFilter)}.`
                : employee
                ? "This employee has not submitted any timesheets yet."
                : "No submissions found."}
            </p>
            {onBack && (
              <button className="btn btn-primary mt-3" onClick={onBack}>
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Non-submitters even when 0 submitted */}
        {showNonSubmittersSection && monthFilter && nonSubmitters.length > 0 && (
          <NonSubmittersSection
            nonSubmitters={nonSubmitters}
            monthFilter={monthFilter}
            onNotify={handleNotify}
          />
        )}
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="container py-4">
      {onBack && (
        <button className="btn btn-secondary mb-3" onClick={onBack}>
          ← Back
        </button>
      )}
      <h1 className="mb-4 text-center" style={{ fontSize: 22 }}>{title}</h1>

      {controlsBar}

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total Submissions", value: submissions.length, color: "#0d6efd" },
          { label: "Total Hours", value: submissions.reduce((s, t) => s + parseFloat(t.total_working_hours || 0), 0).toFixed(1), color: "#6610f2" },
          { label: "Approved", value: submissions.filter((t) => t.status === "Approved").length, color: "#16a34a" },
          { label: "Pending", value: submissions.filter((t) => t.status === "Open").length, color: "#f59e0b" },
        ].map((c) => (
          <div key={c.label} className="col-6 col-md-3">
            <div className="card h-100">
              <div className="card-body text-center py-3">
                <div style={{ fontSize: 11, color: "#6c757d", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6"><div className="card"><div className="card-body" style={{ height: 300 }}><canvas id="hoursChart" /></div></div></div>
        <div className="col-lg-6"><div className="card"><div className="card-body" style={{ height: 300 }}><canvas id="statusChart" /></div></div></div>
        <div className="col-lg-6"><div className="card"><div className="card-body" style={{ height: 300 }}><canvas id="trendChart" /></div></div></div>
        {!employee && (
          <div className="col-lg-6"><div className="card"><div className="card-body" style={{ height: 300 }}><canvas id="employeeChart" /></div></div></div>
        )}
      </div>

      {/* Submissions table */}
      <h6 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6c757d", marginBottom: 10 }}>
        Submission Details
      </h6>
      <div className="table-responsive">
        <table className="table table-bordered ts-sub-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              {role !== "employee" && <th>Employee</th>}
              <th>Month</th>
              <th>Total Hours</th>
              <th>Status</th>
              {showWorkflowState && <th>Workflow State</th>}
              <th>Submitted On</th>
              <th style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((ts, index) => {
              const empName = ts.employee_name || ts.employee;
              return (
                <tr key={ts.name}>
                  <td className="text-muted" style={{ fontSize: 12 }}>{index + 1}</td>
                  {role !== "employee" && (
                    <td>
                      {!employee ? (
                        <span
                          style={{ cursor: "pointer", color: "#0d6efd", textDecoration: "underline" }}
                          onClick={() => onEmployeeClick && onEmployeeClick(empName)}
                        >
                          {empName}
                        </span>
                      ) : (
                        empName
                      )}
                    </td>
                  )}
                  <td>{fmtMonth(ts.month_year)}</td>
                  <td>{ts.total_working_hours ?? "—"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[ts.status] || "bg-secondary"}`}>
                      {ts.status}
                    </span>
                  </td>
                  {showWorkflowState && (
                    <td>
                      <span style={WF_STYLE[ts.workflow_state] ? { ...Object.fromEntries(WF_STYLE[ts.workflow_state].split(";").filter(Boolean).map(s => s.split(":"))) } : {}}>
                        {ts.workflow_state || "—"}
                      </span>
                    </td>
                  )}
                  <td style={{ fontSize: 12 }}>{ts.creation ? new Date(ts.creation).toLocaleDateString() : "—"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onSubmissionClick && onSubmissionClick(ts)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Non-submitters section */}
      {showNonSubmittersSection && monthFilter && (
        <NonSubmittersSection
          nonSubmitters={nonSubmitters}
          monthFilter={monthFilter}
          onNotify={handleNotify}
        />
      )}

      <style>{`
        .ts-sub-table thead th { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#6c757d; background:#f8f9fa; padding:10px 12px; }
        .ts-sub-table tbody td { padding:9px 12px; vertical-align:middle; font-size:13px; }
        .ts-sub-table tbody tr:hover td { background:rgba(13,110,253,.03); }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Non-submitters sub-component
// ---------------------------------------------------------------------------
function NonSubmittersSection({ nonSubmitters, monthFilter, onNotify }) {
  if (!nonSubmitters.length) {
    return (
      <div className="alert alert-success mt-4" style={{ fontSize: 13 }}>
        ✓ All employees have submitted their timesheet for <strong>{fmtMonth(monthFilter)}</strong>.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626", margin: 0 }}>
          Not Submitted — {fmtMonth(monthFilter)}
          <span className="badge bg-danger ms-2" style={{ fontSize: 10, fontWeight: 700 }}>{nonSubmitters.length}</span>
        </h6>
        <button className="btn btn-sm btn-warning" onClick={onNotify}>
          Notify All ({nonSubmitters.length})
        </button>
      </div>

      <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: 12 }}>
        The following employee(s) have <strong>not yet submitted</strong> their timesheet for{" "}
        <strong>{fmtMonth(monthFilter)}</strong>.
      </div>

      <div className="table-responsive">
        <table className="table table-bordered ts-sub-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Designation</th>
            </tr>
          </thead>
          <tbody>
            {nonSubmitters.map((emp, i) => (
              <tr key={emp.name}>
                <td className="text-muted" style={{ fontSize: 12 }}>{i + 1}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{emp.employee_name}</div>
                  <div style={{ fontSize: 11, color: "#adb5bd" }}>{emp.name}</div>
                </td>
                <td style={{ fontSize: 13 }}>{emp.department || "—"}</td>
                <td style={{ fontSize: 13 }}>{emp.designation || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TimesheetSubmissions;
