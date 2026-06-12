import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {} from "react/jsx-runtime";

import { GlobalStyles } from "./ui/GlobalStyles";
import { PageSidebar } from "./PageSidebar";
import { StaffStats } from "./StaffStats";
import { OnLeaveCard } from "./OnLeaveCard";
import { EmployeeTable } from "./EmployeeTable";
import { EmployeeDetail } from "./EmployeeDetail";
import { ConsultantTimeOffTab } from "./ConsultantTimeOffTab";
import { InternEvaluationTab } from "./InternEvaluationTab";
import { EmployeeTurnoverTab } from "./EmployeeTurnoverTab";
import { WeeklyProgressReportTab } from "./WeeklyProgressReportTab";
import { MonthlyReflectionTab } from "./MonthlyReflectionTab";
import { LeaveApplicationTab } from "./LeaveApplicationTab";
import { EmployeeOnboardingTab } from "./EmployeeOnboardingTab";
import { JobOpeningDashboardTab } from "./JobOpeningDashboardTab";
import { RecruitmentReportTab } from "./RecruitmentReportTab";
import { JobApplicationsTab } from "./JobApplicationsTab";
import { SurveyManagerTab } from "./SurveyManagerTab";
import { PerformanceAppraisalTab } from "./PerformanceAppraisalTab";

declare global {
  interface Window {
    frappe: any;
    initHRManagement?: (page?: any) => void;
    hrManagementSetRoute?: (id: string | null) => void;
  }
}

type Tab =
  | "dashboard"
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
  | "performance-appraisal"
  | "employee-turnover";

const DEFAULT_TAB: Tab = "dashboard";

function isValidTab(value: string | null): value is Tab {
  return (
    value === "dashboard" ||
    value === "consultant-time-off" ||
    value === "weekly-progress-report" ||
    value === "monthly-reflection" ||
    value === "leave-application" ||
    value === "employee-onboarding" ||
    value === "job-opening-dashboard" ||
    value === "recruitment-report" ||
    value === "job-applications" ||
    value === "survey-manager" ||
    value === "intern-evaluation" ||
    value === "performance-appraisal" ||
    value === "employee-turnover"
  );
}

function getTabFromUrl(): Tab | null {
  try {
    const params = new URLSearchParams(globalThis?.location?.search || "");
    const tab = params.get("tab");
    return isValidTab(tab) ? tab : null;
  } catch {
    return null;
  }
}

function writeTabToUrl(tab: Tab) {
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("tab", tab);
    globalThis.history.replaceState(globalThis.history.state, "", url.toString());
  } catch {
    // no-op
  }
}

function StaffManagementApp({ page: _page }: { page: any }) {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const fromUrl = getTabFromUrl();
    return fromUrl || DEFAULT_TAB;
  });
  const [routeSegment, setRouteSegment] = useState<string | null>(() => {
    const route = (globalThis as any).frappe?.get_route?.() ?? [];
    return route[1] || null;
  });

  useEffect(() => {
    (globalThis as any).hrManagementSetRoute = (id: string | null) => {
      setRouteSegment(id || null);
    };
    return () => {
      delete (globalThis as any).hrManagementSetRoute;
    };
  }, []);

  useEffect(() => {
    writeTabToUrl(activeTab);
  }, [activeTab]);

  function openEmployee(employee: string) {
    (globalThis as any).frappe?.set_route("hr-management", employee);
    setRouteSegment(employee);
    setTimeout(() => writeTabToUrl(activeTab), 0);
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("hr-management");
    setRouteSegment(null);
    setTimeout(() => writeTabToUrl(activeTab), 0);
  }

  const sidebarRoot = document.getElementById("hr-sidebar-root");

  return (
    <>
      <GlobalStyles />

      {sidebarRoot && (
        <PageSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}

      <div style={{ padding: "0 4px" }}>
        {routeSegment ? (
          <EmployeeDetail employee={routeSegment} onBack={handleBack} />
        ) : (
          <>
            <div
              className="d-flex align-items-center justify-content-between flex-wrap mb-3"
              style={{
                paddingBottom: 12,
                borderBottom: "1px solid var(--border-color, #e2e6ea)",
                marginTop: 4,
                gap: 10,
              }}
            >
              <div>
                <h5 className="font-weight-bold mb-0">HR Management</h5>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                  {activeTab === "dashboard"
                    ? "Unified HR operations dashboard"
                    : activeTab === "consultant-time-off"
                      ? "Consultant leave and time off tracker"
                      : activeTab === "weekly-progress-report"
                        ? "Weekly progress report dashboard"
                        : activeTab === "monthly-reflection"
                          ? "Monthly reflection dashboard"
                          : activeTab === "leave-application"
                            ? "Leave application dashboard"
                            : activeTab === "employee-onboarding"
                              ? "Employee onboarding dashboard"
                              : activeTab === "job-opening-dashboard"
                                ? "Job opening dashboard"
                              : activeTab === "recruitment-report"
                                ? "Recruitment reporting"
                                : activeTab === "job-applications"
                                  ? "Job applications management"
                                  : activeTab === "survey-manager"
                                    ? "Survey management"
                      : activeTab === "intern-evaluation"
                        ? "Intern evaluation dashboard"
                        : activeTab === "performance-appraisal"
                          ? "Performance appraisal cycles"
                          : "Employee turnover dashboard"}
                </p>
              </div>
              <div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginRight: "8px" }}
                  onClick={() =>
                    (globalThis as any).frappe?.new_doc("Employee")
                  }
                >
                  + New Employee
                </button>
              </div>
            </div>

            {activeTab === "dashboard" && (
              <>
                <StaffStats />
                <OnLeaveCard onOpen={openEmployee} />
                <EmployeeTable deptFilter="" onOpen={openEmployee} />
              </>
            )}

            {activeTab === "consultant-time-off" && <ConsultantTimeOffTab />}
            {activeTab === "weekly-progress-report" && <WeeklyProgressReportTab />}
            {activeTab === "monthly-reflection" && <MonthlyReflectionTab />}
            {activeTab === "leave-application" && <LeaveApplicationTab />}
            {activeTab === "employee-onboarding" && <EmployeeOnboardingTab />}
            {activeTab === "job-opening-dashboard" && <JobOpeningDashboardTab />}
            {activeTab === "recruitment-report" && <RecruitmentReportTab />}
            {activeTab === "job-applications" && <JobApplicationsTab />}
            {activeTab === "survey-manager" && <SurveyManagerTab />}
            {activeTab === "intern-evaluation" && <InternEvaluationTab />}
            {activeTab === "performance-appraisal" && <PerformanceAppraisalTab />}
            {activeTab === "employee-turnover" && <EmployeeTurnoverTab />}
          </>
        )}
      </div>
    </>
  );
}

function mount(page: any) {
  const el = document.getElementById("hr-management-root");
  if (!el) return;
  createRoot(el).render(<StaffManagementApp page={page} />);
}

(globalThis as any).initHRManagement = function initHRManagement(
  page: any,
) {
  mount(page);
};
