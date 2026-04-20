import { useState, useEffect } from "react";
import { StaffStats } from "../types";

export function useStaffStats() {
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    (globalThis as any).frappe
      .call({ method: "corporate_services.api.staff_management.get_staff_stats" })
      .then((r: any) => {
        setStats(r.message);
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "Failed to load stats");
        setLoading(false);
      });
  }

  useEffect(() => { load(); }, []);

  return { stats, loading, error, reload: load };
}
