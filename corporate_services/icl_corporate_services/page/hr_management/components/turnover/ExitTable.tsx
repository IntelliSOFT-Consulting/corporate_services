import React from "react";
import { useEmployeeExits } from "./hooks/useEmployeeExits";
import { ExitRow } from "./types";

const INTERVIEW_COLOR: Record<string, string> = {
  Pending: "gray",
  Scheduled: "blue",
  Completed: "green",
  Cancelled: "red",
};

function formatDate(d?: string | null) {
  if (!d) return "-";
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
  if (totalMonths < 12) return `${totalMonths}m`;
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
}

function InterviewBadge({
  status,
}: {
  status?: string | null;
}) {
  if (!status) return <span className="text-muted">-</span>;
  const color = INTERVIEW_COLOR[status] || "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 11 }}>
      <span>{status}</span>
    </span>
  );
}

interface Props {
  year: number;
  onOpen: (employee: string, employeeName?: string, exitInterviewId?: string | null) => void;
}

export function ExitTable({ year, onOpen }: Props) {
  const {
    exits,
    total,
    loading,
    error,
    page,
    totalPages,
    search,
    setPage,
    handleSearch,
    refresh,
  } = useEmployeeExits({ year });

  return (
    <div className="et-fade-in">
      {/* Toolbar */}
      <div className="et-toolbar">
        <div className="et-search-wrap">
          <span className="et-search-icon">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by name, department, designation…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        <span
          className="text-muted"
          style={{ fontSize: 12, marginLeft: "auto" }}
        >
          {loading
            ? "Loading…"
            : `${total} exit${total !== 1 ? "s" : ""} in ${year}`}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="et-table-wrap">
        <table className="table table-hover et-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Date Joined</th>
              <th>Relieving Date</th>
              <th>Tenure</th>
              <th>Exit Interview</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-muted"
                  style={{ padding: "32px 0" }}
                >
                  <div
                    className="spinner-border spinner-border-sm"
                    role="status"
                  />
                  <span className="ml-2">Loading…</span>
                </td>
              </tr>
            ) : exits.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="et-empty">
                    <div className="et-empty-icon">📋</div>
                    <div style={{ fontWeight: 500 }}>
                      No exits found for {year}
                    </div>
                    {search && (
                      <div
                        className="text-muted"
                        style={{ fontSize: 12, marginTop: 4 }}
                      >
                        Try adjusting your search
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              exits.map((row: ExitRow) => (
                <tr key={row.name} onClick={() => onOpen(row.name, row.employee_name, row.exit_interview)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {row.employee_name || row.name}
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {row.name}
                    </div>
                  </td>
                  <td>
                    {row.department || (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    {row.designation || (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(row.date_of_joining)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(row.relieving_date)}
                  </td>
                  <td>
                    {tenure(row.date_of_joining, row.relieving_date) || (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <InterviewBadge status={row.interview_status} />
                  </td>
                  <td>
                    {row.interview_decision || (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="et-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="et-pagination-btns">
            <button
              type="button"
              className="btn btn-default btn-xs"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className="btn btn-default btn-xs"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
