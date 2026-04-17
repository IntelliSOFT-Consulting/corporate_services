import { useState, useEffect } from "react";
import { EmployeeProfile } from "../types";

export function useEmployeeProfile(employee: string) {
  const [data, setData] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (globalThis as any).frappe
      .call({
        method: "corporate_services.api.staff_management.get_employee_profile",
        args: { employee },
      })
      .then((r: any) => {
        if (!cancelled) {
          setData(r.message);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load employee profile");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [employee]);

  return { data, loading, error };
}
