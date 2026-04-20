import React from "react";
import { useExitDetail } from "./hooks/useExitDetail";

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const empty = !value;
  return (
    <div>
      <div className="et-field-label">{label}</div>
      <div className={`et-field-value${empty ? " empty" : ""}`}>
        {empty ? "-" : value}
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

function tenure(joining?: string | null, relieving?: string | null) {
  if (!joining || !relieving) return null;
  const d1 = new Date(joining);
  const d2 = new Date(relieving);
  const totalMonths =
    (d2.getFullYear() - d1.getFullYear()) * 12 +
    (d2.getMonth() - d1.getMonth());
  if (totalMonths < 0) return null;
  if (totalMonths < 12)
    return `${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  return rem > 0
    ? `${years} year${years !== 1 ? "s" : ""}, ${rem} month${rem !== 1 ? "s" : ""}`
    : `${years} year${years !== 1 ? "s" : ""}`;
}

const DECISION_COLOR: Record<string, string> = {
  "Exit Confirmed": "red",
  "Employee Retained": "green",
};

interface Props {
  employee: string;
  onBack: () => void;
  onDataLoaded?: (employeeName: string, exitInterviewId: string | null) => void;
}

export function ExitDetail({ employee, onBack, onDataLoaded }: Props) {
  const { data, loading, error } = useExitDetail(employee);

  const emp = data?.employee;
  const ei = data?.exit_interview;

  React.useEffect(() => {
    if (emp && onDataLoaded) {
      onDataLoaded(emp.employee_name || employee, ei?.name || null);
    }
  }, [emp, ei]);

  return (
    <div className="et-fade-in">
      {/* Header */}
      <div className="et-detail-header">
        <button
          type="button"
          className="et-detail-back"
          onClick={onBack}
          title="Back to list"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h5 className="et-detail-title">
          {loading ? "Loading…" : emp?.employee_name || employee}
          <span className="et-detail-id">{employee}</span>
        </h5>

        {emp && (
          <div className="et-detail-actions">
            {ei && (
              <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={() =>
                  (globalThis as any).frappe?.set_route(
                    "Form",
                    "Exit Interview",
                    ei.name
                  )
                }
              >
                View Exit Interview
              </button>
            )}
            <button
              type="button"
              className="btn btn-default btn-sm"
              onClick={() =>
                (globalThis as any).frappe?.set_route(
                  "Form",
                  "Employee",
                  employee
                )
              }
            >
              Open Employee Record
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="text-center text-muted"
          style={{ padding: "48px 0" }}
        >
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ marginTop: 10 }}>Loading…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Content */}
      {emp && !loading && (
        <div className="row">
          {/* Left column */}
          <div className="col-md-8">
            {/* Employee details */}
            <div
              className="frappe-card"
              style={{ padding: "16px 20px", marginBottom: 16 }}
            >
              <h6 className="et-section-title">Employee Details</h6>
              <div className="et-field-grid">
                <Field label="Employee ID" value={emp.name} />
                <Field label="Full Name" value={emp.employee_name} />
                <Field label="Department" value={emp.department} />
                <Field label="Designation" value={emp.designation} />
                <Field label="Company" value={emp.company} />
                <Field label="Employment Type" value={emp.employment_type} />
                <Field label="Reports To" value={emp.reports_to} />
                <Field label="Gender" value={emp.gender} />
              </div>
            </div>

            {/* Service period */}
            <div
              className="frappe-card"
              style={{ padding: "16px 20px", marginBottom: 16 }}
            >
              <h6 className="et-section-title">Service Period</h6>
              <div className="et-field-grid">
                <Field
                  label="Date of Joining"
                  value={formatDate(emp.date_of_joining)}
                />
                <Field
                  label="Relieving Date"
                  value={formatDate(emp.relieving_date)}
                />
                <Field
                  label="Total Tenure"
                  value={tenure(emp.date_of_joining, emp.relieving_date)}
                />
              </div>
            </div>

            {/* Exit interview */}
            <div
              className="frappe-card"
              style={{ padding: "16px 20px", marginBottom: 16 }}
            >
              <h6 className="et-section-title">Exit Interview</h6>
              {ei ? (
                <>
                  <div className="et-field-grid" style={{ marginBottom: 12 }}>
                    <Field label="Reference" value={ei.name} />
                    <Field
                      label="Interview Date"
                      value={formatDate(ei.date)}
                    />
                    <Field label="Status" value={ei.status} />
                    <div>
                      <div className="et-field-label">Final Decision</div>
                      {ei.employee_status ? (
                        <span
                          className={`indicator-pill ${
                            DECISION_COLOR[ei.employee_status] || "gray"
                          }`}
                          style={{ fontSize: 12 }}
                        >
                          <span>{ei.employee_status}</span>
                        </span>
                      ) : (
                        <div className="et-field-value empty">-</div>
                      )}
                    </div>
                  </div>
                  {ei.interview_summary && (
                    <div>
                      <div className="et-field-label">Interview Summary</div>
                      <div
                        className="et-field-value"
                        style={{ whiteSpace: "pre-wrap", marginTop: 4 }}
                      >
                        {ei.interview_summary}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted" style={{ fontSize: 13 }}>
                  No exit interview on record for this employee.
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="col-md-4">
            <div
              className="frappe-card"
              style={{ padding: "16px 20px", marginBottom: 16 }}
            >
              <h6 className="et-section-title">Contact</h6>
              <div
                className="et-field-grid"
                style={{ gridTemplateColumns: "1fr" }}
              >
                <Field label="Company Email" value={emp.company_email} />
                <Field label="Personal Email" value={emp.personal_email} />
                <Field label="Phone" value={emp.cell_number} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
