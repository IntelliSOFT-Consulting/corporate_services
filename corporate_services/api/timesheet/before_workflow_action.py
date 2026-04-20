import frappe
from frappe import _

def before_workflow_action_timesheet_submission(doc, method):
    if doc.workflow_state in ["Submitted to Supervisor", "Submitted to Project Manager"] and not doc.timesheet:
        frappe.throw(_("You must upload a timesheet before submitting to the supervisor for {0}.").format(doc.name))

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
