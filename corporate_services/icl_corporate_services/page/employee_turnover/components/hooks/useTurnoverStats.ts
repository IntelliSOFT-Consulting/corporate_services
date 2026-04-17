import { useState, useEffect } from "react";
import { TurnoverStats } from "../types";

export function useTurnoverStats(year: number) {
  const [stats, setStats] = useState<TurnoverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (globalThis as any).frappe
      .call({
        method: "corporate_services.api.employee_turnover.get_turnover_stats",
        args: { year },
      })
      .then((r: any) => {
        if (!cancelled) {
          setStats(r.message);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load turnover stats");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  return { stats, loading, error };
}
