import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {} from "react/jsx-runtime";

import { GlobalStyles } from "./ui/GlobalStyles";
import { PageSidebar } from "./PageSidebar";
import { StaffStats } from "./StaffStats";
import { OnLeaveCard } from "./OnLeaveCard";
import { EmployeeTable } from "./EmployeeTable";
import { EmployeeDetail } from "./EmployeeDetail";
import { StaffStats as StaffStatsType } from "./types";

declare global {
  interface Window {
    frappe: any;
    initStaffManagement?: (page?: any) => void;
    staffManagementSetRoute?: (id: string | null) => void;
  }
}

function StaffManagementApp({ page: _page }: { page: any }) {
  const [routeSegment, setRouteSegment] = useState<string | null>(() => {
    const route = (globalThis as any).frappe?.get_route?.() ?? [];
    return route[1] || null;
  });
  const [deptFilter, setDeptFilter] = useState("");
  const [sidebarStats, setSidebarStats] = useState<StaffStatsType | null>(null);

  useEffect(() => {
    (globalThis as any).staffManagementSetRoute = (id: string | null) => {
      setRouteSegment(id || null);
    };
    return () => {
      delete (globalThis as any).staffManagementSetRoute;
    };
  }, []);

  function openEmployee(employee: string) {
    (globalThis as any).frappe?.set_route("staff-management", employee);
    setRouteSegment(employee);
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("staff-management");
    setRouteSegment(null);
  }

  function handleDeptSelect(dept: string) {
    setDeptFilter(dept);
    if (routeSegment) {
      handleBack();
    }
  }

  const sidebarRoot = document.getElementById("staff-sidebar-root");

  return (
    <>
      <GlobalStyles />

      {sidebarRoot && (
        <PageSidebar
          departments={sidebarStats?.department_breakdown || []}
          totalActive={sidebarStats?.total_active || 0}
          activeDept={deptFilter}
          onSelect={handleDeptSelect}
          detailEmployee={routeSegment}
          onBack={handleBack}
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
                <h5 className="font-weight-bold mb-0">Staff Management</h5>
                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                  {deptFilter
                    ? `Showing: ${deptFilter}`
                    : "All active employees"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => (globalThis as any).frappe?.new_doc("Employee")}
              >
                + New Employee
              </button>
              <button>Employee Turnover</button>
            </div>

            <StaffStats onStatsLoaded={(s) => s && setSidebarStats(s)} />
            <OnLeaveCard onOpen={openEmployee} />
            <EmployeeTable deptFilter={deptFilter} onOpen={openEmployee} />
          </>
        )}
      </div>
    </>
  );
}

function mount(page: any) {
  const el = document.getElementById("staff-management-root");
  if (!el) return;
  createRoot(el).render(<StaffManagementApp page={page} />);
}

(globalThis as any).initStaffManagement = function initStaffManagement(
  page: any,
) {
  mount(page);
};
