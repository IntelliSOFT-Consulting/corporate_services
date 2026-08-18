import React, { useEffect, useState } from "react";
import { Project } from "../project_components/Index";
import { ProjectDetail } from "../project_components/ProjectDetail";

export function ProjectsTab({
  initialProjectId,
  onGoToDashboard,
}: {
  initialProjectId: string | null;
  onGoToDashboard: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId);

  useEffect(() => {
    setSelectedId(initialProjectId);
  }, [initialProjectId]);

  function openProject(id: string) {
    (globalThis as any).frappe?.set_route("icl-project-management", id);
    setSelectedId(id);
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("icl-project-management");
    setSelectedId(null);
  }

  return (
    <div className="pm-app-wrap">
      {selectedId ? (
        <ProjectDetail projectId={selectedId} onBack={handleBack} onGoToDashboard={onGoToDashboard} />
      ) : (
        <>
          <Project onOpen={openProject} />
        </>
      )}
    </div>
  );
}
