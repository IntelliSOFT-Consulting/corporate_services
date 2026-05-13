import React from "react";

function Metric({ label, value }) {
  return (
    <div className="col-md-3">
      <div className="card border h-100">
        <div className="card-body">
          <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

export function SummaryCards({ summary }) {
  const totalBalanceText = format_currency(summary.total_balance || 0);

  return (
    <div className="row g-3 mb-3">
      <Metric label="Total Requests" value={summary.total_requests || 0} />
      <Metric label="Reconciled" value={summary.reconciled || 0} />
      <Metric label="Pending" value={summary.pending || 0} />
      <Metric label="Total Balance" value={totalBalanceText} />
    </div>
  );
}
