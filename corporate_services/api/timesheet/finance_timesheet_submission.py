import frappe
from frappe import _

from corporate_services.api.timesheet.timesheet_generation_export import (
    SHORT_TERM_CONSULTANT_TEMPLATE,
)

def finance_timesheet_submission(doc, method):
    if doc.workflow_state == "Approved by Finance" or (
        getattr(doc, "timesheet_template", None) == SHORT_TERM_CONSULTANT_TEMPLATE
        and doc.workflow_state == "Approved"
    ):
        for timesheet in doc.timesheet_per_project:
            timesheet_doc = frappe.get_doc('Timesheet', timesheet.timesheet)
            if timesheet_doc.docstatus == 0:
                timesheet_doc.submit()
                frappe.msgprint(_("Timesheet {0} submitted successfully.").format(timesheet.timesheet))
