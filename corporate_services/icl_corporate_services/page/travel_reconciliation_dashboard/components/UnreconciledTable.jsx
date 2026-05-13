import React, { useEffect, useMemo, useState } from "react";

const NOTIFY_METHOD =
  "corporate_services.icl_corporate_services.page.travel_reconciliation_dashboard.travel_reconciliation_dashboard.notify_unreconciled_user";

export function UnreconciledTable({ rows, onOpenRequest }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [notifyingRow, setNotifyingRow] = useState(null);
  const [typeSearch, setTypeSearch] = useState("");

  useEffect(() => {
    setPage(1);
  }, [rows, typeSearch]);

  const filteredRows = useMemo(() => {
    const q = (typeSearch || "").trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((row) =>
      String(row.travel_type || "")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, typeSearch]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  function notifyUser(travelRequestName) {
    if (!travelRequestName || notifyingRow) return;

    setNotifyingRow(travelRequestName);
    frappe.call({
      method: NOTIFY_METHOD,
      args: { travel_request_name: travelRequestName },
      callback: (r) => {
        const result = r.message || {};
        frappe.show_alert(
          {
            message: `Reminder sent for ${result.travel_request || travelRequestName}`,
            indicator: "green",
          },
          5,
        );
      },
      error: (err) => {
        frappe.msgprint({
          title: "Failed to Send Reminder",
          indicator: "red",
          message: err?.message || "Unable to send reminder.",
        });
      },
      always: () => {
        setNotifyingRow(null);
      },
    });
  }

  return (
    <div className="card border">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-end mb-2 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <h6 className="mb-0">Unreconciled Travel Requests</h6>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 240 }}
              placeholder="Search type..."
              value={typeSearch}
              onChange={(e) => setTypeSearch(e.target.value)}
            />
          </div>
          <div className="text-muted small">
            Showing {totalRows ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, totalRows)} of {totalRows}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-sm table-bordered align-middle">
            <thead>
              <tr>
                <th>Travel Request</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Project</th>
                <th>Travel Date</th>
                <th>Requested</th>
                <th>Currency</th>
                <th>Workflow Status</th>
                <th>Reconciliation Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!paginatedRows.length ? (
                <tr>
                  <td colSpan={10} className="text-center text-muted">
                    No pending records.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          onOpenRequest?.(row.name);
                        }}
                      >
                        {row.name}
                      </a>
                    </td>
                    <td>{row.employee_name || row.employee || ""}</td>
                    <td>{row.travel_type || ""}</td>
                    <td>{row.custom_project || ""}</td>
                    <td>{row.custom_travel_date || ""}</td>
                    <td>{String(row.custom_expected_support || 0)}</td>
                    <td>{row.custom_currency || ""}</td>
                    <td>{row.workflow_status || ""}</td>
                    <td>{row.reconciliation_status || ""}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-xs btn-primary"
                        disabled={Boolean(notifyingRow)}
                        onClick={() => notifyUser(row.name)}
                      >
                        {notifyingRow === row.name ? "Sending..." : "Notify"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalRows > 0 && (
          <div className="d-flex justify-content-end align-items-center gap-2 mt-2">
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
        )}
      </div>
    </div>
  );
}
