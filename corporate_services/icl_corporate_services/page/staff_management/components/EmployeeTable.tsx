import React from "react";
import { useEmployees } from "./hooks/useEmployees";
import { EmployeeRow } from "./types";

function formatDate(d?: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function tenure(joining?: string | null) {
  if (!joining) return null;
  const d1 = new Date(joining);
  const d2 = new Date();
  const months =
    (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  if (months < 1) return "< 1m";
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
}

const TYPE_COLORS: Record<string, string> = {
  "Full-time Employee": "green",
  "Part-time Employee": "blue",
  Consultant: "orange",
  Intern: "gray",
  Contract: "yellow",
};

interface Props {
  deptFilter: string;
  onOpen: (employee: string) => void;
}

export function EmployeeTable({ deptFilter, onOpen }: Props) {
  const {
    employees,
    total,
    loading,
    error,
    page,
    totalPages,
    search,
    employmentType,
    setPage,
    setSearch,
    setEmploymentType,
    refresh,
  } = useEmployees(deptFilter);

  return (
    <div className="frappe-card p-0 sm-fade-in">
      {/* Toolbar */}
      <div
        className="d-flex align-items-center flex-wrap p-3"
        style={{ gap: 8, borderBottom: "1px solid var(--border-color, #e9ecef)" }}
      >
        <div className="sm-search-wrap" style={{ flex: 1, minWidth: 180, maxWidth: 300 }}>
          <span className="sm-search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search by name, department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control form-control-sm"
          style={{ width: "auto", minWidth: 140 }}
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Full-time Employee">Full-time</option>
          <option value="Part-time Employee">Part-time</option>
          <option value="Consultant">Consultant</option>
          <option value="Intern">Intern</option>
          <option value="Contract">Contract</option>
        </select>

        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={refresh}
          disabled={loading}
          title="Refresh"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        <span className="text-muted ml-auto" style={{ fontSize: 12 }}>
          {loading ? "Loading…" : `${total} employee${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {error && (
        <div className="alert alert-danger m-3" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="table-responsive">
        <table className="table table-hover sm-table mb-0" style={{ fontSize: 13 }}>
          <thead className="thead-light">
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Type</th>
              <th>Joined</th>
              <th>Tenure</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-5">
                  <div className="spinner-border spinner-border-sm mr-2" role="status" />
                  Loading…
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-5">
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>👥</div>
                  <div>No employees found</div>
                  {(search || deptFilter || employmentType) && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Try adjusting your search or filters
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              employees.map((emp: EmployeeRow) => (
                <tr key={emp.name} onClick={() => onOpen(emp.name)}>
                  <td>
                    <div className="font-weight-semibold">{emp.employee_name}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{emp.name}</div>
                  </td>
                  <td>{emp.department || <span className="text-muted">-</span>}</td>
                  <td>{emp.designation || <span className="text-muted">-</span>}</td>
                  <td>
                    {emp.employment_type ? (
                      <span
                        className={`indicator-pill ${TYPE_COLORS[emp.employment_type] || "gray"}`}
                        style={{ fontSize: 11 }}
                      >
                        <span>{emp.employment_type}</span>
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(emp.date_of_joining)}</td>
                  <td>{tenure(emp.date_of_joining) || <span className="text-muted">-</span>}</td>
                  <td>
                    {emp.company_email ? (
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {emp.company_email}
                      </span>
                    ) : emp.cell_number ? (
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {emp.cell_number}
                      </span>
                    ) : (
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
        <div
          className="d-flex align-items-center justify-content-between p-3"
          style={{ borderTop: "1px solid var(--border-color, #e9ecef)", fontSize: 13 }}
        >
          <span className="text-muted">Page {page} of {totalPages}</span>
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className="btn btn-default"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              className="btn btn-default"
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
