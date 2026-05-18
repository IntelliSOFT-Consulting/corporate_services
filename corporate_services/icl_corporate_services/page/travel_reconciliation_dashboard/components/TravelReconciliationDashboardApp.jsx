import React, { useEffect, useState } from "react";
import { SummaryCards } from "./SummaryCards";
import { ChartsPanel } from "./ChartsPanel";
import { UnreconciledTable } from "./UnreconciledTable";

const METHOD =
  "corporate_services.icl_corporate_services.page.travel_reconciliation_dashboard.travel_reconciliation_dashboard.get_dashboard_data";
const BACKFILL_METHOD =
  "corporate_services.icl_corporate_services.page.travel_reconciliation_dashboard.travel_reconciliation_dashboard.run_one_time_reconciliation_backfill";

export default function TravelReconciliationDashboardApp({ page }) {
  const [data, setData] = useState({});

  function load() {
    frappe.call({
      method: METHOD,
      callback: (r) => setData(r.message || {}),
    });
  }

  useEffect(() => {
    page.set_primary_action("Refresh", load);
    page.set_secondary_action("One-Time Backfill", () => runBackfill());
    load();
  }, []);

  function runBackfill() {
    frappe.confirm(
      "Run one-time reconciliation backfill for existing Travel Requests?",
      () => {
        frappe.call({
          method: BACKFILL_METHOD,
          freeze: true,
          freeze_message: "Backfilling reconciliation status...",
          callback: (r) => {
            const result = r.message || {};
            frappe.msgprint({
              title: "Backfill Complete",
              indicator: "green",
              message: `Processed ${result.processed || 0} Travel Requests.<br>Reconciled: ${result.reconciled || 0}<br>Pending: ${result.pending || 0}`,
            });
            load();
          },
        });
      },
    );
  }

  return (
    <div className="container-fluid p-3">
      <SummaryCards summary={data.summary || {}} />
      <ChartsPanel
        statusBreakdown={data.status_breakdown || []}
        monthlyTrend={data.monthly_trend || []}
      />
      <UnreconciledTable
        rows={data.unreconciled_rows || []}
        onOpenRequest={(name) => frappe.set_route("Form", "Travel Request", name)}
      />
    </div>
  );
}
