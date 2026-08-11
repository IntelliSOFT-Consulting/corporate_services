import React from "react";
import { useApiData } from "./useApiData";
import { LoadingBox, ErrorBox, FilterableTable, PRIORITY_COLOR, STATE_COLOR } from "./common";
import {
  WorkflowStateRow,
  PriorityRow,
  StatusRow2,
  CoverageRow,
  RootCauseItem,
  RecommendationItem,
  NextStepItem,
} from "./types";

function TrendBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 12 }}>
        <span>{label}</span>
        <strong>{count}</strong>
      </div>
      <div className="progress" style={{ height: 10, borderRadius: 4 }}>
        <div className="progress-bar" style={{ width: `${(count / max) * 100}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function LessonsLearnedTrendsDash() {
  const { data, loading, error } = useApiData<{
    workflow_states: WorkflowStateRow[];
    recommendation_priorities: PriorityRow[];
    next_step_statuses: StatusRow2[];
    coverage: CoverageRow;
    root_causes: RootCauseItem[];
    recommendations: RecommendationItem[];
    next_steps: NextStepItem[];
  }>(
    "corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_lessons_learned_trends"
  );
  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox msg={error} />;

  const states = data?.workflow_states ?? [];
  const priorities = data?.recommendation_priorities ?? [];
  const nextSteps = data?.next_step_statuses ?? [];
  const cov = data?.coverage ?? ({} as CoverageRow);
  const total = cov.total ?? 0;
  const rootCauses = data?.root_causes ?? [];
  const recommendations = data?.recommendations ?? [];
  const nextStepList = data?.next_steps ?? [];

  const maxState = Math.max(...states.map((s) => s.count), 1);
  const maxPri = Math.max(...priorities.map((p) => p.count), 1);
  const maxNs = Math.max(...nextSteps.map((n) => n.count), 1);

  return (
    <div className="container-fluid p-3">
      {/* Coverage summary */}
      <div className="row mb-3">
        {[
          { label: "Approved Reports", value: total },
          { label: "With Root Causes", value: cov.with_root_causes ?? 0 },
          { label: "With Recommendations", value: cov.with_recommendations ?? 0 },
          { label: "With Next Steps", value: cov.with_next_steps ?? 0 },
        ].map((m) => (
          <div className="col-md-3 col-6 mb-2" key={m.label}>
            <div className="card border text-center">
              <div className="card-body p-2">
                <div style={{ fontSize: 26, fontWeight: 700 }}>{m.value}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{m.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        {/* Report status breakdown */}
        <div className="col-md-4 mb-3">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3" style={{ fontSize: 13 }}>Reports by Status</h6>
              {states.length === 0
                ? <div className="text-muted" style={{ fontSize: 12 }}>No reports found.</div>
                : states.map((s) => (
                  <TrendBar key={s.state} label={s.state} count={s.count} max={maxState}
                    color={STATE_COLOR[s.state] ?? "#5e64ff"} />
                ))}
            </div>
          </div>
        </div>

        {/* Recommendation priorities */}
        <div className="col-md-4 mb-3">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3" style={{ fontSize: 13 }}>Recommendation Priorities</h6>
              {priorities.length === 0
                ? <div className="text-muted" style={{ fontSize: 12 }}>No recommendations in approved reports.</div>
                : priorities.map((p) => (
                  <TrendBar key={p.priority} label={p.priority} count={p.count} max={maxPri}
                    color={PRIORITY_COLOR[p.priority] ?? "#5e64ff"} />
                ))}
            </div>
          </div>
        </div>

        {/* Next step statuses */}
        <div className="col-md-4 mb-3">
          <div className="card border h-100">
            <div className="card-body">
              <h6 className="mb-3" style={{ fontSize: 13 }}>Next Step Status</h6>
              {nextSteps.length === 0
                ? <div className="text-muted" style={{ fontSize: 12 }}>No next steps in approved reports.</div>
                : nextSteps.map((n) => (
                  <TrendBar key={n.status} label={n.status} count={n.count} max={maxNs} color="#5e64ff" />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail lists ── */}
      {rootCauses.length > 0 && (
        <FilterableTable
          title="Root Causes"
          rows={rootCauses}
          filterKeys={["project_title", "reporter_name", "issue", "root_cause", "area_affected"]}
          columns={[
            { label: "Project", key: "project_title" },
            { label: "Reporter", key: "reporter_name" },
            { label: "Issue", key: "issue" },
            { label: "Root Cause", key: "root_cause" },
            { label: "Area Affected", key: "area_affected" },
          ]}
        />
      )}

      {recommendations.length > 0 && (
        <FilterableTable
          title="Recommendations"
          rows={recommendations}
          filterKeys={["project_title", "recommendation", "area", "priority"]}
          columns={[
            { label: "Project", key: "project_title" },
            {
              label: "Priority",
              key: "priority",
              render: (v: string) => (
                <span className="badge" style={{ background: PRIORITY_COLOR[v] ?? "#adb5bd", color: "#fff" }}>
                  {v || "-"}
                </span>
              ),
            },
            { label: "Recommendation", key: "recommendation" },
            { label: "Area", key: "area" },
          ]}
        />
      )}

      {nextStepList.length > 0 && (
        <FilterableTable
          title="Next Steps / Follow-up"
          rows={nextStepList}
          filterKeys={["project_title", "action_item", "responsible_person", "status"]}
          columns={[
            { label: "Project", key: "project_title" },
            { label: "Action Item", key: "action_item" },
            { label: "Responsible", key: "responsible_person" },
            { label: "Deadline", key: "deadline" },
            { label: "Status", key: "status" },
          ]}
        />
      )}
    </div>
  );
}
