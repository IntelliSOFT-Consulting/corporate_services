import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { GlobalStyles } from "../project_components/ui/GlobalStyles";
import { LOCAL_STYLES } from "./styles";
import { Tab } from "./types";
import { SidebarTabs } from "./SidebarTabs";
import { DashboardTab } from "./DashboardTab";
import { ProjectsTab } from "./ProjectsTab";
import { LifecycleTab } from "./LifecycleTab";
import { TemplatesTab } from "./TemplatesTab";
import { LessonsLearnedTab } from "./LessonsLearnedTab";

function isTab(value: string | null): value is Tab {
  return (
    value === "dashboard" ||
    value === "projects" ||
    value === "lifecycle" ||
    value === "templates" ||
    value === "lessons_learned"
  );
}

function getTabFromUrl(): Tab | null {
  try {
    const params = new URLSearchParams(globalThis.location.search || "");
    const tab = params.get("tab");
    return isTab(tab) ? tab : null;
  } catch {
    return null;
  }
}

function writeTabToUrl(tab: Tab) {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("tab", tab);
    globalThis.history.replaceState(
      globalThis.history.state,
      "",
      url.toString(),
    );
  } catch {
    // no-op
  }
}

export function ProjectManagementApp({ page }: { page: any }) {
  const initialRouteProject =
    (((globalThis as any).frappe?.get_route?.() ?? [])[1] as string) || null;

  const [tab, setTab] = useState<Tab>(() => {
    if (initialRouteProject) return "projects";
    const fromUrl = getTabFromUrl();
    return fromUrl || "dashboard";
  });

  const [openProjectId, setOpenProjectId] = useState<string | null>(
    initialRouteProject,
  );

  function openProject(id: string) {
    globalThis.frappe?.set_route("icl-project-management", id);
    setOpenProjectId(id);
    setTab("projects");
  }

  // Non-project tabs don't carry a project id in the route, so leaving a
  // project's detail view for one of them must clear the route segment too -
  // otherwise the URL (.../PROJ-0018?tab=dashboard) and the tab shown
  // disagree, and a refresh re-opens the project instead of the tab.
  function goToTab(next: Tab) {
    if (next !== "projects") {
      globalThis.frappe?.set_route("icl-project-management");
    }
    setTab(next);
  }

  useEffect(() => {
    page.set_primary_action("Create New Project", () => {
      globalThis.frappe?.new_doc("Project");
    });
    page.add_menu_item("HIS Project Lifecycle Guide", () => {
      goToTab("lifecycle");
    });
    page.add_menu_item("Project Requirements Templates", () => {
      goToTab("templates");
    });
    page.add_menu_item("View All Projects", () => {
      goToTab("projects");
    });
    page.add_menu_item("Project Management Settings", () => {
      globalThis.frappe?.set_route(
        "Form",
        "Project Management Settings",
        "Project Management Settings",
      );
    });
  }, [page]);

  useEffect(() => {
    writeTabToUrl(tab);
  }, [tab]);

  const sidebarRoot = document.getElementById(
    "project-management-sidebar-root",
  );

  return (
    <>
      <GlobalStyles />
      <style>{LOCAL_STYLES}</style>
      {sidebarRoot &&
        createPortal(<SidebarTabs tab={tab} onChange={goToTab} />, sidebarRoot)}
      <div className="ipm-content">
        {tab === "dashboard" && (
          <DashboardTab
            onOpenLifecycle={() => goToTab("lifecycle")}
            onOpenProject={openProject}
          />
        )}
        {tab === "projects" && (
          <ProjectsTab
            initialProjectId={openProjectId}
            onGoToDashboard={() => goToTab("dashboard")}
          />
        )}
        {tab === "lifecycle" && <LifecycleTab />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "lessons_learned" && <LessonsLearnedTab />}
      </div>
    </>
  );
}
