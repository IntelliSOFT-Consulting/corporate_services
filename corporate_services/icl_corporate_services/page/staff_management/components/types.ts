export interface DeptBreakdown {
  department: string;
  cnt: number;
}

export interface TypeBreakdown {
  employment_type: string;
  cnt: number;
}

export interface StaffStats {
  total_active: number;
  new_this_month: number;
  on_leave_today: number;
  dept_count: number;
  department_breakdown: DeptBreakdown[];
  employment_type_breakdown: TypeBreakdown[];
}

export interface EmployeeRow {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  employment_type?: string;
  date_of_joining?: string;
  status?: string;
  company_email?: string;
  cell_number?: string;
  image?: string;
  reports_to?: string;
  gender?: string;
}

export interface OnLeaveRow {
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  department?: string;
  designation?: string;
}

export interface LeaveRecord {
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string;
}

export interface LeaveAllocation {
  leave_type: string;
  total_leaves_allocated: number;
  carry_forwarded_leaves_count: number;
  leaves_taken: number;
  balance: number;
  from_date: string;
  to_date: string;
}

export interface TravelRequest {
  name: string;
  travel_type?: string;
  purpose_of_travel?: string;
  workflow_state?: string;
  custom_travel_date?: string;
  custom_local_travel?: number;
  custom_duty_station?: string;
  custom_local_place_of_travel?: string;
  custom_place_of_travel_per_diem?: string;
  creation?: string;
}

export interface TravelReconciliation {
  name: string;
  travel_request?: string;
  trip_dates_from?: string;
  trip_datesto?: string;
  total_advance?: number;
  total_spent?: number;
  total_balance?: number;
  currency?: string;
  docstatus?: number;
  creation?: string;
}

export interface LeaveApplication {
  name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string;
  description?: string;
}

export interface AssetRequisition {
  name: string;
  requisition_date?: string;
  urgency?: string;
}

export interface TimesheetSubmission {
  name: string;
  employee?: string;
  employee_name?: string;
  month_year?: string;
  total_working_hours?: number;
  status?: string;
  workflow_state?: string;
  creation?: string;
}

export interface EmployeeProfile {
  employee: EmployeeRow & {
    personal_email?: string;
    date_of_birth?: string;
    notice_number_of_days?: number;
    company?: string;
  };
  recent_leaves: LeaveRecord[];
  leave_allocations: LeaveAllocation[];
  travel_requests: TravelRequest[];
  travel_reconciliations: TravelReconciliation[];
  leave_applications: LeaveApplication[];
  asset_requisitions: AssetRequisition[];
  timesheet_submissions: TimesheetSubmission[];
}
