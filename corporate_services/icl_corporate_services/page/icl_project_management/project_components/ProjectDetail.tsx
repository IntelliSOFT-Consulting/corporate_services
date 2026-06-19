import React, { useState } from "react";
import { useProjectDetail } from "./hooks/useProjectDetail";
import WorkPlanPage from "../work_plan";
import { ProjectHeader } from "./components/ProjectHeader";
import { ProjectSummaryStrip } from "./components/ProjectSummaryStrip";
import { OverviewTab } from "./tabs/OverviewTab";
import { TasksTab } from "./tabs/TasksTab";
import { TeamTab } from "./tabs/TeamTab";
import { TimesheetsTab } from "./tabs/TimesheetsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { frappeCall, showAlert } from "./utils/frappe";

interface Props {
  projectId: string;
  onBack: () => void;
}

type TabKey =
  | "overview"
  | "tasks"
  | "team"
  | "timesheets"
  | "documents"
  | "work_plan";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "team", label: "Team" },
  { key: "timesheets", label: "Timesheets" },
  { key: "documents", label: "Documents" },
  { key: "work_plan", label: "Work Plan" },
];

export function ProjectDetail({ projectId, onBack }: Props) {
  const { doc, loading, error, refetch } = useProjectDetail(projectId);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [pullingJira, setPullingJira] = useState(false);

  const pullJiraTasks = async () => {
    if (!projectId || pullingJira) return;
    setPullingJira(true);
    try {
      const r = await frappeCall(
        "corporate_services.api.project.pull_project_jira_tasks",
        { project_name: projectId },
      );
      const res = r?.message ?? {};
      const t = res?.tasks ?? {};
      showAlert(
        `Synced ${res.count ?? 0} Jira issue${(res.count ?? 0) === 1 ? "" : "s"} (${t.created ?? 0} new, ${t.updated ?? 0} updated)`,
        "green",
        7,
      );
      refetch();
    } catch (e: any) {
      showAlert(e?.message || "Failed to pull Jira tasks.", "red", 7);
    } finally {
      setPullingJira(false);
    }
  };

  return (
    <div className="pm-fade-in">
      <ProjectHeader
        projectId={projectId}
        title={doc?.project_name || projectId}
        status={doc?.status}
        loading={loading}
        onBack={onBack}
      />

      {loading && (
        <div className="text-center text-muted" style={{ padding: "48px 0" }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ marginTop: 10 }}>Loading project…</div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {doc && !loading && (
        <>
          <ProjectSummaryStrip doc={doc} />

          <div className="pm-detail-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`pm-detail-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <OverviewTab doc={doc} projectId={projectId} />
          )}
          {activeTab === "tasks" && (
            <TasksTab
              doc={doc}
              pullingJira={pullingJira}
              onPullJira={pullJiraTasks}
            />
          )}
          {activeTab === "team" && <TeamTab users={doc.linked_users ?? []} />}
          {activeTab === "timesheets" && <TimesheetsTab doc={doc} />}
          {activeTab === "documents" && <DocumentsTab projectId={projectId} />}
          {activeTab === "work_plan" && (
            <WorkPlanPage projectId={projectId} />
          )}
        </>
      )}
    </div>
  );
}
