# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class EmployeeKPI(Document):
	def validate(self):
		if self.workflow_state and self.workflow_state != "Draft" and not (self.table_ngcr or []):
			frappe.throw(_("Please add at least one KPI before submitting."))


def _user_has_any_role(user, roles):
	return bool(set(frappe.get_roles(user)) & set(roles))


def _get_employee_for_user(user):
	return frappe.db.get_value("Employee", {"user_id": user}, "name")


def get_permission_query_conditions(user=None):
	user = user or frappe.session.user
	if not user:
		return "1=0"

	if user == "Administrator" or _user_has_any_role(user, {"System Manager", "HR Manager"}):
		return ""

	current_employee = _get_employee_for_user(user)
	if not current_employee:
		return "1=0"

	current_employee_escaped = frappe.db.escape(current_employee)

	return f"""(
		`tabEmployee KPI`.employee = {current_employee_escaped}
		OR `tabEmployee KPI`.employee IN (
			SELECT name FROM `tabEmployee` WHERE reports_to = {current_employee_escaped}
		)
	)"""


def has_permission(doc, user=None, permission_type=None):
	user = user or frappe.session.user
	if not user:
		return False

	if user == "Administrator" or _user_has_any_role(user, {"System Manager", "HR Manager"}):
		return True

	current_employee = _get_employee_for_user(user)
	if not current_employee:
		return False

	if doc.employee == current_employee:
		return True

	return bool(frappe.db.exists("Employee", {"name": doc.employee, "reports_to": current_employee}))
