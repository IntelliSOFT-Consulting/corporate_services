import React, { useEffect, useRef } from "react";

// Fixed categorical palette (validated for CVD-safe adjacent contrast). Assigned
// by status NAME, not by position, so a status keeps its color as filters change.
const STATUS_COLORS = {
    Open: "#2a78d6",
    Working: "#eb6834",
    "Pending Review": "#eda100",
    Overdue: "#e34948",
    Completed: "#1baf7a",
    Cancelled: "#4a3aa7",
};
const STATUS_FALLBACK_COLORS = ["#e87ba4", "#008300", "#4a3aa7"];

// Priority is an ordered tier (Low -> Urgent), so it gets one hue stepped
// light -> dark (ordinal ramp) rather than distinct categorical hues.
const PRIORITY_ORDER = ["Low", "Medium", "High", "Urgent"];
const PRIORITY_RAMP = {
    Low: "#86b6ef",
    Medium: "#3987e5",
    High: "#1c5cab",
    Urgent: "#0d366b",
};

// Single sequential hue for magnitude comparisons (sprint/project/assignee bars).
const SEQUENTIAL_BLUE = "#2a78d6";

const MAX_ASSIGNEE_BARS = 10;

function statusColor(label, fallbackIndex) {
    return STATUS_COLORS[label] || STATUS_FALLBACK_COLORS[fallbackIndex % STATUS_FALLBACK_COLORS.length];
}

function sortByPriorityOrder(priorityCounts) {
    return [...priorityCounts].sort((a, b) => {
        const ai = PRIORITY_ORDER.indexOf(a.label);
        const bi = PRIORITY_ORDER.indexOf(b.label);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    });
}

function FrappeChartPanel({ title, subtitle, type, labels, values, colors, height = 220 }) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current && typeof chartRef.current.destroy === "function") {
            chartRef.current.destroy();
            chartRef.current = null;
        }
        if (!containerRef.current || !labels.length) return;

        chartRef.current = new frappe.Chart(containerRef.current, {
            data: { labels, datasets: [{ values }] },
            type,
            height,
            colors,
        });

        return () => {
            if (chartRef.current && typeof chartRef.current.destroy === "function") {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, JSON.stringify(labels), JSON.stringify(values), JSON.stringify(colors), height]);

    return (
        <div className="dw-chart-panel">
            <div className="dw-chart-title">
                {title}
                {subtitle && <span className="dw-chart-subtitle">{subtitle}</span>}
            </div>
            {labels.length ? <div ref={containerRef} /> : <div className="dw-empty">No data to chart.</div>}
        </div>
    );
}

export default function DevWorkspaceCharts({ stats, showProjectChart }) {
    const statusCounts = stats?.status_counts || [];
    const sprintCounts = stats?.sprint_counts || [];
    const projectCounts = stats?.project_counts || [];
    const priorityCounts = sortByPriorityOrder(stats?.priority_counts || []);
    const assigneeCountsAll = stats?.assignee_counts || [];
    const assigneeCounts = assigneeCountsAll.slice(0, MAX_ASSIGNEE_BARS);
    const isAllView = !!stats?.is_all_view;

    return (
        <div className="dw-charts-grid">
            <FrappeChartPanel
                title="Tasks by Status"
                type="pie"
                labels={statusCounts.map((s) => s.label)}
                values={statusCounts.map((s) => s.count)}
                colors={statusCounts.map((s, i) => statusColor(s.label, i))}
            />
            <FrappeChartPanel
                title="Tasks by Priority"
                type="percentage"
                labels={priorityCounts.map((s) => s.label)}
                values={priorityCounts.map((s) => s.count)}
                colors={priorityCounts.map((s) => PRIORITY_RAMP[s.label] || SEQUENTIAL_BLUE)}
            />
            <FrappeChartPanel
                title="Tasks by Sprint"
                type="bar"
                labels={sprintCounts.map((s) => s.label)}
                values={sprintCounts.map((s) => s.count)}
                colors={[SEQUENTIAL_BLUE]}
            />
            {showProjectChart && (
                <FrappeChartPanel
                    title="Tasks by Project"
                    type="bar"
                    labels={projectCounts.map((s) => s.label)}
                    values={projectCounts.map((s) => s.count)}
                    colors={[SEQUENTIAL_BLUE]}
                />
            )}
            {isAllView && (
                <FrappeChartPanel
                    title="Workload by Assignee"
                    subtitle={
                        assigneeCountsAll.length > MAX_ASSIGNEE_BARS
                            ? `Top ${MAX_ASSIGNEE_BARS} of ${assigneeCountsAll.length}`
                            : null
                    }
                    type="bar"
                    labels={assigneeCounts.map((s) => s.label)}
                    values={assigneeCounts.map((s) => s.count)}
                    colors={[SEQUENTIAL_BLUE]}
                />
            )}
        </div>
    );
}
