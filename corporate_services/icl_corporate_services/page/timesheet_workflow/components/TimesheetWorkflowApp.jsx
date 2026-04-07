import React, { useEffect, useState, useMemo } from "react";
import TimesheetSubmissions from "./TimesheetSubmissions";
import SubmissionDetails from "./SubmissionDetails";

const PAGE = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow";

function TimesheetWorkflowApp() {
  const [employees, setEmployees] = useState([]);
  const [roleContext, setRoleContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Initial load: role context then employee list ───────────────────────
  useEffect(() => {
    frappe.call({
      method: `${PAGE}.get_role_context`,
      callback: (r) => {
        const ctx = r.message || { role: "employee", employee: null, reportees: [] };
        setRoleContext(ctx);

        frappe.call({
          method: `${PAGE}.get_all_employees`,
          callback: (r2) => {
            setEmployees(r2.message || []);
            setLoading(false);
          },
        });
      },
    });
  }, []);

  // ── Auto-navigate employees directly to their submissions ────────────────
  useEffect(() => {
    if (!loading && roleContext && roleContext.role === "employee") {
      setShowAllSubmissions(true);
    }
  }, [loading, roleContext]);

  // ── Route change handler ─────────────────────────────────────────────────
  useEffect(() => {
    let isHandling = false;

    const handleRouteChange = () => {
      if (isHandling) return;
      isHandling = true;
      const route = frappe.get_route();

      if (route.length > 1 && route[0] === "timesheet_workflow") {
        if (route[1] === "all-submissions") {
          setShowAllSubmissions(true);
          setSelectedEmployee(null);
          setSelectedSubmission(null);
        } else if (route[1] === "employee" && route[2]) {
          const employeeId = decodeURIComponent(route[2]);
          if (route[3] === "submission" && route[4]) {
            const submissionId = decodeURIComponent(route[4]);
            const emp = employees.find((e) => e.name === employeeId || e.employee_name === employeeId);
            if (emp) {
              setSelectedEmployee(emp);
              setSelectedSubmission({ name: submissionId });
              setShowAllSubmissions(false);
            }
          } else {
            const emp = employees.find((e) => e.name === employeeId || e.employee_name === employeeId);
            if (emp) {
              setSelectedEmployee(emp);
              setSelectedSubmission(null);
              setShowAllSubmissions(false);
            }
          }
        } else {
          // Only reset to home if role allows a directory view
          if (roleContext && roleContext.role !== "employee") {
            setShowAllSubmissions(false);
            setSelectedEmployee(null);
            setSelectedSubmission(null);
          }
        }
      } else if (route[0] === "timesheet_workflow" && route.length === 1) {
        if (roleContext && roleContext.role === "employee") {
          setShowAllSubmissions(true); // employees stay on their submissions
        } else {
          setShowAllSubmissions(false);
          setSelectedEmployee(null);
          setSelectedSubmission(null);
        }
      }

      setTimeout(() => { isHandling = false; }, 100);
    };

    if (!loading && employees !== undefined) handleRouteChange();
    frappe.router.on("change", handleRouteChange);
    return () => { frappe.router.off("change", handleRouteChange); };
  }, [employees, loading, roleContext]);

  // ── Filtered employees for the directory search ──────────────────────────
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        (e.employee_name || "").toLowerCase().includes(q) ||
        (e.name || "").toLowerCase().includes(q) ||
        (e.department || "").toLowerCase().includes(q) ||
        (e.designation || "").toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const navigateToAllSubmissions = () => frappe.set_route("timesheet_workflow", "all-submissions");
  const navigateToEmployeeSubmissions = (employee) =>
    frappe.set_route("timesheet_workflow", "employee", employee.name);
  const navigateToSubmissionDetails = (employee, submission) =>
    frappe.set_route("timesheet_workflow", "employee", employee.name, "submission", submission.name);
  const navigateToHome = () => {
    if (roleContext && roleContext.role === "employee") {
      setShowAllSubmissions(true);
    } else {
      frappe.set_route("timesheet_workflow");
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || !roleContext) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isEmployee = roleContext.role === "employee";
  const isHrFinance = roleContext.role === "hr_finance";

  // ── Submission detail view ───────────────────────────────────────────────
  if (selectedSubmission && selectedEmployee) {
    return (
      <SubmissionDetails
        submission={selectedSubmission}
        employee={selectedEmployee}
        onBack={() => navigateToEmployeeSubmissions(selectedEmployee)}
      />
    );
  }

  // ── All-submissions view (also the default view for employees) ───────────
  if (showAllSubmissions) {
    return (
      <TimesheetSubmissions
        roleContext={roleContext}
        onBack={isEmployee ? null : navigateToHome}
        onEmployeeClick={(employeeName) => {
          const emp = employees.find(
            (e) => e.employee_name === employeeName || e.name === employeeName
          );
          if (emp) navigateToEmployeeSubmissions(emp);
        }}
        onSubmissionClick={(submission) => {
          const emp = employees.find(
            (e) => e.name === submission.employee || e.employee_name === submission.employee_name
          );
          if (emp) navigateToSubmissionDetails(emp, submission);
        }}
      />
    );
  }

  // ── Employee-specific submissions view ───────────────────────────────────
  if (selectedEmployee) {
    return (
      <TimesheetSubmissions
        employee={selectedEmployee}
        roleContext={roleContext}
        onBack={navigateToHome}
        onSubmissionClick={(submission) =>
          navigateToSubmissionDetails(selectedEmployee, submission)
        }
      />
    );
  }

  // ── Employee directory (home view — supervisor / HR / Finance only) ───────
  return (
    <div className="container py-4">

      {/* Top bar */}
      <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-4">
        <div>
          <button className="btn btn-primary" onClick={navigateToAllSubmissions}>
            {isHrFinance ? "View All Timesheet Submissions" : "View My Team's Submissions"}
          </button>
        </div>

        <div className="ts-search-wrap">
          <svg className="ts-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="ts-search-input"
            placeholder="Search by name, department, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          {searchQuery && (
            <button className="ts-search-clear" onClick={() => setSearchQuery("")} title="Clear">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Section heading */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6c757d", margin: 0 }}>
          {isHrFinance ? "All Employees" : "My Team"}
        </h6>
        <span style={{ fontSize: 12, color: "#6c757d" }}>
          {searchQuery
            ? `${filteredEmployees.length} of ${employees.length} employees`
            : `${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered ts-emp-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>#</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4" style={{ fontSize: 13 }}>
                  {searchQuery
                    ? <>No employees match <strong>"{searchQuery}"</strong></>
                    : "No employees found."}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, index) => (
                <tr key={emp.name}>
                  <td className="text-muted" style={{ fontSize: 12 }}>{index + 1}</td>
                  <td>
                    <div className="ts-emp-name">{emp.employee_name || emp.name}</div>
                    <div className="ts-emp-id">{emp.name}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{emp.department || <span className="text-muted">—</span>}</td>
                  <td style={{ fontSize: 13 }}>{emp.designation || <span className="text-muted">—</span>}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigateToEmployeeSubmissions(emp)}
                    >
                      View Submissions
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .ts-search-wrap { position:relative; display:flex; align-items:center; min-width:280px; max-width:380px; flex:1; }
        .ts-search-icon { position:absolute; left:10px; width:15px; height:15px; color:#adb5bd; pointer-events:none; }
        .ts-search-input { width:100%; padding:7px 32px; font-size:13px; border:1px solid #dee2e6; border-radius:6px; outline:none; transition:border-color .15s,box-shadow .15s; background:#fff; color:#212529; }
        .ts-search-input:focus { border-color:#0d6efd; box-shadow:0 0 0 3px rgba(13,110,253,.1); }
        .ts-search-input::placeholder { color:#adb5bd; }
        .ts-search-clear { position:absolute; right:8px; background:none; border:none; font-size:16px; line-height:1; color:#adb5bd; cursor:pointer; padding:0 4px; }
        .ts-search-clear:hover { color:#495057; }
        .ts-emp-table thead th { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#6c757d; background:#f8f9fa; border-bottom:2px solid #dee2e6; padding:10px 12px; }
        .ts-emp-table tbody td { padding:10px 12px; vertical-align:middle; font-size:13px; }
        .ts-emp-table tbody tr:hover td { background:rgba(13,110,253,.03); }
        .ts-emp-name { font-size:13px; font-weight:500; color:#212529; }
        .ts-emp-id { font-size:11px; color:#adb5bd; margin-top:1px; }
      `}</style>
    </div>
  );
}

export default TimesheetWorkflowApp;
