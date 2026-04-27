import React from "react";
import PaginationControls from "./PaginationControls";

function NonSubmittersTable({
  pageSize,
  formatMonth,
  nonSubmitters,
  monthFilter,
  onNotify,
  onNotifyEmployee,
  currentPage = 1,
  onPageChange,
}) {
  const totalPages = Math.ceil(nonSubmitters.length / pageSize);
  const paginatedNonSubmitters = nonSubmitters.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!nonSubmitters.length) {
    return (
      <div className="alert alert-success mt-4" style={{ fontSize: 13 }}>
        ✓ All employees have submitted their timesheet for <strong>{formatMonth ? formatMonth(monthFilter) : monthFilter}</strong>.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h6 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626", margin: 0 }}>
          Not Submitted - {formatMonth ? formatMonth(monthFilter) : monthFilter}
          <span className="badge bg-danger ms-2" style={{ fontSize: 10, fontWeight: 700 }}>{nonSubmitters.length}</span>
        </h6>
        <button className="btn btn-sm btn-warning" onClick={onNotify}>
          Notify All ({nonSubmitters.length})
        </button>
      </div>

      <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: 12 }}>
        The following employee(s) have <strong>not yet submitted</strong> their timesheet for{" "}
        <strong>{formatMonth ? formatMonth(monthFilter) : monthFilter}</strong>.
      </div>

      <div className="table-responsive">
        <table className="table table-bordered ts-sub-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th style={{ width: 110 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedNonSubmitters.map((emp, i) => (
              <tr key={emp.name}>
                <td className="text-muted" style={{ fontSize: 12 }}>{(currentPage - 1) * pageSize + i + 1}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{emp.employee_name}</div>
                  <div style={{ fontSize: 11, color: "#adb5bd" }}>{emp.name}</div>
                </td>
                <td style={{ fontSize: 13 }}>{emp.department || "-"}</td>
                <td style={{ fontSize: 13 }}>{emp.designation || "-"}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-warning"
                    onClick={() => onNotifyEmployee && onNotifyEmployee(emp)}
                  >
                    Notify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={nonSubmitters.length}
        onPageChange={onPageChange || (() => {})}
        pageSize={pageSize}
      />
    </div>
  );
}

export default NonSubmittersTable;
