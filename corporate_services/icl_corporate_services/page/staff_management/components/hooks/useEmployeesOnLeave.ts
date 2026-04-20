import { useState, useEffect } from "react";
import { OnLeaveRow } from "../types";

export function useEmployeesOnLeave() {
  const [leaves, setLeaves] = useState<OnLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (globalThis as any).frappe
      .call({ method: "corporate_services.api.staff_management.get_employees_on_leave" })
      .then((r: any) => {
        setLeaves(r.message || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { leaves, loading };
}
