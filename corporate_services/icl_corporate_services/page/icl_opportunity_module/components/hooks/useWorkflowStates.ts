import { useState, useEffect } from "react";
import { WorkflowState } from "../types";

type WorkflowInfo = { states: WorkflowState[]; state_field: string };

// Cache so we only fetch once per page session
let cached: WorkflowInfo | null = null;

export function useWorkflowStates() {
  const frappe = (globalThis as any).frappe;
  const [info, setInfo] = useState<WorkflowInfo | null>(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    const load = async () => {
      try {
        const r = await frappe.call({
          method: "corporate_services.api.opportunity.get_workflow_states",
        });
        const data: WorkflowInfo = r?.message ?? { states: [], state_field: "workflow_state" };
        cached = data;
        setInfo(data);
      } catch {
        setInfo({ states: [], state_field: "workflow_state" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { info, loading };
}
