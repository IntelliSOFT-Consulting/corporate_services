import { useState, useEffect, useCallback } from "react";
import { OpportunityRow } from "../types";

const PAGE_LENGTH = 20;

interface ExternalFilters {
  status?: string;
  opportunityFrom?: string;
  workflowState?: string;
}

export function useOpportunities(external: ExternalFilters = {}) {
  const frappe = (globalThis as any).frappe;

  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(external.status ?? "");
  const [fromFilter, setFromFilter] = useState(external.opportunityFrom ?? "");
  const [workflowFilter, setWorkflowFilter] = useState(external.workflowState ?? "");

  useEffect(() => { setStatusFilter(external.status ?? ""); setPage(1); }, [external.status]);
  useEffect(() => { setFromFilter(external.opportunityFrom ?? ""); setPage(1); }, [external.opportunityFrom]);
  useEffect(() => { setWorkflowFilter(external.workflowState ?? ""); setPage(1); }, [external.workflowState]);

  const load = useCallback(
    async (currentPage: number, currentSearch: string, currentStatus: string, currentFrom: string, currentWorkflow: string) => {
      setLoading(true);
      setError(null);
      try {
        const r = await frappe.call({
          method: "corporate_services.api.opportunity.get_opportunities",
          args: {
            page_length: PAGE_LENGTH,
            page: currentPage,
            search: currentSearch || null,
            status: currentStatus || null,
            opportunity_from: currentFrom || null,
            workflow_state: currentWorkflow || null,
          },
        });
        const result = r?.message ?? { opportunities: [], total: 0 };
        setOpportunities(result.opportunities);
        setTotal(result.total);
      } catch (e: any) {
        setError(e?.message || "Failed to load opportunities.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(page, search, statusFilter, fromFilter, workflowFilter);
  }, [page, search, statusFilter, fromFilter, workflowFilter, load]);

  const refresh = () => load(page, search, statusFilter, fromFilter, workflowFilter);

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
    opportunities,
    total,
    loading,
    error,
    page,
    totalPages,
    search,
    statusFilter,
    fromFilter,
    setPage,
    handleSearch,
    handleStatusFilter,
    refresh,
  };
}
