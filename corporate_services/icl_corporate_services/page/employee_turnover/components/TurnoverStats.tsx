import React from "react";
import { useTurnoverStats } from "./hooks/useTurnoverStats";

interface Props {
  year: number;
  onStatsLoaded?: (availableYears: number[]) => void;
}

function StatCard({
  label,
  value,
  sub,
  valueStyle,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="frappe-card et-stat-card">
      <div className="et-stat-label">{label}</div>
      <div className="et-stat-value" style={valueStyle}>
        {value}
      </div>
      {sub && <div className="et-stat-sub">{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="frappe-card et-stat-card">
      <div className="et-stat-skeleton" />
    </div>
  );
}

export function TurnoverStats({ year, onStatsLoaded }: Props) {
  const { stats, loading, error } = useTurnoverStats(year);

  React.useEffect(() => {
    if (stats?.available_years && onStatsLoaded) {
      onStatsLoaded(stats.available_years);
    }
  }, [stats]);

  if (loading) {
    return (
      <div className="et-stats-row">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger" style={{ fontSize: 13 }}>{error}</div>;
  }

  if (!stats) return null;

  const rate = stats.turnover_rate;
  const rateColor =
    rate > 20
      ? "var(--red-500, #e53e3e)"
      : rate > 10
      ? "var(--yellow-600, #d69e2e)"
      : "var(--green-600, #276749)";

  return (
    <div className="et-stats-row et-fade-in">
      <StatCard
        label="Turnover Rate"
        value={`${rate}%`}
        sub={`(${stats.employees_left} left ÷ ${stats.avg_headcount} avg) × 100`}
        valueStyle={{ color: rateColor, fontSize: 32 }}
      />
      <StatCard
        label="Employees Left"
        value={stats.employees_left}
        sub={`During ${year}`}
      />
      <StatCard
        label="Avg Headcount"
        value={stats.avg_headcount}
        sub="(Jan 1 + Dec 31) ÷ 2"
      />
      <StatCard
        label="Headcount - Jan 1"
        value={stats.headcount_start}
        sub={`Start of ${year}`}
      />
      <StatCard
        label="Headcount - Dec 31"
        value={stats.headcount_end}
        sub={`End of ${year}`}
      />
    </div>
  );
}
