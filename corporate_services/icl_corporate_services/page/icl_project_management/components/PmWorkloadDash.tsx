import React from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox } from "./common";
import { PmRow } from "./types";

export function PmWorkloadDash() {
  const { data, loading, error } = useApiData<{ pms: PmRow[] }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_pm_workload"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const pms = data?.pms ?? [];
  if (pms.length === 0) return <div className="p-3 alert alert-info">No Project Managers with active projects found.</div>;
  const maxProjects = Math.max(...pms.map((p) => p.active_projects), 1);
  return (
    <div className="container-fluid p-3">
      <div className="table-responsive">
        <table className="table table-sm" style={{ fontSize: 12 }}>
          <thead className="thead-light">
            <tr>
              <th style={{ minWidth: 160 }}>Project Manager</th>
              <th style={{ textAlign: "center" }}>Active Projects</th>
              <th style={{ minWidth: 200 }}>Load</th>
              <th style={{ textAlign: "center" }}>Open Tasks</th>
              <th style={{ textAlign: "center" }}>Overdue Tasks</th>
            </tr>
          </thead>
          <tbody>
            {pms.map((pm) => (
              <tr key={pm.employee}>
                <td style={{ fontWeight: 600 }}>{pm.employee_name || pm.employee}</td>
                <td style={{ textAlign: "center" }}>{pm.active_projects}</td>
                <td>
                  <div className="progress" style={{ height: 8 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${(pm.active_projects / maxProjects) * 100}%`,
                        background: pm.active_projects > maxProjects * 0.8 ? "#dc3545" : pm.active_projects > maxProjects * 0.5 ? "#fd7e14" : "#28a745",
                      }}
                    />
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>{pm.open_tasks}</td>
                <td style={{ textAlign: "center" }}>
                  {pm.overdue_tasks > 0 ? (
                    <span className="badge" style={{ background: "#dc3545", color: "#fff" }}>{pm.overdue_tasks}</span>
                  ) : (
                    <span style={{ color: "#28a745" }}>0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
