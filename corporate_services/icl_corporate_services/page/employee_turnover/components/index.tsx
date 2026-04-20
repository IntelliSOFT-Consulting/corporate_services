import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { GlobalStyles } from "./ui/GlobalStyles";
import { Header } from "./Header";
import { TurnoverStats } from "./TurnoverStats";
import { TurnoverChart } from "./TurnoverChart";
import { ExitTable } from "./ExitTable";
import { ExitDetail } from "./ExitDetail";
import { TurnoverSidebar } from "./TurnoverSidebar";

declare global {
  interface Window {
    frappe: any;
    initEmployeeTurnover?: (page?: any) => void;
    employeeTurnoverSetRoute?: (id: string | null) => void;
  }
}

function EmployeeTurnoverApp({ page: _page }: { page: any }) {
  const currentYear = new Date().getFullYear();
  const defaultYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [year, setYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>(defaultYears);
  const [routeSegment, setRouteSegment] = useState<string | null>(() => {
    const route = (globalThis as any).frappe?.get_route?.() ?? [];
    return route[1] || null;
  });
  const [selectedName, setSelectedName] = useState<string | undefined>(undefined);
  const [selectedExitId, setSelectedExitId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    (globalThis as any).employeeTurnoverSetRoute = (id: string | null) => {
      setRouteSegment(id || null);
      if (!id) {
        setSelectedName(undefined);
        setSelectedExitId(undefined);
      }
    };
    return () => {
      delete (globalThis as any).employeeTurnoverSetRoute;
    };
  }, []);

  function openExit(employee: string, employeeName?: string, exitInterviewId?: string | null) {
    (globalThis as any).frappe?.set_route("employee-turnover", employee);
    setRouteSegment(employee);
    setSelectedName(employeeName);
    setSelectedExitId(exitInterviewId ?? undefined);
  }

  function handleBack() {
    (globalThis as any).frappe?.set_route("employee-turnover");
    setRouteSegment(null);
    setSelectedName(undefined);
    setSelectedExitId(undefined);
  }

  const sidebarRoot = document.getElementById("et-sidebar-root");

  return (
    <>
      <GlobalStyles />

      {sidebarRoot && (
        <TurnoverSidebar
          year={year}
          activeEmployee={routeSegment}
          activeEmployeeName={selectedName}
          activeExitInterviewId={selectedExitId}
          onOpen={(emp) => openExit(emp)}
          onBack={handleBack}
        />
      )}

      <div className="et-app-wrap">
        {routeSegment ? (
          <ExitDetail
            employee={routeSegment}
            onBack={handleBack}
            onDataLoaded={(name, exitId) => {
              setSelectedName(name);
              setSelectedExitId(exitId);
            }}
          />
        ) : (
          <>
            <Header
              year={year}
              onYearChange={setYear}
              availableYears={availableYears}
            />
            <TurnoverStats
              year={year}
              onStatsLoaded={(years) => {
                if (years.length > 0) setAvailableYears(years);
              }}
            />
            <TurnoverChart year={year} />
            <ExitTable year={year} onOpen={(emp, name, exitId) => openExit(emp, name, exitId)} />
          </>
        )}
      </div>
    </>
  );
}

function mount(page: any) {
  const el = document.getElementById("employee-turnover-root");
  if (!el) return;
  createRoot(el).render(<EmployeeTurnoverApp page={page} />);
}

(globalThis as any).initEmployeeTurnover = function initEmployeeTurnover(
  page: any
) {
  mount(page);
};
