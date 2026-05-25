import React, { useEffect, useMemo, useState } from "react";

type DashboardRow = {
  employee?: string;
  employee_name?: string;
  department?: string;
  designation?: string;
  supervisor?: string;
  review_period?: string;
  reflection_name?: string;
  submitted_on?: string;
  workflow_state?: string;
};

type DashboardData = {
  review_period?: string;
  summary?: {
    total_active_staff?: number;
    submitted_count?: number;
    missing_count?: number;
  };
  submitted_rows?: DashboardRow[];
  missing_rows?: DashboardRow[];
};

const PAGE_SIZE = 10;

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="col-md-4">
      <div className="card border h-100">
        <div className="card-body">
          <div className="text-muted" style={{ fontSize: 12 }}>
            {label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function DashboardTable({
  title,
  rows,
  isMissing,
  reviewPeriod,
}: {
  title: string;
  rows: DashboardRow[];
  isMissing: boolean;
  reviewPeriod: string;
}) {
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalRows);
  const pageRows = rows.slice(startIndex, endIndex);
  const frappe = (globalThis as any).frappe;

  return (
    <div className="card border mb-3">
      <div className="card-body">
        <h6 className="mb-3">{title}</h6>
        {!rows.length ? (
          <div className="text-muted">No records found.</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Job Title</th>
                    <th>Supervisor</th>
                    {isMissing ? <th>Action</th> : <th>Reflection</th>}
                    {!isMissing && <th>Submitted On</th>}
                    {!isMissing && <th>Workflow State</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={`${row.employee || "row"}-${i}`}>
                      <td>{row.employee_name || row.employee || ""}</td>
                      <td>{row.department || ""}</td>
                      <td>{row.designation || ""}</td>
                      <td>{row.supervisor || ""}</td>
                      {isMissing ? (
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              if (!row.employee || !reviewPeriod) return;
                              frappe.call({
                                method:
                                  "corporate_services.api.notification.monthly_reflection.monthly_reflection.send_manual_monthly_reflection_dual_reminder",
                                args: {
                                  employee: row.employee,
                                  review_period: reviewPeriod,
                                },
                                freeze: true,
                                freeze_message: "Sending reminder...",
                                callback: (r: any) => {
                                  const msg = (r.message && r.message.message) || "Reminder sent.";
                                  frappe.show_alert({ message: msg, indicator: "green" });
                                },
                                error: () => {
                                  frappe.show_alert({
                                    message: "Failed to send reminder.",
                                    indicator: "red",
                                  });
                                },
                              });
                            }}
                          >
                            Notify
                          </button>
                        </td>
                      ) : (
                        <td>
                          {row.reflection_name ? (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                frappe?.set_route("Form", "Monthly Reflection", row.reflection_name);
                              }}
                            >
                              {row.reflection_name}
                            </a>
                          ) : (
                            ""
                          )}
                        </td>
                      )}
                      {!isMissing && <td>{row.submitted_on || ""}</td>}
                      {!isMissing && <td>{row.workflow_state || ""}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
              <div className="text-muted small">
                Showing {startIndex + 1}-{endIndex} of {totalRows}
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="small text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function MonthlyReflectionTab() {
  const frappe = (globalThis as any).frappe;
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [periodOptions, setPeriodOptions] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [appliedPeriod, setAppliedPeriod] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<DashboardData>({});

  const years = useMemo(() => [currentYear - 1, currentYear, currentYear + 1], [currentYear]);

  useEffect(() => {
    frappe.call({
      method:
        "corporate_services.icl_corporate_services.doctype.monthly_reflection.monthly_reflection.get_monthly_reflection_review_period_options",
      args: { year },
      callback: (r: any) => {
        const options = (r && r.message) || [];
        setPeriodOptions(options);
        const current = `${new Date().toLocaleString("en-US", { month: "long" })} ${year}`;
        const initial = options.includes(current) ? current : options[0] || "";
        setSelectedPeriod(initial);
        setAppliedPeriod(initial);
      },
      error: () => {
        setPeriodOptions([]);
        setSelectedPeriod("");
        setAppliedPeriod("");
      },
    });
  }, [year]);

  useEffect(() => {
    if (!appliedPeriod) return;
    setLoading(true);
    frappe.call({
      method:
        "corporate_services.icl_corporate_services.doctype.monthly_reflection.monthly_reflection.get_monthly_reflection_dashboard_data",
      args: { review_period: appliedPeriod },
      callback: (r: any) => {
        setPayload((r && r.message) || {});
        setLoading(false);
      },
      error: () => {
        setPayload({});
        setLoading(false);
      },
    });
  }, [appliedPeriod]);

  const summary = payload.summary || {};
  const missingRows = payload.missing_rows || [];
  const submittedRows = payload.submitted_rows || [];
  const activePeriod = payload.review_period || appliedPeriod;

  return (
    <div className="container-fluid p-0">
      <div className="card border mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label mb-1">Year</label>
              <select
                className="form-control"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || currentYear)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-5">
              <label className="form-label mb-1">Review Period</label>
              <select
                className="form-control"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {periodOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-primary w-100"
                onClick={() => setAppliedPeriod(selectedPeriod)}
              >
                Apply
              </button>
            </div>
            <div className="col-md-2">
              <button
                className="btn btn-default w-100"
                onClick={() => frappe?.set_route("List", "Monthly Reflection")}
              >
                Open List
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted">Loading dashboard...</div>
      ) : (
        <>
          <div className="alert alert-info mb-3">
            <strong>Review Period:</strong> {activePeriod}
          </div>
          <div className="row g-3 mb-3">
            <Metric label="Active Staff" value={summary.total_active_staff || 0} />
            <Metric label="Submitted" value={summary.submitted_count || 0} />
            <Metric label="Missing" value={summary.missing_count || 0} />
          </div>
          <DashboardTable
            title="Missing Monthly Reflections"
            rows={missingRows}
            isMissing
            reviewPeriod={activePeriod || ""}
          />
          <DashboardTable
            title="Submitted Monthly Reflections"
            rows={submittedRows}
            isMissing={false}
            reviewPeriod={activePeriod || ""}
          />
        </>
      )}
    </div>
  );
}
