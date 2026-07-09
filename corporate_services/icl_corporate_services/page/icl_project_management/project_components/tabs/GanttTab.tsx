import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Gantt from "frappe-gantt";
import "../styles/frappe-gantt.css";
import { frappeCall, showAlert } from "../utils/frappe";

const PHASE_COLORS = [
  "#4dabf7", "#69db7c", "#ffd43b", "#ff8787",
  "#cc5de8", "#f783ac", "#74c0fc", "#a9e34b",
  "#ff922b", "#20c997", "#5c7cfa", "#e64980",
];

const STATUS_PROGRESS: Record<string, number> = {
  completed: 100, done: 100,
  "in progress": 50, ongoing: 50,
  delayed: 30, overdue: 30,
  "not started": 0, pending: 0,
};

type ViewMode = "Week" | "Month" | "Year";

interface DetailedRow {
  name: string;
  item?: string;
  activities?: string;
  resources?: string;
  duration_loe?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface Props {
  projectId: string;
}

function phaseClass(phase: string) {
  return "gantt-phase-" + phase.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export function GanttTab({ projectId }: Props) {
  const [rows, setRows] = useState<DetailedRow[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("Week");
  const [baseline, setBaseline] = useState<Record<string, { start: string; end: string }>>({});
  const [showBaseline, setShowBaseline] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    (globalThis as any).frappe
      .call({
        method:
          "corporate_services.icl_corporate_services.doctype.high_level_work_plan.high_level_work_plan.get_plans_for_project",
        args: { project: projectId },
      })
      .then((r: any) => {
        setRows(r?.message?.detailed_rows ?? []);
        setPlanName(r?.message?.detailed?.name ?? null);
        const stored = localStorage.getItem(`gantt-baseline-${projectId}`);
        if (stored) setBaseline(JSON.parse(stored));
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
      });
  }, [projectId]);

  const phases = useMemo(() => [...new Set(rows.map((r) => r.item || "Unassigned"))], [rows]);

  const phaseColorMap = useMemo(
    () => Object.fromEntries(phases.map((p, i) => [p, PHASE_COLORS[i % PHASE_COLORS.length]])),
    [phases],
  );

  useEffect(() => {
    const id = "pm-gantt-phase-styles";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = Object.entries(phaseColorMap)
      .map(([phase, color]) => `.${phaseClass(phase)} .bar { fill: ${color} !important; }`)
      .join("\n");
  }, [phaseColorMap]);

  const ganttTasks = useMemo(() => {
    return rows
      .filter((r) => {
        if (!r.start_date || !r.end_date) return false;
        return new Date(r.start_date) <= new Date(r.end_date);
      })
      .map((r) => ({
        id: r.name,
        name: `[${r.item || "?"}] ${r.activities || r.name}`,
        start: r.start_date!,
        end: r.end_date!,
        progress: STATUS_PROGRESS[(r.status || "").toLowerCase()] ?? 0,
        custom_class: phaseClass(r.item || "Unassigned"),
        _row: r,
      }));
  }, [rows]);

  const handleDateChange = useCallback(
    async (task: any, start: Date, end: Date) => {
      if (!planName) return;
      const startStr = toDateStr(start);
      const endStr = toDateStr(end);
      const newEndTs = end.getTime();
      const affectedCount = rows.filter(
        (r) => r.name !== task.id && r.start_date && new Date(r.start_date).getTime() >= newEndTs,
      ).length;

      setSaving(true);
      try {
        await frappeCall("corporate_services.api.project.save_gantt_task_dates", {
          parent: planName,
          row_name: task.id,
          start_date: startStr,
          end_date: endStr,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.name === task.id ? { ...r, start_date: startStr, end_date: endStr } : r,
          ),
        );
        const msg =
          affectedCount > 0
            ? `Saved. ${affectedCount} downstream task${affectedCount > 1 ? "s" : ""} may need rescheduling.`
            : "Dates updated.";
        showAlert(msg, affectedCount > 0 ? "orange" : "green", 5);
      } catch {
        showAlert("Failed to save dates.", "red", 5);
      } finally {
        setSaving(false);
      }
    },
    [planName, rows],
  );

  useEffect(() => {
    if (!containerRef.current || !ganttTasks.length) return;
    containerRef.current.innerHTML = "";
    ganttRef.current = new Gantt(containerRef.current, ganttTasks, {
      view_mode: viewMode,
      date_format: "YYYY-MM-DD",
      on_date_change: handleDateChange,
      scroll_to: "today",
      today_button: true,
      view_mode_select: false,
    });
    mountedRef.current = true;
    if (showBaseline && Object.keys(baseline).length) {
      setTimeout(() => renderBaselineBars(ganttRef.current, baseline, containerRef.current), 100);
    }
  }, [ganttTasks]);

  useEffect(() => {
    if (ganttRef.current && mountedRef.current) {
      ganttRef.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!ganttRef.current || !mountedRef.current) return;
    const svg = containerRef.current?.querySelector("svg.gantt");
    if (!svg) return;
    svg.querySelector(".baseline-layer")?.remove();
    if (showBaseline && Object.keys(baseline).length) {
      setTimeout(() => renderBaselineBars(ganttRef.current, baseline, containerRef.current), 100);
    }
  }, [showBaseline, baseline]);

  const handleSaveBaseline = () => {
    const snap: Record<string, { start: string; end: string }> = {};
    rows.forEach((r) => {
      if (r.start_date && r.end_date) snap[r.name] = { start: r.start_date, end: r.end_date };
    });
    localStorage.setItem(`gantt-baseline-${projectId}`, JSON.stringify(snap));
    setBaseline(snap);
    showAlert("Baseline saved.", "green", 3);
  };

  const handleExportCSV = () => {
    const header = ["Phase", "Activity", "Resources", "Start", "End", "LOE (days)", "Status"];
    const csvRows = rows.map((r) => [
      r.item || "",
      r.activities || "",
      r.resources || "",
      r.start_date || "",
      r.end_date || "",
      r.duration_loe ?? "",
      r.status || "",
    ]);
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...csvRows].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gantt-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const noDateRows = rows.filter(
    (r) => !r.start_date || !r.end_date || new Date(r.start_date) > new Date(r.end_date),
  ).length;

  if (loading) {
    return (
      <div className="text-center text-muted" style={{ padding: "48px 0" }}>
        <div className="spinner-border spinner-border-sm" role="status" />
        <div style={{ marginTop: 10 }}>Loading Gantt…</div>
      </div>
    );
  }

  if (!planName) {
    return (
      <div className="frappe-card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <p className="text-muted" style={{ fontSize: 13 }}>
          No Detailed Work Plan found for this project. Create one first.
        </p>
      </div>
    );
  }

  if (!ganttTasks.length) {
    return (
      <div className="frappe-card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <p className="text-muted" style={{ fontSize: 13 }}>
          No tasks with start and end dates. Add dates to the Detailed Work Plan rows to render the Gantt.
          {noDateRows > 0 && ` (${noDateRows} row${noDateRows > 1 ? "s" : ""} missing dates)`}
        </p>
      </div>
    );
  }

  return (
    <div className="pm-fade-in">
      <div className="frappe-card" style={{ padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="pm-field-label" style={{ marginBottom: 0 }}>Zoom:</span>
          {(["Week", "Month", "Year"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`btn btn-sm ${viewMode === m ? "btn-primary" : "btn-default"}`}
              onClick={() => setViewMode(m)}
            >
              {m}
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {saving && <span className="text-muted" style={{ fontSize: 12, alignSelf: "center" }}>Saving…</span>}
            <button type="button" className="btn btn-sm btn-default" onClick={handleSaveBaseline}>
              Save Baseline
            </button>
            {Object.keys(baseline).length > 0 && (
              <button
                type="button"
                className={`btn btn-sm ${showBaseline ? "btn-primary" : "btn-default"}`}
                onClick={() => setShowBaseline((v) => !v)}
              >
                {showBaseline ? "Hide Baseline" : "Show Baseline"}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-default" onClick={handleExportCSV}>
              Export CSV
            </button>
            <button type="button" className="btn btn-sm btn-default" onClick={() => window.print()}>
              Print / PDF
            </button>
          </div>
        </div>

        {noDateRows > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#e67700" }}>
            {noDateRows} row{noDateRows > 1 ? "s" : ""} hidden - missing start or end date.
          </div>
        )}
      </div>

      <div className="frappe-card" style={{ padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {phases.map((phase) => (
            <span key={phase} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: phaseColorMap[phase],
                  flexShrink: 0,
                }}
              />
              {phase}
            </span>
          ))}
          {showBaseline && Object.keys(baseline).length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 4,
                  borderRadius: 2,
                  background: "#adb5bd",
                  flexShrink: 0,
                }}
              />
              Baseline
            </span>
          )}
        </div>
      </div>

      <div
        className="frappe-card pm-gantt-wrapper"
        style={{ padding: "12px 0", overflowX: "auto" }}
      >
        <div ref={containerRef} />
      </div>
    </div>
  );
}

function renderBaselineBars(
  gantt: any,
  baseline: Record<string, { start: string; end: string }>,
  container: HTMLDivElement | null,
) {
  if (!container || !gantt) return;
  const svg = container.querySelector("svg.gantt");
  if (!svg) return;
  svg.querySelector(".baseline-layer")?.remove();

  const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  layer.setAttribute("class", "baseline-layer");

  for (const [taskId, dates] of Object.entries(baseline)) {
    const wrapper = svg.querySelector(`[data-id="${taskId}"]`);
    if (!wrapper) continue;
    const bar = wrapper.querySelector(".bar") as SVGRectElement | null;
    if (!bar) continue;
    const barY = parseFloat(bar.getAttribute("y") || "0");
    const barH = parseFloat(bar.getAttribute("height") || "30");

    try {
      const x1 = gantt.get_x_from_date(new Date(dates.start));
      const x2 = gantt.get_x_from_date(new Date(dates.end));
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(Math.round(x1)));
      rect.setAttribute("y", String(Math.round(barY + barH - 5)));
      rect.setAttribute("width", String(Math.max(4, Math.round(x2 - x1))));
      rect.setAttribute("height", "4");
      rect.setAttribute("rx", "2");
      rect.setAttribute("fill", "#adb5bd");
      rect.setAttribute("opacity", "0.8");
      layer.appendChild(rect);
    } catch {
      // skip unparseable dates
    }
  }

  const gridEl = svg.querySelector(".grid");
  if (gridEl) svg.insertBefore(layer, gridEl.nextSibling);
  else svg.appendChild(layer);
}
