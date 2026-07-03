import frappe
from frappe import _
from frappe.utils import today

from hrms.hr.doctype.leave_application.leave_application import get_leave_details


def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		{"label": _("Employee"), "fieldname": "employee", "fieldtype": "Link", "options": "Employee", "width": 120},
		{"label": _("Employee Name"), "fieldname": "employee_name", "fieldtype": "Data", "width": 180},
		{"label": _("Department"), "fieldname": "department", "fieldtype": "Link", "options": "Department", "width": 150},
		{"label": _("Leave Type"), "fieldname": "leave_type", "fieldtype": "Link", "options": "Leave Type", "width": 160},
		{"label": _("Total Allocated Leaves"), "fieldname": "total_allocated", "fieldtype": "Float", "width": 140},
		{"label": _("Expired Leaves"), "fieldname": "expired_leaves", "fieldtype": "Float", "width": 120},
		{"label": _("Used Leaves"), "fieldname": "used_leaves", "fieldtype": "Float", "width": 110},
		{"label": _("Leaves Pending Approval"), "fieldname": "pending_leaves", "fieldtype": "Float", "width": 170},
		{"label": _("Available Leaves"), "fieldname": "available_leaves", "fieldtype": "Float", "width": 130},
	]


def get_data(filters):
	as_on_date = filters.get("date") or today()
	leave_type_filter = filters.get("leave_type")

	employee_filters = {"status": "Active", "company": filters.get("company")}
	if filters.get("department"):
		employee_filters["department"] = filters.get("department")
	if filters.get("employee"):
		employee_filters["name"] = filters.get("employee")

	employees = frappe.get_list(
		"Employee",
		filters=employee_filters,
		fields=["name", "employee_name", "department"],
	)

	if leave_type_filter:
		leave_types = [leave_type_filter]
	else:
		leave_types = frappe.db.sql_list("SELECT name FROM `tabLeave Type` ORDER BY name ASC")

	data = []
	for emp in employees:
		available_leave = get_leave_details(emp.name, as_on_date)
		allocations = available_leave.get("leave_allocation", {})

		for leave_type in leave_types:
			if leave_type not in allocations:
				continue

			details = allocations[leave_type]
			data.append({
				"employee": emp.name,
				"employee_name": emp.employee_name,
				"department": emp.department,
				"leave_type": leave_type,
				"total_allocated": details.get("total_leaves", 0),
				"expired_leaves": details.get("expired_leaves", 0),
				"used_leaves": details.get("leaves_taken", 0),
				"pending_leaves": details.get("leaves_pending_approval", 0),
				"available_leaves": details.get("remaining_leaves", 0),
			})

	return data
