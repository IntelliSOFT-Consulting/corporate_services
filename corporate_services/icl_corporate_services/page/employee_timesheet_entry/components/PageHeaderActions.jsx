import React from "react";

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
