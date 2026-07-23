import frappe
from frappe import _
from frappe.utils import getdate


@frappe.whitelist()
def start_kpi_cycle(review_period, employees=None, department=None, contract_type=None):
    frappe.only_for(["HR Manager", "System Manager"])

    if not review_period:
        frappe.throw(_("Review Period is required"))

    review_period = getdate(review_period)

    if isinstance(employees, str):
        employees = frappe.parse_json(employees)

    if employees:
        target_employees = frappe.get_all(
            "Employee",
            filters={"name": ["in", employees], "status": "Active"},
            fields=["name", "employee_name"],
        )
    else:
        filters = {"status": "Active"}
        if department:
            filters["department"] = department
        if contract_type:
            filters["custom_contract_type"] = contract_type
        target_employees = frappe.get_all("Employee", filters=filters, fields=["name", "employee_name"])

    if not target_employees:
        frappe.throw(_("No active employees matched your selection"))

    created, skipped = [], []

    for emp in target_employees:
        if frappe.db.exists("Employee KPI", {"employee": emp.name, "review_period": review_period}):
            skipped.append(emp.employee_name or emp.name)
            continue

        doc = frappe.get_doc(
            {
                "doctype": "Employee KPI",
                "employee": emp.name,
                "review_period": review_period,
                "workflow_state": "Draft",
            }
        )
        doc.insert(ignore_permissions=True)
        created.append(emp.employee_name or emp.name)

    frappe.db.commit()

    return {
        "created_count": len(created),
        "skipped_count": len(skipped),
        "created": created,
        "skipped": skipped,
    }
