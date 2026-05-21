export interface MonthlyBreakdown {
  month: number;
  cnt: number;
}

export interface TurnoverStats {
  year: number;
  employees_left: number;
  headcount_start: number;
  headcount_end: number;
  avg_headcount: number;
  turnover_rate: number;
  monthly_breakdown: MonthlyBreakdown[];
  available_years: number[];
}

export interface ExitRow {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  date_of_joining?: string;
  relieving_date?: string;
  employment_type?: string;
  exit_interview?: string;
  interview_status?: string;
  interview_decision?: string;
  interview_date?: string;
}

export interface EmployeeInfo {
  name: string;
  employee_name: string;
  department?: string;
  designation?: string;
  date_of_joining?: string;
  relieving_date?: string;
  employment_type?: string;
  company?: string;
  reports_to?: string;
  cell_number?: string;
  personal_email?: string;
  company_email?: string;
  gender?: string;
  status?: string;
}

export interface ExitInterview {
  name: string;
  status?: string;
  date?: string;
  employee_status?: string;
  interview_summary?: string;
  relieving_date?: string;
}

export interface ExitDetail {
  employee: EmployeeInfo;
  exit_interview: ExitInterview | null;
}
