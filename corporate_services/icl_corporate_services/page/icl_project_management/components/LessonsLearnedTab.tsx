import React, { useEffect, useState } from "react";
import { FilterableTable, STATE_COLOR } from "./common";
import { LessonsLearnedRow } from "./types";

export function LessonsLearnedTab() {
  const [rows, setRows] = useState<LessonsLearnedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({
        method: "frappe.client.get_list",
        args: {
          doctype: "Project Management Lessons Learned",
          fields: ["name", "project_title", "reporter_name", "workflow_state", "date_of_report"],
          order_by: "date_of_report desc",
          limit_page_length: 0,
        },
      })
      .then((r: any) => {
        setRows((r && r.message) || []);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Could not load Lessons Learned reports.");
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  function openReport(name: string) {
    globalThis.frappe?.set_route("Form", "Project Management Lessons Learned", name);
  }

  if (loading) {
    return <div className="container-fluid p-3 text-muted">Loading Lessons Learned reports...</div>;
  }
  if (error) {
    return (
      <div className="container-fluid p-3">
        <div className="alert alert-danger mb-0">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-3">
      <div className="d-flex justify-content-end mb-3">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => globalThis.frappe?.new_doc("Project Management Lessons Learned")}
        >
          New Lessons Learned Report
        </button>
      </div>
      <FilterableTable
        title="Lessons Learned Reports"
        rows={rows}
        filterKeys={["name", "project_title", "reporter_name", "workflow_state"]}
        columns={[
          {
            label: "Report",
            key: "name",
            render: (v: string) => (
              <a href="#" onClick={(e) => { e.preventDefault(); openReport(v); }}>{v}</a>
            ),
          },
          { label: "Project", key: "project_title" },
          { label: "Reporter", key: "reporter_name" },
          {
            label: "Status",
            key: "workflow_state",
            render: (v: string) => (
              <span className="badge" style={{ background: STATE_COLOR[v] ?? "#adb5bd", color: "#fff" }}>
                {v || "Draft"}
              </span>
            ),
          },
          { label: "Date", key: "date_of_report" },
        ]}
      />
    </div>
  );
}
