import React from "react";
import { ProjectRow } from "../types";
import { useProjects } from "../hooks/useProjects";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Completed: "green",
  Cancelled: "red",
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

function ProgressBar({ value }: { value?: number }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}
    >
      <div className="pm-progress-bar-track" style={{ flex: 1 }}>
        <div className="pm-progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span
        style={{
          fontSize: 11,
          color: "var(--text-muted, #6c757d)",
          flexShrink: 0,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ProjectsTableProps {
  onOpen: (id: string) => void;
  title?: string;
  projects?: ProjectRow[];
  loading?: boolean;
  search?: string;
  statusFilter?: string;
  page?: number;
  totalPages?: number;
  onSearchChange?: (value: string) => void;
  onPageChange?: (page: number) => void;
}

export function ProjectsTable({
  onOpen,
  title = "Projects Table",
  projects: controlledProjects,
  loading: controlledLoading,
  search: controlledSearch,
  statusFilter: controlledStatusFilter,
  page: controlledPage,
  totalPages: controlledTotalPages,
  onSearchChange: controlledSearchChange,
  onPageChange: controlledPageChange,
}: ProjectsTableProps) {
  const {
    projects: hookProjects,
    loading: hookLoading,
    error: hookError,
    page: hookPage,
    totalPages: hookTotalPages,
    search: hookSearch,
    statusFilter: hookStatusFilter,
    setPage: hookSetPage,
    handleSearch: hookHandleSearch,
  } = useProjects();

  const isControlled =
    Array.isArray(controlledProjects) &&
    typeof controlledLoading === "boolean" &&
    typeof controlledSearch === "string" &&
    typeof controlledPage === "number" &&
    typeof controlledTotalPages === "number" &&
    typeof controlledSearchChange === "function" &&
    typeof controlledPageChange === "function";

  const projects = isControlled ? controlledProjects : hookProjects;
  const loading = isControlled ? controlledLoading : hookLoading;
  const search = isControlled ? controlledSearch : hookSearch;
  const statusFilter = isControlled ? (controlledStatusFilter ?? "") : hookStatusFilter;
  const page = isControlled ? controlledPage : hookPage;
  const totalPages = isControlled ? controlledTotalPages : hookTotalPages;
  const onSearchChange = isControlled ? controlledSearchChange : hookHandleSearch;
  const onPageChange = isControlled ? controlledPageChange : hookSetPage;

  return (
    <>
      <div className="pm-table-wrap mb-4">
        <div className="pm-toolbar p-3" style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <div className="pm-search-wrap" style={{ marginLeft: "auto" }}>
            <span className="pm-search-icon">
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
              placeholder="Search projects in table..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        {!isControlled && hookError && (
          <div className="alert alert-danger mx-3" style={{ fontSize: 13 }}>
            {hookError}
          </div>
        )}

        <table className="table table-hover pm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project Name</th>
              <th>Status</th>
              <th>% Complete</th>
              <th>Customer</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  className="text-center text-muted"
                  style={{ padding: "32px 0" }}
                >
                  <div
                    className="spinner-border spinner-border-sm text-muted"
                    role="status"
                  />
                  <span className="ml-2">Loading…</span>
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={12}>
                  <div className="pm-empty">
                    <div className="pm-empty-icon">📋</div>
                    <div style={{ fontWeight: 500 }}>No projects found</div>
                    <div
                      className="text-muted"
                      style={{ fontSize: 12, marginTop: 4 }}
                    >
                      {search || statusFilter
                        ? "Try adjusting your search or filter"
                        : "Create a new project to get started"}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              projects.map((proj: ProjectRow) => (
                <tr key={proj.name} onClick={() => onOpen(proj.name)}>
                  <td>
                    <a
                      className="pm-proj-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(proj.name);
                      }}
                      href="#"
                    >
                      {proj.name}
                    </a>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, lineHeight: 1.3 }}>
                      {proj.project_name || proj.name}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={proj.status} />
                  </td>
                  <td>
                    <ProgressBar value={proj.percent_complete} />
                  </td>
                  <td>
                    {proj.customer || <span className="text-muted">-</span>}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(proj.expected_start_date)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(proj.expected_end_date)}
                  </td>
                  <td>{proj.timesheet_count ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="pm-pagination p-3">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="pm-pagination-btns">
              <button
                type="button"
                className="btn btn-default btn-xs"
                disabled={page <= 1 || loading}
                onClick={() => onPageChange(page - 1)}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="btn btn-default btn-xs"
                disabled={page >= totalPages || loading}
                onClick={() => onPageChange(page + 1)}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
