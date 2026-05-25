import { useEffect, useMemo, useState } from "react";
import type { OpportunityDetail, OpportunityRow, OpportunityStats, WorkflowStateInfo } from "./types";

export function useOpportunityData() {
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [rows, setRows] = useState<OpportunityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [workflowStates, setWorkflowStates] = useState<WorkflowStateInfo[]>([]);
  const [detailTab, setDetailTab] = useState<"overview" | "finance" | "checklist">("overview");
  const [checklist, setChecklist] = useState<any | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [awarding, setAwarding] = useState(false);

  async function loadStats() {
    const res = await (frappe as any).call({ method: "corporate_services.api.opportunity.get_opportunity_stats" });
    setStats(res?.message || { by_status: [], by_opportunity_from: [], by_workflow_state: [], total: 0 });
  }

  async function loadRows() {
    setLoading(true);
    try {
      const res = await (frappe as any).call({
        method: "corporate_services.api.opportunity.get_opportunities",
        args: {
          page_length: 100,
          page: 1,
          search: search || null,
          status: statusFilter || null,
          opportunity_from: fromFilter || null,
          workflow_state: workflowFilter || null,
        },
      });
      setRows(res?.message?.opportunities || []);
      setTotal(res?.message?.total || 0);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(name: string) {
    setDetailLoading(true);
    try {
      const [detailRes, wfRes, checklistRes] = await Promise.all([
        (frappe as any).call({ method: "corporate_services.api.opportunity.get_opportunity", args: { name } }),
        (frappe as any).call({ method: "corporate_services.api.opportunity.get_workflow_states" }),
        (frappe as any).call({ method: "corporate_services.api.opportunity.get_opportunity_checklist", args: { opportunity_name: name } }),
      ]);
      setDetail(detailRes?.message || null);
      setWorkflowStates((wfRes?.message?.states || []) as WorkflowStateInfo[]);
      setChecklist(checklistRes?.message || null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function awardOpportunity() {
    if (!selectedId) return;
    if (!window.confirm(`Award opportunity "${selectedId}" and create a project?`)) return;
    setAwarding(true);
    try {
      await (frappe as any).call({ method: "corporate_services.api.opportunity.award_opportunity", args: { name: selectedId } });
      await loadDetail(selectedId);
      (frappe as any).show_alert({ message: "Opportunity awarded successfully", indicator: "green" }, 5);
    } finally {
      setAwarding(false);
    }
  }

  async function sendReminder() {
    if (!selectedId) return;
    setSendingReminder(true);
    try {
      await (frappe as any).call({
        method: "corporate_services.api.notification.opportunity.v1.send_manual_due_reminder",
        args: { opportunity_name: selectedId },
      });
      await loadDetail(selectedId);
      (frappe as any).show_alert({ message: "Due reminder sent", indicator: "green" }, 5);
    } finally {
      setSendingReminder(false);
    }
  }

  const groupedChecklist = useMemo(() => {
    const bySection: Record<string, any[]> = {};
    (checklist?.items || []).forEach((item: any) => {
      const section = item.proposal_section || "General";
      if (!bySection[section]) bySection[section] = [];
      bySection[section].push(item);
    });
    return bySection;
  }, [checklist]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadRows();
  }, [search, statusFilter, fromFilter, workflowFilter]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  return {
    stats,
    rows,
    total,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    fromFilter,
    setFromFilter,
    workflowFilter,
    setWorkflowFilter,
    selectedId,
    setSelectedId,
    detail,
    detailLoading,
    workflowStates,
    detailTab,
    setDetailTab,
    checklist,
    sendingReminder,
    awarding,
    groupedChecklist,
    loadRows,
    loadStats,
    awardOpportunity,
    sendReminder,
  };
}
