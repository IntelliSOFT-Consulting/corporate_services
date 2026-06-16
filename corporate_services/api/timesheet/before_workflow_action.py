import frappe
from frappe import _

from corporate_services.api.timesheet.project_manager_approval import (
    get_approval_comment_owners,
    get_submission_project_ids,
    is_short_term_consultant_submission,
    validate_project_manager_approval_comments,
)


def before_workflow_action_timesheet_submission(doc, method):
    if method != "before_workflow_action":
        return

    selected_action = getattr(doc, "selected_workflow_action", None)

    if doc.workflow_state in ["Submitted to Supervisor", "Submitted to Project Manager"]:
        total_hours = float(doc.total_working_hours or 0)
        if total_hours <= 0:
            frappe.throw(
                _(
                    "Total Working Hours must be greater than 0 before submitting to the supervisor for {0}."
                ).format(doc.name)
            )

        has_generated_timesheets = bool(
            frappe.db.exists(
                "Timesheet",
                {"custom_timesheet_submission": doc.name, "docstatus": ("!=", 2)},
            )
        )

        if not has_generated_timesheets:
            frappe.throw(
                _(
                    "You must insert timesheet entries in the system before submitting to the supervisor for {0}."
                ).format(doc.name)
            )

    if doc.workflow_state == "Submitted to Project Manager":
        project_ids = get_submission_project_ids(doc)
        if not project_ids:
            frappe.throw(
                _("No project is linked to this submission. Add at least one project before submitting to Project Manager.")
            )

        pm_count = frappe.db.count(
            "Project Manager",
            {
                "parenttype": "Project",
                "parentfield": "custom_project_managers",
                "parent": ["in", project_ids],
            },
        )
        if pm_count <= 0:
            frappe.throw(
                _("None of the linked projects has a Project Manager configured. Please set Project Manager(s) on the linked project(s).")
            )

        if (
            selected_action == "Approve"
            and is_short_term_consultant_submission(doc)
        ):
            approved_by = get_approval_comment_owners(doc)
            if frappe.session.user not in approved_by:
                frappe.throw(
                    _(
                        "Add a comment confirming your Project Manager approval before approving this timesheet submission."
                    )
                )

    if doc.workflow_state == "Submitted to Supervisor":
        employee = frappe.get_doc("Employee", doc.employee)
        if not employee.reports_to:
            frappe.throw(
                _("Employee {0} does not have a Supervisor configured in Reports To.").format(doc.employee_name or doc.employee)
            )

        if (
            selected_action == "Approve"
            and is_short_term_consultant_submission(doc)
        ):
            validate_project_manager_approval_comments(doc)
