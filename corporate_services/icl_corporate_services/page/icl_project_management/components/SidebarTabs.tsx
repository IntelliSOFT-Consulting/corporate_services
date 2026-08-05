import React from "react";
import { Tab } from "./types";

export function SidebarTabs({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div>
      <div className="ipm-sidebar-header">
        <p className="ipm-sidebar-title">Project Management</p>
      </div>
      <div className="ipm-sidebar-list">
        <div
          className={`ipm-sidebar-item${tab === "dashboard" ? " active" : ""}`}
          onClick={() => onChange("dashboard")}
        >
          Dashboard
        </div>
        <div
          className={`ipm-sidebar-item${tab === "projects" ? " active" : ""}`}
          onClick={() => onChange("projects")}
        >
          Projects
        </div>
        <div
          className={`ipm-sidebar-item${tab === "lifecycle" ? " active" : ""}`}
          onClick={() => onChange("lifecycle")}
        >
          HIS Lifecycle Guide
        </div>
        <div
          className={`ipm-sidebar-item${tab === "templates" ? " active" : ""}`}
          onClick={() => onChange("templates")}
        >
          Project Requirements Templates
        </div>
        <div
          className={`ipm-sidebar-item${tab === "lessons_learned" ? " active" : ""}`}
          onClick={() => onChange("lessons_learned")}
        >
          Lessons Learned
        </div>
      </div>
    </div>
  );
}
