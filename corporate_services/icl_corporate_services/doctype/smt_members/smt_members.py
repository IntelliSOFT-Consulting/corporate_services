# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class SMTMembers(Document):
	pass


@frappe.whitelist()
def fetch_smt_members():
	frappe.only_for("System Manager")

	users = frappe.get_all(
		"Has Role", filters={"role": "SMT", "parenttype": "User"}, pluck="parent"
	)
	users = [u for u in users if u not in ("Administrator", "Guest")]

	existing_employees = set(frappe.get_all("SMT Members", pluck="employee"))

	added = 0
	skipped_no_employee = []

	for user in users:
		employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
		if not employee:
			skipped_no_employee.append(user)
			continue
		if employee in existing_employees:
			continue

		frappe.get_doc({"doctype": "SMT Members", "employee": employee}).insert(
			ignore_permissions=True
		)
		existing_employees.add(employee)
		added += 1

	frappe.db.commit()

	return {"added": added, "skipped_no_employee": skipped_no_employee}
