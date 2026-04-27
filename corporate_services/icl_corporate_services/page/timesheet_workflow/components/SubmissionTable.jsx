import React from "react";
import PaginationControls from "./PaginationControls";

function SubmissionTable({
  pageSize,
  formatMonth,
  submissions,
  paginatedSubmissions,
  currentPage,
  totalPages,
  showWorkflowState,
  role,
  employee,
  onEmployeeClick,
  onSubmissionClick,
  onPageChange,
}) {
  return (
    <>
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
            {paginatedSubmissions.map((ts, index) => {
                  const empName = ts.employee_name || ts.employee;
                  const globalIndex = (currentPage - 1) * pageSize + index + 1;
              return (
                <tr key={ts.name}>
                  <td className="text-muted" style={{ fontSize: 12 }}>{globalIndex}</td>
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
                  <td>{formatMonth ? formatMonth(ts.month_year) : ts.month_year}</td>
                  <td>{ts.total_working_hours ?? "-"}</td>
                  <td>
                    <span className={`badge ${ts.status === "Approved" ? "bg-success" : ts.status === "Rejected" ? "bg-danger" : ts.status === "Cancelled" ? "bg-secondary" : "bg-warning text-dark"}`}>
                      {ts.status}
                    </span>
                  </td>
                  {showWorkflowState && (
                    <td>
                      <span>
                        {ts.workflow_state || "-"}
                      </span>
                    </td>
                  )}
                  <td style={{ fontSize: 12 }}>{ts.creation ? new Date(ts.creation).toLocaleDateString() : "-"}</td>
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

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={submissions.length}
        onPageChange={onPageChange}
        pageSize={pageSize}
      />
    </>
  );
}

export default SubmissionTable;
