import React, { useMemo, useState } from "react";
import type { ProjectDetail, ProjectTask } from "../types";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { ProjectChartCard } from "../ProjectCharts";
import { openForm } from "../utils/frappe";
import { formatDateOrDash } from "../utils/format";

interface Props {
  doc: ProjectDetail;
  pullingJira: boolean;
  onPullJira: () => void;
}

const PAGE_SIZE = 10;

const columns: Column<ProjectTask>[] = [
  {
    header: "Subject",
    render: (task) => (
      <a
        className="pm-proj-link"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openForm("Task", task.name);
        }}
      >
        {task.subject || task.name}
      </a>
    ),
  },
  { header: "Status", render: (t) => t.status || "-" },
  { header: "Priority", render: (t) => t.priority || "-" },
  {
    header: "Source",
    render: (t) =>
      t.custom_task_source === "Jira" && t.custom_jira_issue_url ? (
        <a
          className="pm-proj-link"
          href={t.custom_jira_issue_url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {t.custom_jira_issue_key || "Jira"}
        </a>
      ) : (
        t.custom_task_source || "ERPNext"
      ),
  },
  { header: "Due Date", render: (t) => formatDateOrDash(t.exp_end_date) },
];

function matches(task: ProjectTask, q: string) {
  const haystack = [
    task.subject,
    task.name,
    task.status,
    task.priority,
    task.custom_task_source,
    task.custom_jira_issue_key,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function TasksTab({ doc, pullingJira, onPullJira }: Props) {
  const tasks = doc.tasks ?? [];
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => matches(t, q));
  }, [tasks, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const onSearch = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <div>
      <div className="pm-charts-grid" style={{ marginBottom: 16 }}>
        <ProjectChartCard
          title="Tasks by Status"
          items={(doc.charts?.task_status_breakdown ?? []).map((item) => ({
            label: item.label,
            value: item.count,
          }))}
          emptyText="No tasks are linked to this project yet."
        />
      </div>

      <SectionCard
        title="Project Tasks"
        count={filtered.length}
        countLabel="task"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              className="form-control input-sm"
              placeholder="Search tasks…"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              style={{ width: 200, height: 28, fontSize: 13 }}
            />
            {doc.custom_jira_project && (
              <button
                type="button"
                className="btn btn-default btn-sm"
                disabled={pullingJira}
                onClick={onPullJira}
                title={`Pull issues from Jira project ${doc.custom_jira_project}`}
              >
                {pullingJira ? "Pulling…" : "Pull from Jira"}
              </button>
            )}
          </div>
        }
      >
        <RelatedTable
          columns={columns}
          rows={pageRows}
          getKey={(t) => t.name}
          emptyText={
            query
              ? "No tasks match your search."
              : "No tasks are linked to this project."
          }
        />

        {filtered.length > PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <span className="text-muted" style={{ fontSize: 12 }}>
              Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)}{" "}
              of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-default btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-muted" style={{ fontSize: 12 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-default btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
