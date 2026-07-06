import frappe
from frappe.utils import add_days, getdate

from corporate_services.api.project import get_project_manager_employees

CLOSEOUT_PHASE = "Post-Implementation Closeout"

CHECKLIST_ITEMS = [
	"Upload lessons learned",
	"Confirm all invoices paid",
	"Archive project documents",
]


def generate_closure_checklist(doc, method):
	if doc.get("custom_project_phase") != CLOSEOUT_PHASE:
		return

	before_save = doc.get_doc_before_save()
	if before_save and before_save.get("custom_project_phase") == CLOSEOUT_PHASE:
		return

	pm_employees = get_project_manager_employees(doc.name)
	allocate_to = pm_employees[0] if pm_employees else None
	due_date = add_days(getdate(), 7)

	for item in CHECKLIST_ITEMS:
		if frappe.db.exists("Task", {"project": doc.name, "subject": item}):
			continue

		task = frappe.new_doc("Task")
		task.subject = item
		task.project = doc.name
		task.exp_end_date = due_date
		task.status = "Open"
		if allocate_to:
			task.custom_allocate_to = allocate_to
			task.custom_send_email = 1
		task.insert(ignore_permissions=True)

	frappe.db.commit()
