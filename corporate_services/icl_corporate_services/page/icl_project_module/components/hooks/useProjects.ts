import { useState, useEffect, useCallback } from "react";
import { ProjectListResult, ProjectRow } from "../types";

const PAGE_LENGTH = 20;

export function useProjects() {
  const frappe = (globalThis as any).frappe;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [charts, setCharts] = useState<ProjectListResult["charts"]>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(
    async (currentPage: number, currentSearch: string, currentStatus: string) => {
      setLoading(true);
      setError(null);
      try {
        const r = await frappe.call({
          method: "corporate_services.api.project.get_projects",
          args: {
            page_length: PAGE_LENGTH,
            page: currentPage,
            search: currentSearch || null,
            status: currentStatus || null,
          },
        });
        const result: ProjectListResult = r?.message ?? { projects: [], total: 0, charts: {} };
        setProjects(result.projects);
        setTotal(result.total);
        setCharts(result.charts ?? {});
      } catch (e: any) {
        setError(e?.message || "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(page, search, statusFilter);
  }, [page, search, statusFilter, load]);

  const refresh = () => load(page, search, statusFilter);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_LENGTH);

  return {
    projects,
    total,
    charts,
    loading,
    error,
    page,
    totalPages,
    search,
    statusFilter,
    setPage,
    handleSearch,
    handleStatusFilter,
    refresh,
  };
}
