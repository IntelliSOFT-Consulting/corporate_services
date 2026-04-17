import { useState, useEffect } from "react";

export type StatusStat = { status: string; count: number };
export type FromStat = { opportunity_from: string; count: number };
export type WorkflowStat = { workflow_state: string; count: number };

export type OpportunityStats = {
  by_status: StatusStat[];
  by_opportunity_from: FromStat[];
  by_workflow_state: WorkflowStat[];
  total: number;
};

export function useOpportunityStats() {
  const frappe = (globalThis as any).frappe;

  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await frappe.call({
          method: "corporate_services.api.opportunity.get_opportunity_stats",
        });
        setStats(
          r?.message ?? { by_status: [], by_opportunity_from: [], by_workflow_state: [], total: 0 }
        );
      } catch (e: any) {
        setError(e?.message || "Failed to load stats.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { stats, loading, error };
}
