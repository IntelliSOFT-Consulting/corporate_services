import React, { useState } from "react";
import { GlobalStyles as ETGlobalStyles } from "./turnover/ui/GlobalStyles";
import { Header } from "./turnover/Header";
import { TurnoverStats } from "./turnover/TurnoverStats";
import { TurnoverChart } from "./turnover/TurnoverChart";
import { ExitTable } from "./turnover/ExitTable";

export function EmployeeTurnoverTab() {
  const currentYear = new Date().getFullYear();
  const defaultYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [year, setYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState<number[]>(defaultYears);

  function openExit(employee: string, _employeeName?: string, exitInterviewId?: string | null) {
    const frappe = (globalThis as any).frappe;
    if (exitInterviewId) {
      frappe?.set_route("Form", "Exit Interview", exitInterviewId);
      return;
    }
    frappe?.set_route("Form", "Employee", employee);
  }

  return (
    <div className="frappe-card p-3">
      <ETGlobalStyles />
      <Header year={year} onYearChange={setYear} availableYears={availableYears} />
      <TurnoverStats
        year={year}
        onStatsLoaded={(years) => {
          if (years.length > 0) setAvailableYears(years);
        }}
      />
      <TurnoverChart year={year} />
      <ExitTable year={year} onOpen={(emp, name, exitId) => openExit(emp, name, exitId)} />
    </div>
  );
}
