import frappe
from frappe import _
from corporate_services.api.timesheet.timesheet_import import get_default_activity_type


def ensure_timesheet_activity_types(timesheet_doc):
    default_activity_type = get_default_activity_type()
    if not default_activity_type:
        return

    changed = False
    for data in timesheet_doc.time_logs:
        if not data.activity_type:
            data.activity_type = default_activity_type
            changed = True

    if changed:
        timesheet_doc.save(ignore_permissions=True)

def finance_timesheet_submission(doc, method):
    if doc.workflow_state in ["Approved by Finance", "Approved"]:
        for timesheet in doc.timesheet_per_project:
            timesheet_doc = frappe.get_doc('Timesheet', timesheet.timesheet)
            if timesheet_doc.docstatus == 0:
                if getattr(timesheet_doc, "custom_timesheet_type", None) == "Short Term Consultant":
                    ensure_timesheet_activity_types(timesheet_doc)
                timesheet_doc.submit()
                frappe.msgprint(_("Timesheet {0} submitted successfully.").format(timesheet.timesheet))
