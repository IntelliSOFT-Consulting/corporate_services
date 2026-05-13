import React, { useEffect, useMemo, useRef } from "react";

export function ChartsPanel({ statusBreakdown, monthlyTrend }) {
  const statusRef = useRef(null);
  const monthlyRef = useRef(null);

  const statusRows = useMemo(() => statusBreakdown || [], [statusBreakdown]);
  const monthlyRows = useMemo(() => monthlyTrend || [], [monthlyTrend]);

  useEffect(() => {
    if (!statusRef.current || !statusRows.length) return;

    const labels = statusRows.map((r) => r.status);
    const values = statusRows.map((r) => r.count);

    const chart = new frappe.Chart(statusRef.current, {
      data: { labels, datasets: [{ values }] },
      type: "donut",
      height: 260,
    });

    return () => chart?.destroy?.();
  }, [statusRows]);

  useEffect(() => {
    if (!monthlyRef.current || !monthlyRows.length) return;

    const labels = monthlyRows.map((r) => r.month);
    const reconciled = monthlyRows.map((r) => r.reconciled);
    const pending = monthlyRows.map((r) => r.pending);

    const chart = new frappe.Chart(monthlyRef.current, {
      data: {
        labels,
        datasets: [
          { name: "Reconciled", values: reconciled },
          { name: "Pending", values: pending },
        ],
      },
      type: "bar",
      height: 260,
    });

    return () => chart?.destroy?.();
  }, [monthlyRows]);

  return (
    <div className="row g-3 mb-3">
      <div className="col-lg-6">
        <div className="card border">
          <div className="card-body">
            <h6>Status Breakdown</h6>
            {statusRows.length ? (
              <div ref={statusRef} />
            ) : (
              <div className="text-muted">No status data.</div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card border">
          <div className="card-body">
            <h6>Monthly Trend (Last 12)</h6>
            {monthlyRows.length ? (
              <div ref={monthlyRef} />
            ) : (
              <div className="text-muted">No trend data.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
