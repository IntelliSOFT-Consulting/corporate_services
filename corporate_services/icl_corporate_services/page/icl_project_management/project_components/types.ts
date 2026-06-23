export type ToastMessage = { id: string; message: string; type: "success"|"error"|"info" };

export type ProjectRow = {
  name: string;
  project_name?: string;
  status?: string;
  percent_complete?: number;
  expected_start_date?: string;
  expected_end_date?: string;
  customer?: string;
  department?: string;
  company?: string;
  priority?: string;
  estimated_costing?: number;
  custom_bid?: string;
  timesheet_count?: number;
  total_timesheet_hours?: number;
  travel_request_count?: number;
  status_tone?: "green" | "amber" | "red";
  status_tone_label?: string;
  lifecycle_phase?: string;
  next_milestone_name?: string;
  next_milestone_due_date?: string;
  days_to_contract_end?: number | null;
};

export type ProjectTimesheet = {
  name: string;
  employee?: string;
  employee_name?: string;
  status?: string;
  total_hours?: number;
  start_date?: string;
  end_date?: string;
  modified?: string;
};

export type ProjectTravelRequest = {
  name: string;
  employee?: string;
  employee_name?: string;
  workflow_state?: string;
  custom_travel_date?: string;
  custom_travel_place?: string;
  modified?: string;
};

export type ProjectTask = {
  name: string;
  subject?: string;
  status?: string;
  priority?: string;
  exp_start_date?: string;
  exp_end_date?: string;
  progress?: number;
  custom_task_source?: string;
  custom_jira_issue_key?: string;
  custom_jira_issue_url?: string;
  modified?: string;
};

export type ProjectLinkedUser = {
  user: string;
  employee?: string;
  employee_name?: string;
  full_name?: string;
  email?: string;
  allocated_loes?: number;
  project_status?: string;
  total_hours?: number;
};

export type ProjectChartCount = {
  label: string;
  count: number;
};

export type ProjectListHoursChart = {
  project: string;
  total_hours: number;
};

export type ProjectListCountChart = {
  project: string;
  count: number;
};

export type ProjectDetail = ProjectRow & {
  notes?: string;
  cost_center?: string;
  total_costing_amount?: number;
  total_purchase_cost?: number;
  gross_margin?: number;
  per_gross_margin?: number;
  actual_start_date?: string;
  actual_end_date?: string;
  actual_time?: number;
  owner?: string;
  modified?: string;
  creation?: string;
  custom_jira_project?: string;
  linked_users?: ProjectLinkedUser[];
  timesheets?: ProjectTimesheet[];
  travel_requests?: ProjectTravelRequest[];
  tasks?: ProjectTask[];
  charts?: {
    timesheet_status_breakdown?: ProjectChartCount[];
    travel_request_workflow_breakdown?: ProjectChartCount[];
    task_status_breakdown?: ProjectChartCount[];
  };
};

export type ProjectListResult = {
  projects: ProjectRow[];
  total: number;
  status_counter?: {
    green: number;
    amber: number;
    red: number;
  };
  this_week?: {
    status_reports_due_this_week: number;
    milestones_due_next_7_days: number;
  };
  charts?: {
    timesheet_hours_by_project?: ProjectListHoursChart[];
    travel_requests_by_project?: ProjectListCountChart[];
  };
};
