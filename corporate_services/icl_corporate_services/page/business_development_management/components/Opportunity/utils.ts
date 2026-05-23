import type { OpportunityStats } from "./types";

export function formatDate(value?: string) {
  if (!value) return "-";
  return (frappe as any).datetime.str_to_user(value);
}

export function formatMoney(value?: number, currency?: string) {
  if (value == null) return "-";
  const cur = currency || "KES";
  return `${cur} ${Number(value).toLocaleString()}`;
}

export function statusColor(status?: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("open")) return "blue";
  if (s.includes("approved") || s.includes("converted") || s.includes("awarded")) return "green";
  if (s.includes("rejected") || s.includes("lost") || s.includes("cancelled")) return "red";
  if (s.includes("draft")) return "gray";
  return "orange";
}

export function getActiveOpenCount(stats: OpportunityStats | null) {
  if (!stats) return 0;
  return stats.by_status.reduce((sum, x) => sum + (x.status === "Open" ? Number(x.count) : 0), 0);
}
