import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

import { GlobalStyles } from "./ui/GlobalStyles";
import { Header } from "./Header";
import { BidDevelopmentFrameworkSetup } from "./BidDevelopmentFrameworkSetup";
import { OpportunityGuide } from "./OpportunityGuide";
import { OpportunityTable } from "./OpportunityTable";
import { OpportunityDetail } from "./OpportunityDetail";
import { PageSidebar } from "./PageSidebar";
import { StatusChart } from "./StatusChart";
import { OpportunityFromChart } from "./OpportunityFromChart";
import { WorkflowStateChart } from "./WorkflowStateChart";

declare global {
  interface Window {
    frappe: any;
    initOpportunityModule?: (page?: any) => void;
    opportunityModuleSetRoute?: (id: string | null) => void;
  }
}

function OpportunityModuleApp({ page: _page }: { page: any }) {
  const [routeSegment, setRouteSegment] = useState<string | null>(() => {
    const route = (globalThis as any).frappe?.get_route?.() ?? [];
    return route[1] || null;
  });
  const [chartStatusFilter, setChartStatusFilter] = useState("");
  const [chartFromFilter, setChartFromFilter] = useState("");
  const [chartWorkflowFilter, setChartWorkflowFilter] = useState("");

  // Expose setter so on_page_show in icl_opportunity_module.js can update state
  useEffect(() => {
    (globalThis as any).opportunityModuleSetRoute = (id: string | null) => {
      setRouteSegment(id || null);
    };
    return () => {
      delete (globalThis as any).opportunityModuleSetRoute;
    };
  }, []);

  function openOpportunity(id: string) {
    (globalThis as any).frappe?.set_route("icl-opportunity-module", id);
    setRouteSegment(id);
  }

  function openGuide() {
    (globalThis as any).frappe?.set_route("icl-opportunity-module", "guide");
    setRouteSegment("guide");
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("icl-opportunity-module");
    setRouteSegment(null);
  }

  function handleNewLead() {
    window.frappe?.new_doc("Lead");
  }

  function handleNewOpportunity() {
    window.frappe?.new_doc("Opportunity");
  }

  const isGuideRoute = routeSegment === "guide";
  const selectedOpportunityId = routeSegment && !isGuideRoute ? routeSegment : null;

  // Portal target - Frappe's sidebar div prepared in icl_opportunity_module.js
  const sidebarRoot = document.getElementById("opportunity-sidebar-root");

  return (
    <>
      <GlobalStyles />

      {/* Render into Frappe's native sidebar via portal */}
      {sidebarRoot &&
        createPortal(
          <PageSidebar activeId={selectedOpportunityId} onOpen={openOpportunity} />,
          sidebarRoot
        )}

      <div className="om-app-wrap">
        {isGuideRoute ? (
          <OpportunityGuide onBack={handleBack} />
        ) : selectedOpportunityId ? (
          <OpportunityDetail
            opportunityId={selectedOpportunityId}
            onBack={handleBack}
            onOpen={openOpportunity}
          />
        ) : (
          <>
            <Header
              onNewLead={handleNewLead}
              onNewOpportunity={handleNewOpportunity}
              onOpenGuide={openGuide}
            />
            <BidDevelopmentFrameworkSetup onOpenGuide={openGuide} />
            <div className="om-charts-row">
              <StatusChart onStatusClick={(s: string) => setChartStatusFilter((prev: string) => prev === s ? "" : s)} />
              <OpportunityFromChart onFromClick={(f: string) => setChartFromFilter((prev: string) => prev === f ? "" : f)} />
              <WorkflowStateChart onStateClick={(s: string) => setChartWorkflowFilter((prev: string) => prev === s ? "" : s)} />
            </div>
            <OpportunityTable onOpen={openOpportunity} externalStatusFilter={chartStatusFilter} externalFromFilter={chartFromFilter} externalWorkflowFilter={chartWorkflowFilter} />
          </>
        )}
      </div>
    </>
  );
}

// ── Mount helpers ────────────────────────────────────────────────────────────

function mount(page: any) {
  const el = document.getElementById("opportunity-module-root");
  if (!el) return;
  createRoot(el).render(<OpportunityModuleApp page={page} />);
}

(globalThis as any).initOpportunityModule = function initOpportunityModule(page: any) {
  mount(page);
};
