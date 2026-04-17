import React from "react";
import { useStaffStats } from "./hooks/useStaffStats";

interface Props {
  onStatsLoaded?: (stats: ReturnType<typeof useStaffStats>["stats"]) => void;
}

function StatCard({
  label,
  value,
  sub,
  color,
  loading,
}: {
  label: string;
  value?: string | number;
  sub?: string;
  color?: string;
  loading?: boolean;
}) {
  return (
    <div className="col-xl col-md-3 col-sm-6 mb-3">
      <div className="frappe-card p-3 h-100">
        {loading ? (
          <div className="sm-skeleton" />
        ) : (
          <>
            <div className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </div>
            <div className="sm-stat-value" style={color ? { color } : {}}>
              {value ?? "-"}
            </div>
            {sub && (
              <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                {sub}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function StaffStats({ onStatsLoaded }: Props) {
  const { stats, loading } = useStaffStats();

  React.useEffect(() => {
    if (stats && onStatsLoaded) onStatsLoaded(stats);
  }, [stats]);

  return (
    <div className="row sm-fade-in">
      <StatCard
        label="Total Active Employees"
        value={stats?.total_active}
        sub="Currently employed"
        loading={loading}
      />
      <StatCard
        label="New This Month"
        value={stats?.new_this_month}
        sub="Joined this month"
        color="var(--green-600, #276749)"
        loading={loading}
      />
      <StatCard
        label="On Leave Today"
        value={stats?.on_leave_today}
        sub="Approved leave"
        color={stats?.on_leave_today ? "var(--orange-500, #dd6b20)" : undefined}
        loading={loading}
      />
      <StatCard
        label="Departments"
        value={stats?.dept_count}
        sub="Active departments"
        loading={loading}
      />
    </div>
  );
}
