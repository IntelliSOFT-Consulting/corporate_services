import { useState, useEffect } from "react";
import { ProjectDetail } from "../types";

export function useProjectDetail(name: string | null) {
  const frappe = (globalThis as any).frappe;

  const [doc, setDoc] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          method: "corporate_services.api.project.get_project",
          args: { name },
        });
        if (!cancelled) setDoc(r?.message ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { doc, loading, error };
}
