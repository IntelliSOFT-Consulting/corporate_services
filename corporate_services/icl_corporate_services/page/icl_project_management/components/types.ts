export type Summary = {
  total_projects?: number;
  completed_projects?: number;
  active_projects?: number;
  average_progress?: number;
};

export type StatusRow = { status: string; count: number };

export type ProjectRow = {
  name: string;
  project_name?: string;
  status?: string;
  percent_complete?: number;
  priority?: string;
  expected_start_date?: string;
  expected_end_date?: string;
};

export type RiskSummary = { on_track: number; needs_attention: number; at_risk: number; not_started: number };
export type OverdueReportRow = { project: string; project_name: string };
export type MilestoneRow = { project: string; project_name: string; subject: string; exp_end_date: string };
export type PaymentScheduleRow = {
  project: string; project_name: string; client: string | null; deliverable: string | null;
  percentage: number; due_date: string | null; status: string; payment_status: string;
};

export type DashboardData = {
  summary?: Summary;
  status_breakdown?: StatusRow[];
  projects?: ProjectRow[];
  risk_summary?: RiskSummary;
  overdue_reports?: OverdueReportRow[];
  milestones_due_soon?: MilestoneRow[];
  payment_schedule?: PaymentScheduleRow[];
  payments_approaching?: PaymentScheduleRow[];
};

export type ProjectHoursRow = {
  project: string;
  project_title: string;
  total_hours: number;
  employee_count: number;
  percentage: number;
};

export type MonthOption = { value: string; label: string };

export type ProjectHoursData = {
  total_hours?: number;
  employee_count?: number;
  projects?: ProjectHoursRow[];
  months?: MonthOption[];
};

export type LifecycleFolder = {
  folder_id?: string;
  folder_name?: string;
  project_phase?: string;
  is_child_folder?: boolean;
  children?: LifecycleFolder[];
};

export type LifecyclePhase = {
  phase_name?: string;
  folders?: LifecycleFolder[];
  templates?: string[];
};

export type LifecycleData = {
  intro_title?: string;
  intro_description?: string;
  phases?: LifecyclePhase[];
};

export type TemplateResource = {
  name?: string;
  requirement?: string;
  description?: string;
  doctype?: string;
  template_file?: string;
  is_active?: number;
};

export type Tab = "dashboard" | "projects" | "lifecycle" | "templates" | "lessons_learned";

export type LessonsLearnedRow = {
  name: string;
  project_title?: string;
  reporter_name?: string;
  workflow_state?: string;
  date_of_report?: string;
};

// RAG health status. Not to be confused with the display colors each maps to (see RAG_COLOR) -
// "NotStarted" is shown in blue, but the status name itself isn't a color.
export type RagStatus = "Red" | "Amber" | "Green" | "NotStarted";

export type PortfolioBadge = { type: "risk" | "report_overdue" | "no_report"; text: string };
export type PortfolioProject = {
  name: string; project_name: string; status: string; percent_complete: number;
  expected_end_date: string | null; customer: string | null; pm_names: string | null;
  rag: RagStatus; phase: string | null; badge: PortfolioBadge | null;
  next_milestone: string | null; next_milestone_date: string | null;
  days_remaining: number | null; hours_logged: number;
};
export type PmRow2 = { employee: string; employee_name: string };
export type PortfolioData = {
  projects: PortfolioProject[]; summary: Record<string, number>;
  is_smt: boolean; pms: PmRow2[]; selected_pm: string | null;
};

export type PipelineProject = {
  name: string; project_name: string; status: string; percent_complete: number;
  expected_end_date: string | null; customer: string | null; pm_names: string | null;
  stage_progress: Array<"complete" | "current" | "pending">;
};

export type OverdueTask = {
  name: string; subject: string; project: string; project_name: string;
  exp_end_date: string | null; days_overdue: number; status: string;
  customer: string | null; pm_names: string | null;
};

export type OverdueStatusReportRow = {
  project: string; project_name: string; client: string | null;
  report_type: string; frequency: string | null; due_date: string; days_over: number;
};
export type MilestoneAlertRow = {
  project: string; project_name: string; phase: string | null; milestone: string;
  due_date: string; assigned: string | null; status: string; overdue: boolean; days: number;
};
export type PaymentAlertRow = {
  project: string; project_name: string; client: string | null; deliverable: string | null;
  due_date: string; payment_status: string; overdue: boolean; days: number;
};
export type OverdueDeliverablesData = {
  is_smt: boolean; pms: PmRow2[]; selected_pm: string | null;
  overdue_reports: OverdueStatusReportRow[];
  milestones: MilestoneAlertRow[];
  payment_alerts: PaymentAlertRow[];
  summary: { overdue_reports: number; overdue_milestones: number; overdue_payments: number; approaching_payments: number };
};

export type PmBreakdownProject = {
  project: string; project_name: string; phase: string | null;
  open_tasks: number; overdue_tasks: number; next_milestone: string | null; rag: RagStatus;
};
export type PmBreakdown = {
  projects: PmBreakdownProject[]; active_projects: number; open_tasks: number; overdue_reports: number;
};
export type PmComparisonRow = {
  employee: string; employee_name: string; active_projects: number; open_tasks: number;
  overdue_tasks: number; overdue_reports: number; health: RagStatus;
};
export type PmWorkloadData = {
  is_smt: boolean; employee: string | null; employee_name: string | null;
  pms: PmRow2[]; my_view: PmBreakdown | null; smt_view: PmComparisonRow[] | null;
};

export type WorkflowStateRow = { state: string; count: number };
export type PriorityRow = { priority: string; count: number };
export type StatusRow2 = { status: string; count: number };
export type CoverageRow = { with_root_causes: number; with_recommendations: number; with_next_steps: number; total: number };
export type RootCauseItem = { issue: string; root_cause: string; area_affected: string | null; report_name: string; project_title: string; reporter_name: string };
export type RecommendationItem = { recommendation: string; priority: string; area: string | null; report_name: string; project_title: string; reporter_name: string };
export type NextStepItem = { action_item: string; responsible_person: string | null; deadline: string | null; status: string | null; report_name: string; project_title: string };

export type KbResult = {
  report_name: string;
  project_title: string;
  reporter_name: string;
  workflow_state: string;
  date_of_report: string | null;
  root_causes: { issue: string; root_cause: string }[];
  recommendations: { recommendation: string; priority: string; area: string | null }[];
  next_steps: { action_item: string; responsible_person: string | null; deadline: string | null; status: string | null }[];
};
