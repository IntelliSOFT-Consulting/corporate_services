import React from "react";

function openPullJiraDialog(ctx, onPullJiraTasks) {
    const jiraProjects = (ctx?.projects || []).filter((p) => p.custom_jira_project);
    if (!jiraProjects.length) {
        frappe.msgprint(__("None of your assigned projects are linked to a Jira project."));
        return;
    }

    const dates = ctx?.dates || [];
    const defaultStart = dates[0]?.date;
    const defaultEnd = dates[dates.length - 1]?.date;

    const dialog = new frappe.ui.Dialog({
        title: __("Pull Assigned Jira Tasks"),
        fields: [
            {
                fieldname: "project",
                label: __("Project"),
                fieldtype: "Select",
                reqd: 1,
                options: jiraProjects.map((p) => ({ label: p.project_name, value: p.name })),
            },
            {
                fieldname: "sprint",
                label: __("Sprint"),
                fieldtype: "Select",
                options: [{ label: __("All Sprints"), value: "" }],
            },
            { fieldname: "column_break_pull_jira", fieldtype: "Column Break" },
            { fieldname: "start_date", label: __("Due On/After"), fieldtype: "Date", default: defaultStart },
            { fieldname: "end_date", label: __("Due On/Before"), fieldtype: "Date", default: defaultEnd },
        ],
        primary_action_label: __("Pull Tasks"),
        primary_action(values) {
            dialog.set_df_property("project", "read_only", 1);
            frappe.call({
                method: "corporate_services.api.jira.issues.get_assigned_jira_tasks",
                args: {
                    project: values.project,
                    sprint: values.sprint || null,
                    start_date: values.start_date || null,
                    end_date: values.end_date || null,
                },
                freeze: true,
                callback(r) {
                    const tasks = r.message || [];
                    const projectRow = jiraProjects.find((p) => p.name === values.project);
                    dialog.hide();
                    if (!tasks.length) {
                        frappe.show_alert({ message: __("No assigned Jira tasks matched those filters."), indicator: "orange" });
                        return;
                    }
                    onPullJiraTasks(projectRow.project_name, tasks);
                },
            });
        },
    });

    dialog.fields_dict.project.df.change = () => {
        const project = dialog.get_value("project");
        if (!project) return;
        frappe.call({
            method: "corporate_services.api.jira.issues.get_project_jira_sprints",
            args: { project },
            callback(r) {
                const sprints = r.message || [];
                dialog.set_df_property("sprint", "options", [
                    { label: __("All Sprints"), value: "" },
                    ...sprints.map((s) => ({ label: s.sprint_name || s.name, value: s.name })),
                ]);
                dialog.set_value("sprint", "");
            },
        });
    };

    dialog.show();
}

export default function PageHeaderActions({
    activeSubmission,
    ctx,
    workflowBusy,
    workflowActions,
    manualSaving,
    setAddActivityOpen,
    setAddProjectOpen,
    setProjectSearch,
    setActivitySearch,
    runWorkflowAction,
    persistTimesheet,
    onPullJiraTasks,
}) {
    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
                className="btn btn-default btn-sm"
                onClick={() => activeSubmission && frappe.set_route("Form", "Timesheet Submission", activeSubmission)}
                disabled={!activeSubmission}
            >
                Open Submission
            </button>
            {frappe.user_roles.some((role) => ["Supervisor", "Finance"].includes(role)) && (
                <button
                    className="btn btn-default btn-sm"
                    onClick={() =>
                        activeSubmission &&
                        ctx?.employee &&
                        frappe.set_route("timesheet_workflow", "employee", ctx.employee, "submission", activeSubmission)
                    }
                    disabled={!activeSubmission || !ctx?.employee}
                >
                    Review
                </button>
            )}
            <div className="btn-group">
                <button className="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-expanded="false" disabled={workflowBusy}>
                    {workflowBusy ? __("Working...") : __("Actions")}
                </button>
                <ul className="dropdown-menu dropdown-menu-right ts-actions-menu">
                    <li>
                        <a
                            className="ts-actions-link"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setAddActivityOpen(false);
                                setAddProjectOpen((v) => !v);
                                setProjectSearch("");
                            }}
                        >
                            <i className="fa fa-folder-open ts-actions-icon" aria-hidden="true"></i>
                            <span>{__("Add Project")}</span>
                        </a>
                    </li>
                    <li>
                        <a
                            className="ts-actions-link"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setAddProjectOpen(false);
                                setAddActivityOpen((v) => !v);
                                setActivitySearch("");
                            }}
                        >
                            <i className="fa fa-plus-circle ts-actions-icon" aria-hidden="true"></i>
                            <span>{__("Add Activity")}</span>
                        </a>
                    </li>
                    <li>
                        <a
                            className="ts-actions-link"
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                openPullJiraDialog(ctx, onPullJiraTasks);
                            }}
                        >
                            <i className="fa fa-cloud-download ts-actions-icon" aria-hidden="true"></i>
                            <span>{__("Pull Jira Tasks")}</span>
                        </a>
                    </li>
                    {workflowActions.length > 0 && <li className="divider"></li>}
                    {workflowActions.map((action) => (
                        <li key={action}>
                            <a
                                className="ts-actions-link"
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    runWorkflowAction(action);
                                }}
                            >
                                <i className="fa fa-random ts-actions-icon" aria-hidden="true"></i>
                                <span>{action}</span>
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
}
