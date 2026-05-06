import frappe


def _compute_finance_fields(total_working_hours, employee_salary):
    total_hours = float(total_working_hours or 0)
    ctc = float(employee_salary or 0)
    salary_per_hour = (ctc / (22 * 8)) if ctc and total_hours else 0
    return {
        "total_billable_hours": total_hours,
        "salary_per_hour": salary_per_hour,
    }


@frappe.whitelist()
def fetch_ctc_and_compute(submission_name):
    """
    Fetch Employee.ctc and persist finance fields on an existing Timesheet Submission.
    Works for submitted records as well by using db-level updates.
    """
    if not submission_name:
        frappe.throw("submission_name is required")

    doc = frappe.get_doc("Timesheet Submission", submission_name)
    if not doc.employee:
        frappe.throw("Employee is missing on this Timesheet Submission.")

    ctc = frappe.db.get_value("Employee", doc.employee, "ctc")
    ctc_value = float(ctc or 0)
    if ctc_value <= 0:
        frappe.throw("No CTC found on the linked Employee record.")

    finance = _compute_finance_fields(doc.total_working_hours, ctc_value)
    updates = {
        "employee_salary": ctc_value,
        "total_billable_hours": finance["total_billable_hours"],
        "salary_per_hour": finance["salary_per_hour"],
    }
    frappe.db.set_value("Timesheet Submission", doc.name, updates, update_modified=False)
    frappe.db.commit()

    return {
        "status": "success",
        "name": doc.name,
        "employee_salary": updates["employee_salary"],
        "total_billable_hours": updates["total_billable_hours"],
        "salary_per_hour": updates["salary_per_hour"],
    }


@frappe.whitelist()
def backfill_timesheet_submission_ctc(dry_run=True, limit=None):
    """Backfill missing employee_salary (CTC) from Employee.ctc and compute finance fields."""
    if isinstance(dry_run, str):
        dry_run = dry_run.strip().lower() in ("1", "true", "yes", "y")
    if isinstance(limit, str):
        limit = int(limit) if limit.strip() else None

    filters = {"docstatus": ["!=", 2], "employee": ["is", "set"]}
    rows = frappe.get_all(
        "Timesheet Submission",
        filters=filters,
        fields=["name", "employee", "employee_salary"],
        limit_page_length=limit or 0,
        order_by="creation asc",
    )

    checked = 0
    updated = 0
    skipped_no_ctc = 0
    already_set = 0
    changes = []

    for row in rows:
        checked += 1
        current_salary = float(row.get("employee_salary") or 0)
        if current_salary > 0:
            already_set += 1
            continue

        ctc = frappe.db.get_value("Employee", row["employee"], "ctc")
        ctc_value = float(ctc or 0)
        if ctc_value <= 0:
            skipped_no_ctc += 1
            continue

        changes.append(
            {
                "timesheet_submission": row["name"],
                "employee": row["employee"],
                "old_employee_salary": current_salary,
                "new_employee_salary": ctc_value,
            }
        )

        if not dry_run:
            finance = _compute_finance_fields(
                frappe.db.get_value("Timesheet Submission", row["name"], "total_working_hours"),
                ctc_value,
            )
            frappe.db.set_value(
                "Timesheet Submission",
                row["name"],
                {
                    "employee_salary": ctc_value,
                    "total_billable_hours": finance["total_billable_hours"],
                    "salary_per_hour": finance["salary_per_hour"],
                },
                update_modified=False,
            )
            updated += 1

    if not dry_run and updated:
        frappe.db.commit()

    return {
        "dry_run": dry_run,
        "checked": checked,
        "updated": updated,
        "already_set": already_set,
        "skipped_no_ctc": skipped_no_ctc,
        "candidates": len(changes),
        "changes": changes[:200],
        "changes_truncated": max(len(changes) - 200, 0),
    }
