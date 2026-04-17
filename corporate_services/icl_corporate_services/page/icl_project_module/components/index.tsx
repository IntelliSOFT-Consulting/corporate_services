import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";

import { GlobalStyles } from "./ui/GlobalStyles";
import { Header } from "./Header";
import { ProjectTable } from "./ProjectTable";
import { ProjectDetail } from "./ProjectDetail";
import { PageSidebar } from "./PageSidebar";

declare global {
  interface Window {
    frappe: any;
    initProjectModule?: (page?: any) => void;
    projectModuleSetRoute?: (id: string | null) => void;
  }
}

function ProjectModuleApp({ page: _page }: { page: any }) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const route = (globalThis as any).frappe?.get_route?.() ?? [];
    return route[1] || null;
  });

  // Expose setter so on_page_show in icl_project_module.js can update state
  useEffect(() => {
    (globalThis as any).projectModuleSetRoute = (id: string | null) => {
      setSelectedId(id || null);
    };
    return () => {
      delete (globalThis as any).projectModuleSetRoute;
    };
  }, []);

  function openProject(id: string) {
    (globalThis as any).frappe?.set_route("icl-project-module", id);
    setSelectedId(id);
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("icl-project-module");
    setSelectedId(null);
  }

  function handleNewProject() {
    window.frappe?.new_doc("Project");
  }

  // Portal target - Frappe's sidebar div prepared in icl_project_module.js
  const sidebarRoot = document.getElementById("project-sidebar-root");

  return (
    <>
      <GlobalStyles />

      {/* Render into Frappe's native sidebar via portal */}
      {sidebarRoot &&
        createPortal(
          <PageSidebar activeId={selectedId} onOpen={openProject} />,
          sidebarRoot
        )}

      <div className="pm-app-wrap">
        {selectedId ? (
          <ProjectDetail
            projectId={selectedId}
            onBack={handleBack}
          />
        ) : (
          <>
            <Header onNewProject={handleNewProject} />
            <ProjectTable onOpen={openProject} />
          </>
        )}
      </div>
    </>
  );
}

// ── Mount helpers ────────────────────────────────────────────────────────────

function mount(page: any) {
  const el = document.getElementById("project-module-root");
  if (!el) return;
  createRoot(el).render(<ProjectModuleApp page={page} />);
}

(globalThis as any).initProjectModule = function initProjectModule(page: any) {
  mount(page);
};
