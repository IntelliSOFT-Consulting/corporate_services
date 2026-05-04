import frappe
from frappe import _
from frappe.utils import cint

def before_workflow_action_timesheet_submission(doc, method):
    if method != "before_workflow_action":
        return

    if doc.workflow_state in ["Submitted to Supervisor", "Submitted to Project Manager"]:
        has_uploaded_timesheet = bool(doc.timesheet)
        has_imported_flag = cint(doc.timesheet_imported) == 1
        has_generated_timesheets = bool(
            frappe.db.exists(
                "Timesheet",
                {"custom_timesheet_submission": doc.name, "docstatus": ("!=", 2)},
            )
        )

        if not (has_uploaded_timesheet or has_imported_flag or has_generated_timesheets):
            frappe.throw(
                _(
                    "You must upload and import a timesheet before submitting to the supervisor for {0}."
                ).format(doc.name)
            )

    if doc.workflow_state == "Submitted to Project Manager":
        project_ids = list(
            {
                row.project
                for row in (doc.get("timesheet_per_project") or [])
                if getattr(row, "project", None)
            }
        )
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

    if doc.workflow_state == "Submitted to Supervisor":
        employee = frappe.get_doc("Employee", doc.employee)
        if not employee.reports_to:
            frappe.throw(
                _("Employee {0} does not have a Supervisor configured in Reports To.").format(doc.employee_name or doc.employee)
            )
