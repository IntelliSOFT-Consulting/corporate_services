import { useState, useEffect, useCallback } from "react";
import { ProjectRow } from "../types";

export function useSidebarList() {
  const frappe = (globalThis as any).frappe;

  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (currentSearch: string) => {
    setLoading(true);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.project.get_projects",
        args: {
          page_length: 100,
          page: 1,
          search: currentSearch || null,
          status: null,
        },
      });
      setItems(r?.message?.projects ?? []);
    } catch {
      // silently fail - sidebar is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(search);
  }, [search, load]);

  return { items, loading, search, setSearch };
}
