import { useState, useEffect } from "react";
import { ExitRow } from "../types";

export function useSidebarExits({ year }: { year: number }) {
  const [exits, setExits] = useState<ExitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (globalThis as any).frappe
      .call({
        method: "corporate_services.api.employee_turnover.get_employee_exits",
        args: { year, page: 1, page_size: 200, search: "" },
      })
      .then((r: any) => {
        if (!cancelled) {
          setExits(r.message?.exits || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  return { exits, loading };
}
