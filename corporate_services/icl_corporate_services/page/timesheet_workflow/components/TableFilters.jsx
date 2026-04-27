import React from "react";

function TableFilters({
  showNonSubmittersSection,
  activeNonSubmittersCount,
  searchQuery,
  setSearchQuery,
  monthFilter,
  setMonthFilter,
  monthOptions,
  showStatus,
  statusFilter,
  setStatusFilter,
  onNotify,
}) {
  return (
    <div className="card ts-table-filters">
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: 12 }}>
          <div className="d-flex flex-wrap align-items-center gap-2">
            {showNonSubmittersSection && (
              <button
                className="btn btn-sm btn-warning"
                onClick={onNotify}
                title="Send reminder to employees who haven't submitted"
              >
                Notify Non-Submitters
                {activeNonSubmittersCount > 0 && (
                  <span className="badge bg-danger ms-2" style={{ fontSize: 10 }}>
                    {activeNonSubmittersCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="d-flex flex-wrap align-items-end gap-2">
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6c757d", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Name / ID
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ minWidth: 220, fontSize: 13 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee name or ID"
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6c757d", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Month
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

            {showStatus && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6c757d", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Status
                </label>
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: 150, fontSize: 13 }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TableFilters;
