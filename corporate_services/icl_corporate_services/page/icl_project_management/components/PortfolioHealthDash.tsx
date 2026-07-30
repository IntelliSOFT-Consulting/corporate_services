import React, { useState } from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox, RAG_COLOR, RAG_LABEL, RAG_SUMMARY_KEY, RAG_ORDER } from "./common";
import { PortfolioData, RagStatus } from "./types";

function RagPill({ rag, count }: { rag: RagStatus; count: number }) {
  const color = RAG_COLOR[rag];
  return (
    <span
      className="ipm-portfolio-pill"
      style={{ borderColor: color, color, background: `${color}14` }}
    >
      <span className="ipm-portfolio-pill-dot" style={{ background: color }} />
      {RAG_LABEL[rag]}: {count}
    </span>
  );
}

export function PortfolioHealthDash({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [pm, setPm] = useState("");
  const { data, loading, error } = useApiData<PortfolioData>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_portfolio_health",
    pm ? { pm } : null,
    [pm]
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;
  const projects = data?.projects ?? [];
  const summary = data?.summary ?? {};
  const isSmt = !!data?.is_smt;
  const pms = data?.pms ?? [];

  return (
    <div className="container-fluid p-3">
      {isSmt && (
        <div className="d-flex justify-content-end mb-2">
          <select
            className="form-select form-select-sm ipm-pm-filter"
            value={pm}
            onChange={(e) => setPm(e.target.value)}
          >
            <option value="">All PMs</option>
            {pms.map((row) => (
              <option key={row.employee} value={row.employee}>{row.employee_name}</option>
            ))}
          </select>
        </div>
      )}

      {isSmt && (
        <div className="ipm-portfolio-banner mb-3">
          SMT mode: PM filter dropdown top-right. Shows all {projects.length} project{projects.length === 1 ? "" : "s"}{" "}
          across all {pms.length} PM{pms.length === 1 ? "" : "s"}.
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 mb-2">
        {RAG_ORDER.map((rag) => (
          <RagPill key={rag} rag={rag} count={summary[RAG_SUMMARY_KEY[rag]] ?? 0} />
        ))}
      </div>
      <div className="ipm-portfolio-hint mb-3">
        Health status is calculated from Jira task completion. Data refreshes when Jira sync runs.
      </div>

      {projects.length === 0 ? (
        <div className="alert alert-info">No active projects found.</div>
      ) : (
        <div className="row">
          {projects.map((p) => (
            <div className="col-lg-4 col-md-6 mb-3" key={p.name}>
              <div
                className="card border h-100 ipm-portfolio-card"
                style={{ borderLeft: `4px solid ${RAG_COLOR[p.rag]}` }}
                onClick={() => onOpenProject(p.name)}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="mb-0" style={{ fontSize: 13, fontWeight: 700 }}>{p.project_name || p.name}</h6>
                    <span
                      className="ipm-portfolio-rag-badge"
                      style={{ background: `${RAG_COLOR[p.rag]}1a`, color: RAG_COLOR[p.rag] }}
                    >
                      {RAG_LABEL[p.rag]}
                    </span>
                  </div>
                  {p.customer && <div className="text-muted" style={{ fontSize: 11 }}>{p.customer}</div>}
                  {p.phase && <div className="text-muted mt-1" style={{ fontSize: 11 }}>{p.phase}</div>}

                  {p.badge && (
                    <span
                      className="ipm-portfolio-alert-badge"
                      style={{
                        background: p.badge.type === "risk" ? "#dc354514" : "#e2a33614",
                        color: p.badge.type === "risk" ? "#dc3545" : "#8a6416",
                      }}
                    >
                      {p.badge.text}
                    </span>
                  )}

                  <div className="mt-2">
                    <div className="d-flex justify-content-between" style={{ fontSize: 11 }}>
                      <span>{p.percent_complete.toFixed(0)}%</span>
                    </div>
                    <div className="progress mt-1" style={{ height: 5 }}>
                      <div
                        className="progress-bar"
                        style={{ width: `${p.percent_complete}%`, background: RAG_COLOR[p.rag] }}
                      />
                    </div>
                  </div>

                  <div className="ipm-portfolio-stat-row mt-2">
                    <div className="ipm-portfolio-stat-box">
                      <div className="ipm-portfolio-stat-label">Next milestone</div>
                      <div className="ipm-portfolio-stat-val">
                        {p.next_milestone ? `${p.next_milestone}${p.next_milestone_date ? ` - ${p.next_milestone_date}` : ""}` : "-"}
                      </div>
                    </div>
                    <div className="ipm-portfolio-stat-box">
                      <div className="ipm-portfolio-stat-label">Days remaining</div>
                      <div className="ipm-portfolio-stat-val">
                        {p.days_remaining !== null ? `${p.days_remaining} days` : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="text-muted mt-2" style={{ fontSize: 11 }}>
                    {Math.round(p.hours_logged || 0)}h logged
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
