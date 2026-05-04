import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

let _rowIdCounter = 1;
function makeRowId() {
    return "row_" + (_rowIdCounter++);
}

function makeEmptyTask() {
    return { id: makeRowId(), task: "", hours: {} };
}

function makeSection(type, name) {
    return { type, name, tasks: [makeEmptyTask()] };
}

function hydrateSections(rawSections) {
    return (rawSections || []).map((sec) => ({
        type: sec.type,
        name: sec.name,
        tasks: (sec.tasks || []).length
            ? sec.tasks.map((t) => ({ id: makeRowId(), task: t.task || "", hours: t.hours || {} }))
            : [makeEmptyTask()],
    }));
}

function formatMonthYearLabel(monthYear) {
    if (!monthYear || typeof monthYear !== "string") return "";
    const [mm, yyyy] = monthYear.split("-");
    const monthNum = parseInt(mm, 10);
    const yearNum = parseInt(yyyy, 10);
    if (!monthNum || monthNum < 1 || monthNum > 12 || !yearNum) return monthYear;
    const dt = new Date(yearNum, monthNum - 1, 1);
    return `${dt.toLocaleString("en-US", { month: "long" })} ${yearNum}`;
}

export default function TimesheetEntryApp({ submissionName, onContextChange }) {
    const AUTO_SAVE_ENABLED = true;
    const [ctx, setCtx] = useState(null);
    const [activeSubmission, setActiveSubmission] = useState(submissionName || "");
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [manualSaving, setManualSaving] = useState(false);
    const [addProjectOpen, setAddProjectOpen] = useState(false);
    const [addActivityOpen, setAddActivityOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState("");
    const [activitySearch, setActivitySearch] = useState("");
    const [newActivityType, setNewActivityType] = useState("");
    const [error, setError] = useState("");
    const [workflowActions, setWorkflowActions] = useState([]);
    const [workflowBusy, setWorkflowBusy] = useState(false);
    const isInitialLoadRef = useRef(true);
    const autosaveRef = useRef(null);
    const autosaveDirtyRef = useRef(false);

    const loadContext = useCallback((targetSubmission) => {
        if (!targetSubmission) {
            setLoading(false);
            setError("No submission specified. Please open this page from a Timesheet Submission.");
            return;
        }

        setLoading(true);
        setError("");

        frappe.call({
            method: "corporate_services.icl_corporate_services.page.employee_timesheet_entry.employee_timesheet_entry.get_timesheet_context",
            args: { submission_name: targetSubmission },
            callback(r) {
                if (r.message) {
                    const context = r.message;
                    setCtx(context);
                    if (onContextChange) onContextChange(context);

                    const existing = hydrateSections(context.existing_sections || []);
                    if (existing.length) {
                        setSections(existing);
                    } else {
                        const initialProjects = (context.projects || []).map((p) => makeSection("project", p.project_name));
                        setSections(initialProjects);
                    }
                    setActiveSubmission(targetSubmission);
                }
                setLoading(false);
                isInitialLoadRef.current = false;
            },
            error() {
                setError("Failed to load timesheet context.");
                setLoading(false);
                isInitialLoadRef.current = false;
            },
        });
    }, [onContextChange]);

    useEffect(() => {
        loadContext(submissionName);
    }, [submissionName, loadContext]);

    const refreshWorkflowActions = useCallback((targetSubmission) => {
        if (!targetSubmission) {
            setWorkflowActions([]);
            return;
        }

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Timesheet Submission",
                name: targetSubmission,
            },
            callback(getRes) {
                const doc = getRes.message;
                if (!doc) {
                    setWorkflowActions([]);
                    return;
                }

                frappe.call({
                    method: "frappe.model.workflow.get_transitions",
                    args: { doc },
                    callback(trRes) {
                        const actions = (trRes.message || []).map((row) => row.action).filter(Boolean);
                        setWorkflowActions(actions);
                    },
                    error() {
                        setWorkflowActions([]);
                    },
                });
            },
            error() {
                setWorkflowActions([]);
            },
        });
    }, []);

    useEffect(() => {
        refreshWorkflowActions(activeSubmission);
    }, [activeSubmission, refreshWorkflowActions]);

    const persistTimesheet = useCallback((showAlert = false) => {
        if (saving || !activeSubmission) return;

        const payload = sections.map((sec) => ({
            type: sec.type,
            name: sec.name,
            tasks: sec.tasks.map((t) => ({ task: t.task, hours: t.hours })),
        }));

        setSaving(true);
        if (showAlert) setManualSaving(true);

        frappe.call({
            method: "corporate_services.icl_corporate_services.page.employee_timesheet_entry.employee_timesheet_entry.save_web_timesheet",
            args: {
                submission_name: activeSubmission,
                sections: JSON.stringify(payload),
            },
            callback(r) {
                setSaving(false);
                setManualSaving(false);
                autosaveDirtyRef.current = false;
                const response = r.message || {};
                const ok = response.status === "success";
                if (ok) {
                    if (showAlert) {
                        frappe.show_alert(
                            {
                                message: `Timesheet saved. Total hours: ${response.total_hours.toFixed(1)}`,
                                indicator: "green",
                            },
                            5
                        );
                    }
                } else if (showAlert) {
                    frappe.msgprint({
                        title: response.status === "locked" ? "Timesheet Locked" : "Save Failed",
                        message: response.message || "Could not save timesheet.",
                        indicator: "red",
                    });
                }
            },
            error() {
                setSaving(false);
                setManualSaving(false);
                if (showAlert) {
                    frappe.msgprint({
                        title: "Save Failed",
                        message: "Could not save timesheet.",
                        indicator: "red",
                    });
                }
            },
        });
    }, [sections, activeSubmission, saving]);

    useEffect(() => {
        if (!AUTO_SAVE_ENABLED) return;
        if (!autosaveDirtyRef.current) return;
        if (isInitialLoadRef.current || loading) return;
        if (autosaveRef.current) clearTimeout(autosaveRef.current);
        autosaveRef.current = setTimeout(() => persistTimesheet(false), 1200);
        return () => {
            if (autosaveRef.current) clearTimeout(autosaveRef.current);
        };
    }, [sections, loading, persistTimesheet, AUTO_SAVE_ENABLED]);

    const colTotals = useMemo(() => {
        if (!ctx) return {};
        const totals = {};
        for (const d of ctx.dates) totals[d.date] = 0;
        for (const sec of sections) {
            for (const task of sec.tasks) {
                for (const [date, val] of Object.entries(task.hours)) {
                    const h = parseFloat(val) || 0;
                    if (h > 0) totals[date] = (totals[date] || 0) + h;
                }
            }
        }
        return totals;
    }, [ctx, sections]);

    const grandTotal = useMemo(() => Object.values(colTotals).reduce((s, v) => s + v, 0), [colTotals]);
    const rowTotal = useCallback((task) => Object.values(task.hours).reduce((s, v) => s + (parseFloat(v) || 0), 0), []);

    const updateHours = useCallback((secIdx, taskId, date, value) => {
        autosaveDirtyRef.current = true;
        setSections((prev) =>
            prev.map((sec, si) =>
                si !== secIdx
                    ? sec
                    : {
                          ...sec,
                          tasks: sec.tasks.map((t) =>
                              t.id !== taskId ? t : { ...t, hours: { ...t.hours, [date]: value === "" ? 0 : parseFloat(value) || 0 } }
                          ),
                      }
            )
        );
    }, []);

    const updateTask = useCallback((secIdx, taskId, value) => {
        autosaveDirtyRef.current = true;
        setSections((prev) =>
            prev.map((sec, si) => (si !== secIdx ? sec : { ...sec, tasks: sec.tasks.map((t) => (t.id !== taskId ? t : { ...t, task: value })) }))
        );
    }, []);

    const addTask = useCallback((secIdx) => {
        autosaveDirtyRef.current = true;
        setSections((prev) => prev.map((sec, si) => (si !== secIdx ? sec : { ...sec, tasks: [...sec.tasks, makeEmptyTask()] })));
    }, []);

    const removeTask = useCallback((secIdx, taskId) => {
        setSections((prev) =>
            prev.map((sec, si) => {
                if (si !== secIdx || sec.tasks.length <= 1) return sec;
                return { ...sec, tasks: sec.tasks.filter((t) => t.id !== taskId) };
            })
        );
    }, []);

    const updateSectionName = useCallback((secIdx, value) => {
        setSections((prev) =>
            prev.map((sec, si) => (si !== secIdx ? sec : { ...sec, name: value }))
        );
    }, []);

    const removeSection = useCallback((secIdx) => {
        setSections((prev) => prev.filter((_, si) => si !== secIdx));
    }, []);

    const addProject = useCallback((projectName) => {
        setSections((prev) => [...prev, makeSection("project", projectName)]);
        setAddProjectOpen(false);
        setProjectSearch("");
    }, []);

    const addActivity = useCallback((activityName) => {
        autosaveDirtyRef.current = true;
        setSections((prev) => [...prev, makeSection("activity", activityName)]);
        setAddActivityOpen(false);
        setActivitySearch("");
    }, []);

    const createAndAddActivity = useCallback(() => {
        const name = (newActivityType || "").trim();
        if (!name) return;
        frappe.call({
            method: "corporate_services.icl_corporate_services.page.employee_timesheet_entry.employee_timesheet_entry.create_activity_type",
            args: { name },
            callback: (r) => {
                const createdName = (r.message && r.message.name) || name;
                setCtx((prev) => {
                    const existing = new Set((prev?.activity_types || []).map((a) => a.toLowerCase()));
                    if (existing.has(createdName.toLowerCase())) return prev;
                    return { ...prev, activity_types: [...(prev?.activity_types || []), createdName].sort() };
                });
                addActivity(createdName);
                setNewActivityType("");
            },
        });
    }, [newActivityType, addActivity]);

    const runWorkflowAction = useCallback(
        (action) => {
            if (!activeSubmission || !action || workflowBusy) return;

            setWorkflowBusy(true);
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Timesheet Submission",
                    name: activeSubmission,
                },
                callback(getRes) {
                    const doc = getRes.message;
                    if (!doc) {
                        setWorkflowBusy(false);
                        frappe.msgprint(__("Unable to load linked Timesheet Submission."));
                        return;
                    }

                    frappe.call({
                        method: "frappe.model.workflow.apply_workflow",
                        args: {
                            doc,
                            action,
                        },
                        callback() {
                            setWorkflowBusy(false);
                            frappe.show_alert({ message: __("Workflow action applied: {0}", [action]), indicator: "green" });
                            refreshWorkflowActions(activeSubmission);
                            loadContext(activeSubmission);
                        },
                        error() {
                            setWorkflowBusy(false);
                        },
                    });
                },
                error() {
                    setWorkflowBusy(false);
                },
            });
        },
        [activeSubmission, workflowBusy, loadContext, refreshWorkflowActions]
    );

    const availableProjects = useMemo(() => {
        if (!ctx) return [];
        const added = new Set(sections.filter((s) => s.type === "project").map((s) => s.name));
        return (ctx.all_projects || []).filter((p) => !added.has(p.project_name));
    }, [ctx, sections]);

    const availableActivities = useMemo(() => {
        if (!ctx) return [];
        const added = new Set(sections.filter((s) => s.type === "activity").map((s) => s.name));
        return (ctx.activity_types || []).filter((a) => !added.has(a));
    }, [ctx, sections]);

    const filteredProjects = useMemo(() => {
        const q = projectSearch.toLowerCase();
        return q ? availableProjects.filter((p) => p.project_name.toLowerCase().includes(q)) : availableProjects;
    }, [availableProjects, projectSearch]);

    const filteredActivities = useMemo(() => {
        const q = activitySearch.toLowerCase();
        return q ? availableActivities.filter((a) => a.toLowerCase().includes(q)) : availableActivities;
    }, [availableActivities, activitySearch]);

    const workflowIndicatorClass = useMemo(() => {
        const style = (ctx?.workflow_style || "").toLowerCase();
        const styleToClass = {
            success: "green",
            danger: "red",
            primary: "blue",
            warning: "orange",
            info: "light-blue",
            inverse: "darkgrey",
        };
        return styleToClass[style] || "gray";
    }, [ctx]);
    const formattedMonthLabel = useMemo(() => formatMonthYearLabel(ctx?.month_year), [ctx]);

    if (loading) return <div className="ts-loading">Loading timesheet...</div>;
    if (error) return <div className="alert alert-danger" style={{ margin: 20 }}>{error}</div>;
    if (!ctx) return null;

    const sidebarRoot = document.getElementById("timesheet-entry-sidebar-root");
    const contextRoot = document.getElementById("timesheet-entry-context-root");
    const actionsRoot = document.getElementById("timesheet-entry-actions-root");
    const sidebarContent = (
        <div className="frappe-card" style={{ padding: 10, height: "fit-content" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Available Months</div>
            {(ctx.submissions || []).map((s) => (
                <button
                    key={s.name}
                    className={`btn btn-xs ${s.name === activeSubmission ? "btn-primary" : "btn-default"}`}
                    style={{ width: "100%", marginBottom: 6, textAlign: "left" }}
                    onClick={() => loadContext(s.name)}
                >
                    {s.month_year}
                </button>
            ))}
        </div>
    );
    const pageHeaderActions = (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
                className="btn btn-default btn-sm"
                onClick={() => activeSubmission && frappe.set_route("Form", "Timesheet Submission", activeSubmission)}
                disabled={!activeSubmission}
            >
                Open Submission
            </button>
            <div className="btn-group">
                <button className="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-expanded="false" disabled={workflowBusy}>
                    {workflowBusy ? __("Working...") : __("Actions")}
                </button>
                <ul className="dropdown-menu dropdown-menu-right">
                    <li>
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setAddActivityOpen(false);
                                setAddProjectOpen((v) => !v);
                                setProjectSearch("");
                            }}
                        >
                            {__("Add Project")}
                        </a>
                    </li>
                    <li>
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setAddProjectOpen(false);
                                setAddActivityOpen((v) => !v);
                                setActivitySearch("");
                            }}
                        >
                            {__("Add Activity")}
                        </a>
                    </li>
                    {workflowActions.length > 0 && <li className="divider"></li>}
                    {workflowActions.map((action) => (
                        <li key={action}>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    runWorkflowAction(action);
                                }}
                            >
                                {action}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => persistTimesheet(true)} disabled={manualSaving}>
                {manualSaving ? "Saving..." : "Save"}
            </button>
        </div>
    );
    const pageHeaderContext = (
        <div style={{ display: "inline-flex", alignItems: "center" }}>
            <span className={`indicator-pill ${workflowIndicatorClass}`} style={{ marginLeft: 12 }}>
                {ctx.workflow_state || "Draft"}
            </span>
        </div>
    );

    return (
        <>
            {sidebarRoot ? createPortal(sidebarContent, sidebarRoot) : null}
            {contextRoot ? createPortal(pageHeaderContext, contextRoot) : null}
            {actionsRoot ? createPortal(pageHeaderActions, actionsRoot) : null}
            <div className="ts-entry-wrap">
                <div className="ts-entry-header">
                </div>

                {addProjectOpen && (
                    <div className="ts-add-project-panel">
                        <input className="form-control form-control-sm" placeholder="Search projects..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} autoFocus />
                        <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 6 }}>
                            {filteredProjects.length === 0 && <div style={{ padding: "6px 10px", color: "#888", fontSize: 12 }}>No projects available</div>}
                            {filteredProjects.map((p) => (
                                <div key={p.name} className="ts-project-item" onClick={() => addProject(p.project_name)}>
                                    {p.project_name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {addActivityOpen && (
                    <div className="ts-add-project-panel">
                        <input className="form-control form-control-sm" placeholder="Search activity types..." value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} autoFocus />
                        <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 6 }}>
                            {filteredActivities.length === 0 && <div style={{ padding: "6px 10px", color: "#888", fontSize: 12 }}>No activity types available</div>}
                            {filteredActivities.map((a) => (
                                <div key={a} className="ts-project-item" onClick={() => addActivity(a)}>
                                    {a}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 8, borderTop: "1px solid #eee", paddingTop: 8 }}>
                            <input
                                className="form-control form-control-sm"
                                placeholder="Create new activity type (e.g. Meetings, Leave, Holiday)"
                                value={newActivityType}
                                onChange={(e) => setNewActivityType(e.target.value)}
                            />
                            <button className="btn btn-default btn-sm" style={{ marginTop: 6 }} onClick={createAndAddActivity}>
                                Create & Add
                            </button>
                        </div>
                    </div>
                )}

                <div className="ts-table-wrap">
                    <table className="ts-table">
                        <thead>
                            <tr className="ts-row-dayname">
                                <th className="ts-col-sticky" style={{ left: 0, minWidth: 180 }}>Projects / Activities</th>
                                <th className="ts-col-sticky" style={{ left: 180, minWidth: 220 }}>Tasks</th>
                                {ctx.dates.map((d) => (
                                    <th key={d.date} className={"ts-col-date" + (d.is_weekend ? " ts-weekend" : "")}>{d.day_short}</th>
                                ))}
                                <th className="ts-col-total">Total Hours</th>
                            </tr>
                            <tr className="ts-row-datenum">
                                <th className="ts-col-sticky" style={{ left: 0, minWidth: 180, top: 29 }}></th>
                                <th className="ts-col-sticky" style={{ left: 180, minWidth: 220, top: 29 }}>Hours</th>
                                {ctx.dates.map((d) => (
                                    <th key={d.date} className={"ts-col-date" + (d.is_weekend ? " ts-weekend" : "")} style={{ top: 29 }}>{d.date_num}</th>
                                ))}
                                <th className="ts-col-total" style={{ top: 29 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sections.map((sec, secIdx) => (
                                <React.Fragment key={sec.type + "_" + sec.name + "_" + secIdx}>
                                    <tr className={`ts-section-header ${sec.type === "activity" ? "ts-section-header-activity" : ""}`}>
                                        <td colSpan={2} className="ts-col-sticky ts-section-name" style={{ left: 0 }}>
                                            {sec.type === "activity" ? (
                                                <input
                                                    className="form-control form-control-sm"
                                                    style={{ display: "inline-block", width: 220, marginRight: 8, height: 28 }}
                                                    value={sec.name}
                                                    onChange={(e) => updateSectionName(secIdx, e.target.value)}
                                                    placeholder="Activity name"
                                                />
                                            ) : (
                                                sec.name
                                            )}
                                            <span className="ts-section-type-badge">{sec.type === "project" ? "Project" : "Activity"}</span>
                                            {sec.type === "activity" && (
                                                <button
                                                    className="btn btn-default btn-xs ts-activity-delete-btn"
                                                    style={{ marginLeft: 8 }}
                                                    onClick={() => removeSection(secIdx)}
                                                    title="Delete activity section"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                        {ctx.dates.map((d) => <td key={d.date} className={d.is_weekend ? "ts-weekend" : ""}></td>)}
                                        <td></td>
                                    </tr>
                                    {sec.tasks.map((task) => (
                                        <tr key={task.id}>
                                            <td className="ts-col-sticky" style={{ left: 0, background: "#fff" }}></td>
                                            <td className="ts-col-sticky" style={{ left: 180, background: "#fff" }}>
                                                <div className="ts-task-cell">
                                                    <input className="ts-task-input" type="text" maxLength={500} value={task.task} onChange={(e) => updateTask(secIdx, task.id, e.target.value)} placeholder="Task description" />
                                                    {sec.tasks.length > 1 && (
                                                        <button className="ts-remove-btn" onClick={() => removeTask(secIdx, task.id)} title="Remove row">&times;</button>
                                                    )}
                                                </div>
                                            </td>
                                            {ctx.dates.map((d) => (
                                                <td key={d.date} className={"ts-col-date" + (d.is_weekend ? " ts-weekend" : "")}>
                                                    {!d.is_weekend && (
                                                        <input className="ts-hours-input" type="number" min="0" step="0.5" value={task.hours[d.date] || ""} onChange={(e) => updateHours(secIdx, task.id, d.date, e.target.value)} />
                                                    )}
                                                </td>
                                            ))}
                                            <td className="ts-col-total">{rowTotal(task) > 0 ? rowTotal(task).toFixed(1) : ""}</td>
                                        </tr>
                                    ))}
                                    <tr className="ts-row-addtask">
                                        <td className="ts-col-sticky" style={{ left: 0, background: "#fff" }}></td>
                                        <td className="ts-col-sticky" style={{ left: 180, background: "#fff" }}>
                                            <button className="ts-addtask-btn" onClick={() => addTask(secIdx)}>+ Add row</button>
                                        </td>
                                        {ctx.dates.map((d) => <td key={d.date} className={d.is_weekend ? "ts-weekend" : ""}></td>)}
                                        <td></td>
                                    </tr>
                                </React.Fragment>
                            ))}
                            <tr className="ts-row-total">
                                <td colSpan={2} className="ts-col-sticky" style={{ left: 0 }}>TOTAL</td>
                                {ctx.dates.map((d) => (
                                    <td key={d.date} className={"ts-col-date" + (d.is_weekend ? " ts-weekend" : "")}>
                                        {colTotals[d.date] > 0 ? colTotals[d.date].toFixed(1) : ""}
                                    </td>
                                ))}
                                <td className="ts-col-total">{grandTotal > 0 ? grandTotal.toFixed(1) : ""}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
