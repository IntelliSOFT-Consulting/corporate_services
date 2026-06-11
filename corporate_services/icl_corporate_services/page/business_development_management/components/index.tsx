import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { LeadsTab } from "./Leads/LeadsTab";
import { DashboardTab } from "./Dashboard/DashboardTab";
import { Opportunity } from "./Opportunity/Opportunity";
import { injectBusinessDevelopmentStyles } from "./ui/injectStyles";

type Tab = "dashboard" | "icl-leads" | "opportunity";

function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  const tabs: Array<{ key: Tab; label: string }> = [
    {
      key: "dashboard",
      label: "Dashboard",
    },
    {
      key: "icl-leads",
      label: "ICL Leads",
    },
    {
      key: "opportunity",
      label: "Opportunity",
    },
  ];
  const root = document.getElementById("bdm-sidebar-root");
  if (!root) return null;
  return createPortal(
    <div>
      <div className="sm-sidebar-header">
        <p className="sm-sidebar-title">Business Development</p>
      </div>
      <div className="sm-sidebar-list">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            className={`sm-sidebar-item${activeTab === tab.key ? " active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="sm-sidebar-item-name">{tab.label}</span>
          </div>
        ))}
      </div>
    </div>,
    root,
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  useEffect(() => {
    injectBusinessDevelopmentStyles();
  }, []);

  return (
    <div>
      <div id="__sidebar-render-trigger" style={{ display: "none" }} />
      <div className="p-2">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "icl-leads" && <LeadsTab />}
        {activeTab === "opportunity" && <Opportunity />}
      </div>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

(globalThis as any).initBusinessDevelopmentManagement = function () {
  const el = document.getElementById("business-development-management-root");
  if (!el) return;
  createRoot(el).render(<App />);
};
