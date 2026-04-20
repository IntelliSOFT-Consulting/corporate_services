import { useState, useEffect } from "react";
import { OpportunityDetail } from "../types";

export function useOpportunityDetail(name: string | null) {
  const frappe = (globalThis as any).frappe;

  const [doc, setDoc] = useState<OpportunityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!name) {
      setDoc(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setDoc(null);
      try {
        const r = await frappe.call({
          method: "corporate_services.api.opportunity.get_opportunity",
          args: { name },
        });
        if (!cancelled) setDoc(r?.message ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load opportunity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [name, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  return { doc, loading, error, reload };
}
