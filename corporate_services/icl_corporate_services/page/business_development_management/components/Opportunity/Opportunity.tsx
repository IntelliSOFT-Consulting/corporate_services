import React from "react";

import { DashboardView, DetailView } from "./components";
import { useOpportunityData } from "./hooks";
import { getActiveOpenCount } from "./utils";

export function Opportunity() {
  const {
    stats,
    rows,
    total,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedId,
    setSelectedId,
    detail,
    detailLoading,
    workflowStates,
    detailTab,
    setDetailTab,
    sendingReminder,
    awarding,
    groupedChecklist,
    loadRows,
    loadStats,
    awardOpportunity,
    sendReminder,
  } = useOpportunityData();

  if (selectedId && detail) {
    return (
      <DetailView
        detail={detail}
        detailLoading={detailLoading}
        workflowStates={workflowStates}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        groupedChecklist={groupedChecklist}
        sendingReminder={sendingReminder}
        awarding={awarding}
        onBack={() => setSelectedId(null)}
        onAward={awardOpportunity}
        onSendReminder={sendReminder}
      />
    );
  }

  return (
    <DashboardView
      stats={stats}
      rows={rows}
      total={total}
      loading={loading}
      search={search}
      setSearch={setSearch}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      activeStatusCount={getActiveOpenCount(stats)}
      onRefresh={() => {
        loadRows();
        loadStats();
      }}
      onSelect={setSelectedId}
    />
  );
}
