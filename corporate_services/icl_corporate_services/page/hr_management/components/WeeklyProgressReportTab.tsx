import React, { useEffect, useState } from "react";

type DashboardRow = {
  employee?: string;
  employee_name?: string;
  department?: string;
  supervisor?: string;
  contract_type?: string;
  report_name?: string;
  submitted_on?: string;
};

type DashboardData = {
  week_start?: string;
  week_end?: string;
  contract_type?: string;
  summary?: {
    total_active_interns?: number;
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
}: {
  title: string;
  rows: DashboardRow[];
  isMissing: boolean;
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
                    <th>Supervisor</th>
                    <th>Contract Type</th>
                    {!isMissing && <th>Report</th>}
                    {!isMissing && <th>Submitted On</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={`${row.employee || "row"}-${i}`}>
                      <td>{row.employee_name || row.employee || ""}</td>
                      <td>{row.department || ""}</td>
                      <td>{row.supervisor || ""}</td>
                      <td>{row.contract_type || ""}</td>
                      {!isMissing && (
                        <td>
                          {row.report_name ? (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                frappe?.set_route("Form", "Weekly Progress Report", row.report_name);
                              }}
                            >
                              {row.report_name}
                            </a>
                          ) : (
                            ""
                          )}
                        </td>
                      )}
                      {!isMissing && <td>{row.submitted_on || ""}</td>}
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

export function WeeklyProgressReportTab() {
  const [contractTypeInput, setContractTypeInput] = useState("");
  const [appliedContractType, setAppliedContractType] = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardData>({});
  const [isLoading, setIsLoading] = useState(true);
  const summary = payload.summary || {};
  const submittedRows = payload.submitted_rows || [];
  const missingRows = payload.missing_rows || [];
  const frappe = (globalThis as any).frappe;

  const load = (contractType: string | null) => {
    setIsLoading(true);
    frappe.call({
      method:
        "corporate_services.icl_corporate_services.doctype.weekly_progress_report.weekly_progress_report.get_weekly_progress_dashboard_data",
      args: contractType ? { contract_type: contractType } : {},
      callback: (r: any) => {
        setPayload((r && r.message) || {});
        setIsLoading(false);
      },
      error: () => {
        setPayload({});
        setIsLoading(false);
      },
    });
  };

  useEffect(() => {
    load(appliedContractType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedContractType]);

  return (
    <div className="container-fluid p-0">
      <div className="card border mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label mb-1">Contract Type Filter</label>
              <input
                className="form-control"
                placeholder="Uses HR Config default if blank"
                value={contractTypeInput}
                onChange={(e) => setContractTypeInput(e.target.value)}
              />
            </div>
            <div className="col-md-2 d-flex" style={{ gap: 8 }}>
              <button
                className="btn btn-primary w-100"
                onClick={() => {
                  setAppliedContractType(contractTypeInput.trim() || null);
                }}
              >
                Apply
              </button>
            </div>
            <div className="col-md-3 d-flex">
              <button
                className="btn btn-default w-100"
                onClick={() => frappe?.set_route("List", "Weekly Progress Report")}
              >
                Open Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted">Loading dashboard...</div>
      ) : (
        <>
          <div className="alert alert-info mb-3">
            <strong>Week Window:</strong> {payload.week_start || ""} to {payload.week_end || ""}
            <br />
            <strong>Contract Type:</strong> {payload.contract_type || "All Active Intern Contracts"}
          </div>

          <div className="row g-3 mb-3">
            <Metric label="Active Interns" value={summary.total_active_interns || 0} />
            <Metric label="Submitted This Week" value={summary.submitted_count || 0} />
            <Metric label="Missing This Week" value={summary.missing_count || 0} />
          </div>

          <DashboardTable title="Missing Weekly Reports" rows={missingRows} isMissing />
          <DashboardTable title="Submitted Weekly Reports" rows={submittedRows} isMissing={false} />
        </>
      )}
    </div>
  );
}
