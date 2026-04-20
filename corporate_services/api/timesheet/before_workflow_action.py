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
        employee = frappe.get_doc("Employee", doc.employee)
        if not employee.expense_approver:
            frappe.throw(
                _("Employee {0} does not have a Project Manager configured in Expense Approver.").format(doc.employee_name or doc.employee)
            )

    if doc.workflow_state == "Submitted to Supervisor":
        employee = frappe.get_doc("Employee", doc.employee)
        if not employee.reports_to:
            frappe.throw(
                _("Employee {0} does not have a Supervisor configured in Reports To.").format(doc.employee_name or doc.employee)
            )
