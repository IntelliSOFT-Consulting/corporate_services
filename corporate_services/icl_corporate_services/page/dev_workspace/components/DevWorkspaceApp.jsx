import React, { useState, useEffect, useCallback, useMemo } from "react";
import DevWorkspaceCharts from "./DevWorkspaceCharts";
import { openAddToTimesheetDialog } from "./addToTimesheet";

function connectToJira(project, e) {
    e.stopPropagation();
    localStorage.setItem("dw_connect_project", project.name);
    frappe.set_route("List", "Jira Project");
}

function ProjectCard({ project, active, onClick }) {
    const pct = Number(project.percent_complete || 0).toFixed(0);
    const due = project.expected_end_date ? frappe.datetime.str_to_user(project.expected_end_date) : "-";
    return (
        <div className={`dw-project-card${active ? " dw-project-card-active" : ""}`} onClick={onClick}>
            <div className="dw-project-card-title">{project.project_name || project.name}</div>
            <div className="dw-project-card-meta">{project.status || "-"} &middot; Due {due}</div>
            <div className="dw-progress">
                <div className="dw-progress-bar" style={{ width: `${pct}%` }} />
            </div>
            {project.custom_jira_project ? (
                <span className="dw-badge">Jira: {project.custom_jira_project}</span>
            ) : (
                <div className="dw-jira-warning">
                    <span className="dw-badge dw-badge-warning">⚠ No Jira Link</span>
                    <button className="btn btn-default btn-xs dw-connect-btn" onClick={(e) => connectToJira(project, e)}>
                        Connect to Jira
                    </button>
                </div>
            )}
        </div>
    );
}

function TaskRow({ task }) {
    const due = task.exp_end_date ? frappe.datetime.str_to_user(task.exp_end_date) : "-";
    return (
        <tr className={task.is_overdue ? "dw-row-overdue" : ""}>
            <td>
                <a href={`/app/task/${encodeURIComponent(task.name)}`} target="_blank" rel="noreferrer">
                    {task.subject || task.name}
                </a>
            </td>
            <td>{task.project_name || "-"}</td>
            <td>{task.status || "-"}</td>
            <td>{task.allocated_to_name || "-"}</td>
            <td>
                {task.custom_jira_issue_key ? (
                    <a href={task.custom_jira_issue_url || "#"} target="_blank" rel="noreferrer">
                        {task.custom_jira_issue_key}
                    </a>
                ) : (
                    "-"
                )}
            </td>
            <td>
                {due}
                {task.is_overdue && <span className="dw-badge dw-badge-warning dw-overdue-badge">⚠ Overdue</span>}
            </td>
            <td>
                <button className="btn btn-default btn-xs" onClick={() => openAddToTimesheetDialog(task)}>
                    + Timesheet
                </button>
            </td>
        </tr>
    );
}

function Pagination({ page, pageLength, total, onChange }) {
    const totalPages = Math.max(Math.ceil(total / pageLength), 1);
    return (
        <div className="dw-pagination">
            <div className="dw-pagination-info">
                {(page - 1) * pageLength + 1}-{Math.min(page * pageLength, total)} of {total}
            </div>
            <div className="dw-pagination-controls">
                <button className="btn btn-default btn-sm" disabled={page <= 1} onClick={() => onChange(Math.max(page - 1, 1))}>
                    Previous
                </button>
                <span className="dw-pagination-page">
                    Page {page} of {totalPages}
                </span>
                <button
                    className="btn btn-default btn-sm"
                    disabled={page >= totalPages}
                    onClick={() => onChange(Math.min(page + 1, totalPages))}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

function UnmappedAssigneesPanel({ rows, total, page, pageLength, onPageChange }) {
    if (!total) return null;
    return (
        <div className="dw-unmapped-panel">
            <div className="dw-unmapped-title">
                ⚠ {total} Jira task(s) with an unmapped assignee
            </div>
            <div className="table-responsive">
                <table className="table table-sm mb-0">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Project</th>
                            <th>Jira Issue</th>
                            <th>Jira Assignee Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.name}>
                                <td>
                                    <a href={`/app/task/${encodeURIComponent(r.name)}`} target="_blank" rel="noreferrer">
                                        {r.subject || r.name}
                                    </a>
                                </td>
                                <td>{r.project || "-"}</td>
                                <td>{r.custom_jira_issue_key || "-"}</td>
                                <td>{r.custom_jira_assignee_email}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} pageLength={pageLength} total={total} onChange={onPageChange} />
        </div>
    );
}

const PAGE_LENGTH = 20;

export default function DevWorkspaceApp() {
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [totalTasks, setTotalTasks] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedProject, setSelectedProject] = useState("");
    const [projectsLoading, setProjectsLoading] = useState(true);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [unmappedAssignees, setUnmappedAssignees] = useState([]);
    const [unmappedTotal, setUnmappedTotal] = useState(0);
    const [unmappedPage, setUnmappedPage] = useState(1);

    const loadProjects = useCallback(() => {
        setProjectsLoading(true);
        frappe.call({
            method: "corporate_services.icl_corporate_services.page.dev_workspace.dev_workspace.get_my_projects",
            callback: (r) => {
                setProjects(r.message || []);
                setProjectsLoading(false);
            },
            error: () => setProjectsLoading(false),
        });
    }, []);

    const loadTasks = useCallback((project, pageNum) => {
        setTasksLoading(true);
        frappe.call({
            method: "corporate_services.icl_corporate_services.page.dev_workspace.dev_workspace.get_my_tasks",
            args: { project: project || null, page: pageNum, page_length: PAGE_LENGTH },
            callback: (r) => {
                const res = r.message || {};
                setTasks(res.tasks || []);
                setTotalTasks(res.total || 0);
                setTasksLoading(false);
            },
            error: () => setTasksLoading(false),
        });
    }, []);

    const loadStats = useCallback((project) => {
        frappe.call({
            method: "corporate_services.icl_corporate_services.page.dev_workspace.dev_workspace.get_my_task_stats",
            args: { project: project || null },
            callback: (r) => setStats(r.message || null),
        });
    }, []);

    const loadUnmappedAssignees = useCallback((pageNum) => {
        frappe.call({
            method: "corporate_services.icl_corporate_services.page.dev_workspace.dev_workspace.get_unmapped_jira_assignees",
            args: { page: pageNum, page_length: PAGE_LENGTH },
            callback: (r) => {
                const res = r.message || {};
                setUnmappedAssignees(res.rows || []);
                setUnmappedTotal(res.total || 0);
            },
        });
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        loadTasks(selectedProject, page);
    }, [selectedProject, page, loadTasks]);

    useEffect(() => {
        loadStats(selectedProject);
    }, [selectedProject, loadStats]);

    useEffect(() => {
        loadUnmappedAssignees(unmappedPage);
    }, [unmappedPage, loadUnmappedAssignees]);

    const refresh = useCallback(() => {
        loadProjects();
        loadTasks(selectedProject, page);
        loadStats(selectedProject);
        loadUnmappedAssignees(unmappedPage);
    }, [loadProjects, loadTasks, loadStats, loadUnmappedAssignees, selectedProject, page, unmappedPage]);

    const selectProject = useCallback((projectName) => {
        setSelectedProject(projectName);
        setPage(1);
    }, []);

    const sprintStatsByLabel = useMemo(() => {
        const map = new Map();
        for (const s of stats?.sprint_counts || []) {
            map.set(s.label, s);
        }
        return map;
    }, [stats]);

    const taskGroups = useMemo(() => {
        const groups = new Map();
        for (const t of tasks) {
            const key = t.sprint_name || "No Sprint";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(t);
        }
        return Array.from(groups.entries()).map(([sprint, rows]) => ({
            sprint,
            rows,
            stats: sprintStatsByLabel.get(sprint),
        }));
    }, [tasks, sprintStatsByLabel]);

    return (
        <div className="dw-wrap">
            <div className="dw-projects-section">
                {projectsLoading ? (
                    <div className="text-muted">Loading your projects...</div>
                ) : projects.length ? (
                    <div className="dw-project-grid">
                        <div
                            className={`dw-project-card dw-project-card-all${!selectedProject ? " dw-project-card-active" : ""}`}
                            onClick={() => selectProject("")}
                        >
                            <div className="dw-project-card-title">All My Projects</div>
                            <div className="dw-project-card-meta">{projects.length} project(s)</div>
                        </div>
                        {projects.map((p) => (
                            <ProjectCard
                                key={p.name}
                                project={p}
                                active={selectedProject === p.name}
                                onClick={() => selectProject(p.name)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="dw-empty">You are not assigned to any projects yet.</div>
                )}
            </div>

            <DevWorkspaceCharts stats={stats} showProjectChart={!selectedProject} />

            <div className="dw-tasks-card">
                <div className="dw-tasks-header">
                    <div className="dw-tasks-title">My Tasks</div>
                    <button className="btn btn-default btn-sm" onClick={refresh}>
                        Refresh
                    </button>
                </div>
                {tasksLoading ? (
                    <div className="text-muted p-2">Loading tasks...</div>
                ) : tasks.length ? (
                    <>
                        <div className="table-responsive">
                            <table className="table table-sm table-bordered mb-0 align-middle">
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Project</th>
                                        <th>Status</th>
                                        <th>Allocated To</th>
                                        <th>Jira Issue</th>
                                        <th>Due</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taskGroups.map((group) => {
                                        const total = group.stats?.total ?? group.rows.length;
                                        const completed = group.stats?.completed ?? 0;
                                        const pct = total ? Math.round((completed / total) * 100) : 0;
                                        return (
                                            <React.Fragment key={group.sprint}>
                                                <tr className="dw-sprint-header-row">
                                                    <td colSpan={7} className="dw-sprint-header">
                                                        <div className="dw-sprint-header-top">
                                                            <span>
                                                                {group.sprint}
                                                                <span className="dw-sprint-count">{total}</span>
                                                            </span>
                                                            {group.sprint !== "No Sprint" && (
                                                                <span className="dw-sprint-progress-label">
                                                                    {completed}/{total} done ({pct}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                        {group.stats?.goal && (
                                                            <div className="dw-sprint-goal">🎯 {group.stats.goal}</div>
                                                        )}
                                                        {group.sprint !== "No Sprint" && (
                                                            <div className="dw-progress dw-sprint-progress">
                                                                <div className="dw-progress-bar" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                {group.rows.map((t) => (
                                                    <TaskRow key={t.name} task={t} />
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination page={page} pageLength={PAGE_LENGTH} total={totalTasks} onChange={setPage} />
                    </>
                ) : (
                    <div className="dw-empty">No tasks assigned to you here.</div>
                )}
            </div>

            <UnmappedAssigneesPanel
                rows={unmappedAssignees}
                total={unmappedTotal}
                page={unmappedPage}
                pageLength={PAGE_LENGTH}
                onPageChange={setUnmappedPage}
            />
        </div>
    );
}
