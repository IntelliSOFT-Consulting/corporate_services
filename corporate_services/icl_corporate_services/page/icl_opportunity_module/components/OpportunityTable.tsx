import React from "react";
import { OpportunityRow } from "./types";
import { useOpportunities } from "./hooks/useOpportunities";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Replied: "orange",
  Quotation: "yellow",
  "Lost Quotation": "red",
  Interested: "green",
  Converted: "green",
  "Do Not Contact": "red",
};

const STATUSES = [
  "Open",
  "Replied",
  "Quotation",
  "Lost Quotation",
  "Interested",
  "Converted",
  "Do Not Contact",
];

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

function formatCurrency(amount?: number, currency?: string) {
  if (amount == null) return "-";
  return `${currency ?? ""} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`.trim();
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface OpportunityTableProps {
  onOpen: (id: string) => void;
  externalStatusFilter?: string;
  externalFromFilter?: string;
  externalWorkflowFilter?: string;
}

export function OpportunityTable({ onOpen, externalStatusFilter, externalFromFilter, externalWorkflowFilter }: OpportunityTableProps) {
  const {
    opportunities,
    total,
    loading,
    error,
    page,
    totalPages,
    search,
    statusFilter,
    setPage,
    handleSearch,
    handleStatusFilter,
    refresh,
  } = useOpportunities({ status: externalStatusFilter, opportunityFrom: externalFromFilter, workflowState: externalWorkflowFilter });

  return (
    <div className="om-fade-in">
      {/* ── Toolbar ── */}
      <div className="om-toolbar">
        <div className="om-search-wrap">
          <span className="om-search-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search opportunities…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control form-control-sm"
          style={{ width: "auto", minWidth: 140 }}
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
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

        <span className="text-muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          {loading ? "Loading…" : `${total} record${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* -- Error -- */}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="om-table-wrap">
        <table className="table table-hover om-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title / Party</th>
              <th>Status</th>
              <th>Sales Stage</th>
              <th>Amount</th>
              <th>Expected Closing</th>
              <th>Owner</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: "32px 0" }}>
                  <div className="spinner-border spinner-border-sm text-muted" role="status" />
                  <span className="ml-2">Loading…</span>
                </td>
              </tr>
            ) : opportunities.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="om-empty">
                    <div className="om-empty-icon">📋</div>
                    <div style={{ fontWeight: 500 }}>No opportunities found</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {search || statusFilter
                        ? "Try adjusting your search or filter"
                        : "Create a new opportunity to get started"}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              opportunities.map((opp: OpportunityRow) => (
                <tr key={opp.name} onClick={() => onOpen(opp.name)}>
                  <td>
                    <a
                      className="om-opp-link"
                      onClick={(e) => { e.stopPropagation(); onOpen(opp.name); }}
                      href="#"
                    >
                      {opp.name}
                    </a>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, lineHeight: 1.3 }}>
                      {opp.title || opp.customer_name || "-"}
                    </div>
                    {opp.title && opp.customer_name && (
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        {opp.customer_name}
                      </div>
                    )}
                  </td>
                  <td><StatusBadge status={opp.status} /></td>
                  <td>{opp.sales_stage || <span className="text-muted">-</span>}</td>
                  <td>{formatCurrency(opp.opportunity_amount, opp.currency)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(opp.expected_closing)}</td>
                  <td>{opp.opportunity_owner || <span className="text-muted">-</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(opp.transaction_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="om-pagination">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="om-pagination-btns">
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
