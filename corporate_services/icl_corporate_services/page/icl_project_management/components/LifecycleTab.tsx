import React, { useEffect, useState } from "react";
import { LifecycleData, LifecycleFolder } from "./types";

function FolderNode({ folder }: { folder: LifecycleFolder }) {
  const children = folder.children || [];
  return (
    <li>
      {folder.folder_name || folder.folder_id}
      {children.length > 0 && (
        <ul>
          {children.map((child, idx) => (
            <FolderNode
              key={`${child.folder_id || child.folder_name}-${idx}`}
              folder={child}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function LifecycleTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LifecycleData>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_lifecycle_config",
      })
      .then((r: any) => {
        setData((r && r.message) || {});
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Could not load lifecycle configuration.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container-fluid p-3 text-muted">
        Loading lifecycle guide...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-3">
        <div className="alert alert-danger mb-0">{error}</div>
      </div>
    );
  }

  const introTitle = data.intro_title || "Project Start-to-End Guide";
  const introDescription = data.intro_description || "";
  const phases = data.phases || [];
  const toolkitUseSteps = [
    "Start with the stage cards to understand what the PM must prepare, plan, design, implement, and close out.",
    "Create or open the Project record, then use the manual folder actions to generate the File Manager folder tree or Google Drive folder when you need them.",
    "Go to the Project Requirements Templates area to review each toolkit item, confirm its target document, and upload or replace the template file if needed.",
    "Use the toolkit items as the checklist for deliverables, evidence, and templates for each stage; update them as the project progresses instead of creating separate one-off documents.",
    "Keep the folder structure aligned to the stages and toolkit items so the PM team can quickly find what is pending, in progress, or completed.",
  ];

  return (
    <div className="container-fluid p-3">
      <div
        className="card border mb-3"
        style={{ background: "#f7fbff", borderColor: "#d9ebfb" }}
      >
        <div className="card-body">
          <h6 className="mb-1">{introTitle}</h6>
          <p className="text-muted mb-0">{introDescription}</p>
        </div>
      </div>

      <div
        className="card border mb-3"
        style={{ background: "#fffaf2", borderColor: "#f1dfb8" }}
      >
        <div className="card-body">
          <h6 className="mb-2">How PMs should use this toolkit</h6>
          <p className="text-muted mb-2">
            The toolkit is now the working guide for the project manager. It
            combines the lifecycle stages, deliverables, templates, and folder
            structure so the project stays organized in one place.
          </p>
          <ol className="mb-0 pl-3">
            {toolkitUseSteps.map((step) => (
              <li key={step} className="mb-2">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {!phases.length ? (
        <div className="alert alert-info mb-0">
          No toolkit folders configured yet. Add Project Toolkit Folders and
          Document Templates in HIS Project Lifecycle Config.
        </div>
      ) : (
        <div className="row">
          {phases.map((phase, idx) => (
            <div
              className="col-lg-6 mb-3"
              key={`${phase.phase_name || "phase"}-${idx}`}
            >
              <div className="card border h-100">
                <div className="card-header bg-light">
                  <h6 className="mb-0">{phase.phase_name || ""}</h6>
                </div>
                <div className="card-body">
                  <div className="text-muted small text-uppercase mb-1">
                    Folders
                  </div>
                  <ul className="mb-3">
                    {(phase.folders || []).map((folder, fidx) => (
                      <FolderNode
                        key={`${folder.folder_id || folder.folder_name}-${fidx}`}
                        folder={folder}
                      />
                    ))}
                  </ul>
                  <div className="text-muted small text-uppercase mb-1">
                    Required Templates
                  </div>
                  {(phase.templates || []).length ? (
                    <ul className="mb-0">
                      {(phase.templates || []).map((name, tidx) => (
                        <li key={`${name}-${tidx}`}>{name}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-muted" style={{ fontSize: 13 }}>
                      No templates mapped to this phase yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
