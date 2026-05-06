import frappe
from frappe import _
from frappe.utils import escape_html, get_url_to_form, today

from corporate_services.api.notification.notification_contacts import get_hr_manager_emails


def _validate_employee_access(employee: str):
    if not employee:
        frappe.throw(_("Employee is required."))

    if not frappe.db.exists("Employee", employee):
        frappe.throw(_("Employee {0} was not found.").format(employee))

    employee_doc = frappe.get_doc("Employee", employee)
    if frappe.has_permission("Employee", "read", doc=employee_doc):
        return employee_doc

    frappe.throw(_("You do not have permission to access this employee."), frappe.PermissionError)


@frappe.whitelist()
def get_employee_leave_balance_summary(employee: str):
    _validate_employee_access(employee)

    allocations = frappe.db.sql(
        """
        SELECT
            la.leave_type,
            la.total_leaves_allocated,
            la.carry_forwarded_leaves_count,
            la.from_date,
            la.to_date,
            COALESCE((
                SELECT SUM(lapp.total_leave_days)
                FROM `tabLeave Application` lapp
                WHERE lapp.employee = la.employee
                  AND lapp.leave_type = la.leave_type
                  AND lapp.docstatus = 1
                  AND lapp.status = 'Approved'
                  AND lapp.from_date >= la.from_date
                  AND lapp.to_date <= la.to_date
            ), 0) AS leaves_used
        FROM `tabLeave Allocation` la
        WHERE la.employee = %(employee)s
          AND la.docstatus = 1
          AND la.from_date <= %(today)s
          AND la.to_date >= %(today)s
        ORDER BY la.leave_type ASC
        """,
        {"employee": employee, "today": today()},
        as_dict=True,
    )

    total_allocated = 0.0
    total_used = 0.0
    total_balance = 0.0

    for row in allocations:
        allocated = float(row.get("total_leaves_allocated") or 0)
        used = float(row.get("leaves_used") or 0)
        balance = allocated - used
        row["balance"] = balance

        total_allocated += allocated
        total_used += used
        total_balance += balance

    return {
        "rows": allocations,
        "totals": {
            "allocated": total_allocated,
            "used": total_used,
            "balance": total_balance,
        },
    }


@frappe.whitelist()
def raise_leave_balance_issue(employee: str, issue: str):
    employee_doc = _validate_employee_access(employee)

    issue = (issue or "").strip()
    if not issue:
        frappe.throw(_("Please provide issue details before submitting."))

    if len(issue) > 3000:
        frappe.throw(_("Issue details are too long. Please keep it under 3000 characters."))

    hr_emails = get_hr_manager_emails()
    if not hr_emails:
        frappe.throw(_("No HR email recipients are configured."))

    reporter = frappe.db.get_value("User", frappe.session.user, "full_name") or frappe.session.user
    reporter_email = frappe.db.get_value("User", frappe.session.user, "email")
    employee_email = employee_doc.company_email or employee_doc.personal_email or ""
    employee_url = get_url_to_form("Employee", employee_doc.name)

    issue_html = escape_html(issue).replace("\n", "<br>")
    message = f"""
        Dear HR Team,<br><br>
        A leave balance issue has been raised for employee <b>{escape_html(employee_doc.employee_name or employee_doc.name)}</b>
        ({escape_html(employee_doc.name)}).<br><br>
        <b>Reported by:</b> {escape_html(reporter)}<br>
        <b>Employee Email:</b> {escape_html(employee_email)}<br>
        <b>Employee Record:</b> <a href="{employee_url}">{escape_html(employee_doc.name)}</a><br><br>
        <b>Issue Details:</b><br>
        {issue_html}<br><br>
        Kind regards,<br>
        {escape_html(reporter)}
    """

    frappe.sendmail(
        recipients=hr_emails,
        subject=_("Leave Balance Issue: {0}").format(employee_doc.employee_name or employee_doc.name),
        message=message,
        header=("Leave Balance Issue", "text/html"),
        reply_to=reporter_email,
    )

    return {"status": "success"}
