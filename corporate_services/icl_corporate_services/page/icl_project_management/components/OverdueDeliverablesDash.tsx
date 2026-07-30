import React from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox } from "./common";
import { OverdueTask } from "./types";

export function OverdueDeliverablesDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data, loading, error } = useApiData<{ tasks: OverdueTask[]; total: number }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_overdue_deliverables"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const tasks = data?.tasks ?? [];
  if (tasks.length === 0) return <div className="p-3 alert alert-success">No overdue deliverables. All tasks are on track.</div>;
  return (
    <div className="container-fluid p-3">
      <div className="alert alert-warning mb-3" style={{ fontSize: 13 }}>
        <strong>{tasks.length}</strong> overdue task{tasks.length !== 1 ? "s" : ""} across active projects.
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-hover" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              <th style={{ minWidth: 200 }}>Task</th>
              <th style={{ minWidth: 140 }}>Project</th>
              <th>Client</th>
              <th>PM</th>
              <th style={{ textAlign: "right" }}>Due Date</th>
              <th style={{ textAlign: "right" }}>Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.name} className="ipm-pipeline-row" onClick={() => onOpenProject(t.project)}>
                <td>{t.subject}</td>
                <td style={{ fontWeight: 600 }}>{t.project_name}</td>
                <td>{t.customer ?? "-"}</td>
                <td>{t.pm_names ?? "-"}</td>
                <td style={{ textAlign: "right" }}>{t.exp_end_date ?? "-"}</td>
                <td style={{ textAlign: "right" }}>
                  <span className="badge badge-danger" style={{ background: "#dc3545", color: "#fff" }}>
                    {t.days_overdue}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
