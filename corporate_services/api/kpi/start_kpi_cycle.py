import frappe
from frappe import _
from frappe.utils import getdate


@frappe.whitelist()
def start_kpi_cycle(
    review_period_start,
    review_period_end,
    submission_deadline=None,
    employees=None,
    department=None,
    contract_type=None,
):
    frappe.only_for(["HR Manager", "System Manager"])

    if not review_period_start or not review_period_end:
        frappe.throw(_("Review Period Start and End are required"))

    review_period_start = getdate(review_period_start)
    review_period_end = getdate(review_period_end)

    if review_period_end < review_period_start:
        frappe.throw(_("Review Period End cannot be before Review Period Start"))

    submission_deadline = getdate(submission_deadline) if submission_deadline else None

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
        if frappe.db.exists(
            "Employee KPI",
            {
                "employee": emp.name,
                "review_period_start": review_period_start,
                "review_period_end": review_period_end,
            },
        ):
            skipped.append(emp.employee_name or emp.name)
            continue

        doc = frappe.get_doc(
            {
                "doctype": "Employee KPI",
                "employee": emp.name,
                "review_period_start": review_period_start,
                "review_period_end": review_period_end,
                "submission_deadline": submission_deadline,
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
