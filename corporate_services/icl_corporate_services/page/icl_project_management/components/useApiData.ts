import { useEffect, useState } from "react";

export function useApiData<T>(method: string, args: Record<string, any> | null = null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    globalThis.frappe
      .call({ method, args: args || undefined })
      .then((r: any) => { setData(r?.message ?? null); setLoading(false); })
      .catch((e: any) => { setError(e?.message || "Failed to load."); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}
