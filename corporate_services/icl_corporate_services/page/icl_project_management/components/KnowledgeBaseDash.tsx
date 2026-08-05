import React, { useEffect, useState } from "react";
import { PRIORITY_COLOR } from "./common";
import { KbResult } from "./types";

export function KnowledgeBaseDash() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState("");
  const [projectType, setProjectType] = useState("");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [results, setResults] = useState<KbResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    globalThis.frappe.call({
      method: "frappe.client.get_list",
      args: { doctype: "Project Type", fields: ["name"], limit_page_length: 0 },
    }).then((r: any) => {
      setProjectTypes(((r && r.message) || []).map((row: any) => row.name));
    }).catch(() => {});
  }, []);

  function search() {
    setLoading(true);
    setSearched(true);
    globalThis.frappe.call({
      method: "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.search_lessons_learned_kb",
      args: { q: query.trim(), area: area.trim(), priority: priority.trim(), project_type: projectType.trim() },
    }).then((r: any) => {
      setResults((r && r.message) || []);
      setLoading(false);
    }).catch(() => { setResults([]); setLoading(false); });
  }

  function exportDocx(reportName: string) {
    setExporting(reportName);
    globalThis.frappe.call({
      method: "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.export_lessons_learned_docx",
      args: { report_name: reportName },
    }).then((r: any) => {
      setExporting(null);
      const url = r && r.message && r.message.file_url;
      if (url) window.open(url, "_blank");
    }).catch(() => setExporting(null));
  }

  const AREAS = ["Technical", "Process", "Communication", "Resource", "Risk", "Other"];
  const PRIORITIES = ["High", "Medium", "Low"];

  return (
    <div className="container-fluid p-3">
      <div className="card border mb-3">
        <div className="card-header bg-light">
          <strong style={{ fontSize: 13 }}>Lessons Learned Knowledge Base</strong>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
            Search approved lessons learned reports by keyword, area, or recommendation priority.
          </div>
        </div>
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label" style={{ fontSize: 12 }}>Keyword</label>
              <input
                className="form-control form-control-sm"
                placeholder="Issue, recommendation, action item..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label" style={{ fontSize: 12 }}>Project Type</label>
              <select className="form-control form-control-sm" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
                <option value="">All Types</option>
                {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" style={{ fontSize: 12 }}>Area</label>
              <select className="form-control form-control-sm" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">All Areas</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" style={{ fontSize: 12 }}>Priority</label>
              <select className="form-control form-control-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100" onClick={search} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="text-muted text-center py-4" style={{ fontSize: 13 }}>No matching lessons learned reports found.</div>
      )}

      {results.map((r) => (
        <div key={r.report_name} className="card border mb-3">
          <div
            className="card-header d-flex justify-content-between align-items-start"
            style={{ cursor: "pointer", background: "#fff" }}
            onClick={() => setExpanded(expanded === r.report_name ? null : r.report_name)}
          >
            <div>
              <strong style={{ fontSize: 13 }}>{r.project_title || r.report_name}</strong>
              <span className="text-muted" style={{ fontSize: 12, marginLeft: 10 }}>{r.report_name}</span>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {r.reporter_name && <span>Reporter: {r.reporter_name}</span>}
                {r.date_of_report && <span style={{ marginLeft: 10 }}>Date: {r.date_of_report}</span>}
                <span style={{ marginLeft: 10 }}>
                  {r.root_causes.length} root cause{r.root_causes.length !== 1 ? "s" : ""},&nbsp;
                  {r.recommendations.length} recommendation{r.recommendations.length !== 1 ? "s" : ""},&nbsp;
                  {r.next_steps.length} next step{r.next_steps.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0, marginLeft: 12 }}>
              <button
                className="btn btn-outline-secondary btn-sm"
                style={{ fontSize: 11 }}
                disabled={exporting === r.report_name}
                onClick={(e) => { e.stopPropagation(); exportDocx(r.report_name); }}
              >
                {exporting === r.report_name ? "Exporting..." : "Export .docx"}
              </button>
              <span style={{ fontSize: 16, color: "#aaa" }}>{expanded === r.report_name ? "▲" : "▼"}</span>
            </div>
          </div>

          {expanded === r.report_name && (
            <div className="card-body pt-2">
              {r.root_causes.length > 0 && (
                <div className="mb-3">
                  <div className="fw-semibold mb-1" style={{ fontSize: 12, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>Root Causes</div>
                  <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                    <thead className="thead-light">
                      <tr><th>Issue</th><th>Root Cause</th></tr>
                    </thead>
                    <tbody>
                      {r.root_causes.map((rc, i) => (
                        <tr key={i}><td>{rc.issue}</td><td>{rc.root_cause}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.recommendations.length > 0 && (
                <div className="mb-3">
                  <div className="fw-semibold mb-1" style={{ fontSize: 12, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>Recommendations</div>
                  <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                    <thead className="thead-light">
                      <tr><th>Recommendation</th><th style={{ width: 90 }}>Priority</th><th>Area</th></tr>
                    </thead>
                    <tbody>
                      {r.recommendations.map((rec, i) => (
                        <tr key={i}>
                          <td>{rec.recommendation}</td>
                          <td>
                            <span className="badge" style={{ background: PRIORITY_COLOR[rec.priority] ?? "#adb5bd", color: "#fff" }}>
                              {rec.priority || "-"}
                            </span>
                          </td>
                          <td>{rec.area ?? <span className="text-muted">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.next_steps.length > 0 && (
                <div>
                  <div className="fw-semibold mb-1" style={{ fontSize: 12, textTransform: "uppercase", color: "#888", letterSpacing: "0.05em" }}>Next Steps</div>
                  <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                    <thead className="thead-light">
                      <tr><th>Action Item</th><th>Responsible</th><th>Deadline</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {r.next_steps.map((ns, i) => (
                        <tr key={i}>
                          <td>{ns.action_item}</td>
                          <td>{ns.responsible_person ?? <span className="text-muted">-</span>}</td>
                          <td>{ns.deadline ?? <span className="text-muted">-</span>}</td>
                          <td>{ns.status ?? <span className="text-muted">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
