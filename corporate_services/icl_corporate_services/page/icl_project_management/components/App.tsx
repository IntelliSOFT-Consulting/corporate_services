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

const TAB_KEY = "icl_project_management_tab";

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
    if (fromUrl) return fromUrl;
    const saved = globalThis?.localStorage?.getItem(TAB_KEY) || null;
    return isTab(saved) ? saved : "dashboard";
  });

  useEffect(() => {
    page.set_primary_action("Create New Project", () => {
      globalThis.frappe?.new_doc("Project");
    });
    page.add_menu_item("HIS Project Lifecycle Guide", () => {
      setTab("lifecycle");
    });
    page.add_menu_item("Project Requirements Templates", () => {
      setTab("templates");
    });
    page.add_menu_item("View All Projects", () => {
      setTab("projects");
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
    globalThis?.localStorage?.setItem(TAB_KEY, tab);
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
        createPortal(<SidebarTabs tab={tab} onChange={setTab} />, sidebarRoot)}
      <div className="ipm-content">
        {tab === "dashboard" && (
          <DashboardTab
            onOpenLifecycle={() => setTab("lifecycle")}
            onOpenProject={(id: string) => {
              globalThis.frappe?.set_route("icl-project-management", id);
              setTab("projects");
            }}
          />
        )}
        {tab === "projects" && (
          <ProjectsTab initialProjectId={initialRouteProject} />
        )}
        {tab === "lifecycle" && <LifecycleTab />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "lessons_learned" && <LessonsLearnedTab />}
      </div>
    </>
  );
}
