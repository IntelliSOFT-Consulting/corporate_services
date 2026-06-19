export function formatCurrency(amount?: number) {
  if (amount == null) return null;
  return Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateOrDash(date?: string) {
  return formatDate(date) ?? "-";
}
