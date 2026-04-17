import { useState, useEffect } from "react";
import { ExitDetail } from "../types";

export function useExitDetail(employee: string) {
  const [data, setData] = useState<ExitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (globalThis as any).frappe
      .call({
        method: "corporate_services.api.employee_turnover.get_exit_detail",
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
          setError(e?.message || "Failed to load exit detail");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [employee]);

  return { data, loading, error };
}
