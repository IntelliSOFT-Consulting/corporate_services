import React from "react";
import { createPortal } from "react-dom";
import { useEmployeeProfile } from "./hooks/useEmployeeProfile";

interface ListProps {
  activeTab:
    | "overview"
    | "consultant-time-off"
    | "weekly-progress-report"
    | "monthly-reflection"
    | "leave-application"
    | "employee-onboarding"
    | "job-opening-dashboard"
    | "recruitment-report"
    | "job-applications"
    | "survey-manager"
    | "intern-evaluation"
    | "employee-turnover";
  onTabChange: (
    tab:
      | "overview"
      | "consultant-time-off"
      | "weekly-progress-report"
      | "monthly-reflection"
      | "leave-application"
      | "employee-onboarding"
      | "job-opening-dashboard"
      | "recruitment-report"
      | "job-applications"
      | "survey-manager"
      | "intern-evaluation"
      | "employee-turnover"
  ) => void;
}

interface DetailProps {
  employee: string;
  onBack: () => void;
}

type Props = ListProps & { detailEmployee?: string | null; onBack?: () => void };

function NavLink({
  label,
  icon,
  onClick,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  count?: number;
}) {
  return (
    <div className="sm-sidebar-item" onClick={onClick}>
      <span className="d-flex align-items-center" style={{ gap: 8, flex: 1 }}>
        <span className="text-muted">{icon}</span>
        <span className="sm-sidebar-item-name">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <span className="sm-sidebar-item-count">{count}</span>
      )}
    </div>
  );
}

function DetailSidebar({ employee, onBack }: DetailProps) {
  const frappe = (globalThis as any).frappe;
  const { data } = useEmployeeProfile(employee);

  const counts = {
    leaveAllocations: data?.leave_allocations?.length ?? 0,
    leaveApplications: data?.leave_applications?.length ?? 0,
    travelRequests: data?.travel_requests?.length ?? 0,
    travelReconciliations: data?.travel_reconciliations?.length ?? 0,
    timesheetSubmissions: data?.timesheet_submissions?.length ?? 0,
    assetRequisitions: data?.asset_requisitions?.length ?? 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sm-sidebar-header">
        <button
          type="button"
          className="btn btn-default btn-xs w-100 text-left d-flex align-items-center"
          style={{ gap: 6 }}
          onClick={onBack}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All Staff
        </button>
        <div className="text-muted mt-2" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {employee}
        </div>
      </div>

      <div className="sm-sidebar-list">
        <div className="px-2 pt-2 pb-1">
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Leave
          </span>
        </div>

        <NavLink
          label="Leave Allocations"
          count={counts.leaveAllocations}
          onClick={() => frappe?.set_route("List", "Leave Allocation", { employee })}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <NavLink
          label="Leave Applications"
          count={counts.leaveApplications}
          onClick={() => frappe?.set_route("List", "Leave Application", { employee })}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          }
        />

        <div className="px-2 pt-3 pb-1">
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Travel
          </span>
        </div>

        <NavLink
          label="Travel Requests"
          count={counts.travelRequests}
          onClick={() => frappe?.set_route("List", "Travel Request", { employee })}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          }
        />
        <NavLink
          label="Travel Reconciliations"
          count={counts.travelReconciliations}
          onClick={() => frappe?.set_route("List", "Travel Request Reconciliation", { employee })}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />

        <div className="px-2 pt-3 pb-1">
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Timesheets
          </span>
        </div>

        <NavLink
          label="Timesheet Submissions"
          count={counts.timesheetSubmissions}
          onClick={() => frappe?.set_route("timesheet_workflow", "employee", employee)}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="12" y2="18" />
            </svg>
          }
        />

        <div className="px-2 pt-3 pb-1">
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Assets
          </span>
        </div>

        <NavLink
          label="Asset Requisitions"
          count={counts.assetRequisitions}
          onClick={() => frappe?.set_route("List", "Asset Requisition", { requested_by: employee })}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          }
        />

        <div className="px-2 pt-3 pb-1">
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Record
          </span>
        </div>

        <NavLink
          label="Open Employee Form"
          onClick={() => frappe?.set_route("Form", "Employee", employee)}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function ListSidebar({ activeTab, onTabChange }: ListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sm-sidebar-header">
        <p className="sm-sidebar-title">Dashboard</p>
      </div>
      <div className="sm-sidebar-list">
        <div
          className={`sm-sidebar-item${activeTab === "overview" ? " active" : ""}`}
          onClick={() => onTabChange("overview")}
        >
          <span className="sm-sidebar-item-name">Overview</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "consultant-time-off" ? " active" : ""}`}
          onClick={() => onTabChange("consultant-time-off")}
        >
          <span className="sm-sidebar-item-name">Consultant Time Off</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "weekly-progress-report" ? " active" : ""}`}
          onClick={() => onTabChange("weekly-progress-report")}
        >
          <span className="sm-sidebar-item-name">Weekly Progress Report</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "monthly-reflection" ? " active" : ""}`}
          onClick={() => onTabChange("monthly-reflection")}
        >
          <span className="sm-sidebar-item-name">Monthly Reflection</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "leave-application" ? " active" : ""}`}
          onClick={() => onTabChange("leave-application")}
        >
          <span className="sm-sidebar-item-name">Leave Application</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "employee-onboarding" ? " active" : ""}`}
          onClick={() => onTabChange("employee-onboarding")}
        >
          <span className="sm-sidebar-item-name">Employee Onboarding</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "job-opening-dashboard" ? " active" : ""}`}
          onClick={() => onTabChange("job-opening-dashboard")}
        >
          <span className="sm-sidebar-item-name">Job Opening Dashboard</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "recruitment-report" ? " active" : ""}`}
          onClick={() => onTabChange("recruitment-report")}
        >
          <span className="sm-sidebar-item-name">Recruitment Report</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "job-applications" ? " active" : ""}`}
          onClick={() => onTabChange("job-applications")}
        >
          <span className="sm-sidebar-item-name">Job Applications</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "survey-manager" ? " active" : ""}`}
          onClick={() => onTabChange("survey-manager")}
        >
          <span className="sm-sidebar-item-name">Survey Manager</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "intern-evaluation" ? " active" : ""}`}
          onClick={() => onTabChange("intern-evaluation")}
        >
          <span className="sm-sidebar-item-name">Intern Evaluation</span>
        </div>
        <div
          className={`sm-sidebar-item${activeTab === "employee-turnover" ? " active" : ""}`}
          onClick={() => onTabChange("employee-turnover")}
        >
          <span className="sm-sidebar-item-name">Employee Turnover</span>
        </div>
      </div>
    </div>
  );
}

export function PageSidebar({ detailEmployee, onBack, ...listProps }: Props) {
  const sidebarRoot = document.getElementById("staff-sidebar-root");
  if (!sidebarRoot) return null;

  const content = detailEmployee ? (
    <DetailSidebar employee={detailEmployee} onBack={onBack!} />
  ) : (
    <ListSidebar {...listProps} />
  );

  return createPortal(content, sidebarRoot);
}
