import React from "react";
import { createRoot } from "react-dom/client";
import TravelReconciliationDashboardApp from "./TravelReconciliationDashboardApp";

window.initTravelReconciliationDashboard = function (page) {
  const container = document.createElement("div");
  container.id = "travel-reconciliation-dashboard-root";
  page.main[0].appendChild(container);

  const root = createRoot(container);
  root.render(<TravelReconciliationDashboardApp page={page} />);
};
