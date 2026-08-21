import React from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox, usePagedRows, ShowMoreFooter } from "./common";
import { PipelineProject } from "./types";

export function DeliveryPipelineDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data, loading, error } = useApiData<{ projects: PipelineProject[]; stages: string[] }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_delivery_pipeline"
  );
  const projects = data?.projects ?? [];
  const stages = data?.stages ?? [];
  const projectsPage = usePagedRows(projects);

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  if (projects.length === 0) return <div className="p-3 alert alert-info">No projects found.</div>;
  return (
    <div className="container-fluid p-3">
      <div className="table-responsive">
        <table className="table table-sm table-hover" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              <th style={{ minWidth: 160 }}>Project</th>
              <th>Client</th>
              <th>PM</th>
              <th>Due</th>
              {stages.map((s) => <th key={s} style={{ textAlign: "center", minWidth: 80 }}>{s}</th>)}
              <th style={{ minWidth: 80 }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {projectsPage.visible.map((p) => (
              <tr key={p.name} className="ipm-pipeline-row" onClick={() => onOpenProject(p.name)}>
                <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                <td>{p.customer ?? "-"}</td>
                <td>{p.pm_names ?? "-"}</td>
                <td>{p.expected_end_date ?? "-"}</td>
                {(p.stage_progress ?? []).map((state, i) => (
                  <td key={i} style={{ textAlign: "center" }}>
                    {state === "complete" ? (
                      <span style={{ color: "#28a745", fontWeight: 700 }}>✓</span>
                    ) : state === "current" ? (
                      <span style={{ color: "#fd7e14" }}>●</span>
                    ) : (
                      <span style={{ color: "#dee2e6" }}>○</span>
                    )}
                  </td>
                ))}
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div className="progress flex-grow-1" style={{ height: 6 }}>
                      <div className="progress-bar bg-primary" style={{ width: `${p.percent_complete}%` }} />
                    </div>
                    <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{p.percent_complete.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ShowMoreFooter
          hidden={projectsPage.hidden}
          showAll={projectsPage.showAll}
          onToggle={projectsPage.setShowAll}
        />
      </div>
    </div>
  );
}
