import { useState, useEffect, useCallback, useRef } from "react";
import { EmployeeRow } from "../types";

const PAGE_SIZE = 25;

export function useEmployees(deptFilter: string) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (p: number, s: string, dept: string, empType: string) => {
      setLoading(true);
      setError(null);
      try {
        const r = await (globalThis as any).frappe.call({
          method: "corporate_services.api.staff_management.get_employees",
          args: {
            page: p,
            page_size: PAGE_SIZE,
            search: s,
            department: dept,
            employment_type: empType,
          },
        });
        setEmployees(r.message?.employees || []);
        setTotal(r.message?.total || 0);
      } catch (e: any) {
        setError(e?.message || "Failed to load employees");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [deptFilter, search, employmentType]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => load(page, search, deptFilter, employmentType),
      300
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [page, search, deptFilter, employmentType, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    employees,
    total,
    loading,
    error,
    page,
    totalPages,
    search,
    employmentType,
    setPage,
    setSearch: (s: string) => { setSearch(s); setPage(1); },
    setEmploymentType: (t: string) => { setEmploymentType(t); setPage(1); },
    refresh: () => load(page, search, deptFilter, employmentType),
  };
}
