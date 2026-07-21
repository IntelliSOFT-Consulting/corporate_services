export function formatMonthYearLabel(monthYear) {
    if (!monthYear || typeof monthYear !== "string") return "";
    const [mm, yyyy] = monthYear.split("-");
    const monthNum = parseInt(mm, 10);
    const yearNum = parseInt(yyyy, 10);
    if (!monthNum || monthNum < 1 || monthNum > 12 || !yearNum) return monthYear;
    const dt = new Date(yearNum, monthNum - 1, 1);
    return `${dt.toLocaleString("en-US", { month: "long" })} ${yearNum}`;
}
