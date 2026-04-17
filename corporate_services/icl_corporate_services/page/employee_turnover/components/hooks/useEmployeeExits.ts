import { useState, useEffect, useCallback, useRef } from "react";
import { ExitRow } from "../types";

const PAGE_SIZE = 20;

export function useEmployeeExits({ year }: { year: number }) {
  const [exits, setExits] = useState<ExitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, s: string, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await (globalThis as any).frappe.call({
        method: "corporate_services.api.employee_turnover.get_employee_exits",
        args: { year: y, page: p, page_size: PAGE_SIZE, search: s },
      });
      setExits(r.message?.exits || []);
      setTotal(r.message?.total || 0);
    } catch (e: any) {
      setError(e?.message || "Failed to load exits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [year]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(page, search, year), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [page, search, year, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(s: string) {
    setSearch(s);
    setPage(1);
  }

  function refresh() {
    load(page, search, year);
  }

  return { exits, total, loading, error, page, totalPages, search, setPage, handleSearch, refresh };
}
