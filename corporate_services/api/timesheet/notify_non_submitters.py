import json
import frappe
from frappe import _

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _format_month_year(value):
    """Convert 'MM-YYYY' → 'Month YYYY' for display in emails."""
    if not value or "-" not in value:
        return value or ""
    try:
        month_str, year_str = value.split("-", 1)
        month = int(month_str)
        if 1 <= month <= 12:
            return f"{MONTH_NAMES[month]} {year_str}"
    except (ValueError, IndexError):
        pass
    return value


@frappe.whitelist()
def notify_non_submitters(month_year, employee_list):
    """
    Send a timesheet-submission reminder email to each employee in the list.

    Args:
        month_year   (str):  Period in 'MM-YYYY' or 'Month YYYY' format.
        employee_list (str): JSON-encoded list of Employee document names.
    """
    # Allow HR Manager, Finance, System Manager, and supervisors to call this
    allowed_roles = {"System Manager", "HR Manager", "Finance", "HR User"}
    user_roles = set(frappe.get_roles(frappe.session.user))

    # Check if user is a supervisor (has active reportees)
    is_supervisor = False
    if not user_roles & allowed_roles:
        emp = frappe.db.get_value(
            "Employee",
            {"user_id": frappe.session.user, "status": "Active"},
            "name",
        )
        if emp:
            reportee_count = frappe.db.count(
                "Employee", {"reports_to": emp, "status": "Active"}
            )
            is_supervisor = reportee_count > 0

    if not (user_roles & allowed_roles or is_supervisor):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    if isinstance(employee_list, str):
        employee_list = json.loads(employee_list)

    if not employee_list:
        return _("No employees provided.")

    month_display = _format_month_year(month_year)
    sent, errors = 0, []

    for emp_id in employee_list:
        try:
            employee = frappe.get_doc("Employee", emp_id)
            email = employee.company_email or employee.personal_email

            if not email:
                errors.append(f"{employee.employee_name}: no email address on file")
                continue

            message = f"""
                Dear {employee.employee_name},<br><br>
                This is a friendly reminder that your <strong>Timesheet Submission</strong>
                for <strong>{month_display}</strong> has not been received yet.<br><br>
                Please submit your timesheet at your earliest convenience to ensure
                timely payroll and project processing.<br><br>
                Kind regards,<br>
                HR Department
            """

            frappe.sendmail(
                recipients=[email],
                subject=f"Reminder: Timesheet Submission for {month_display}",
                message=message,
                header=("Timesheet Reminder", "text/html"),
            )
            sent += 1

        except Exception as exc:
            errors.append(f"{emp_id}: {exc}")

    result = f"Reminder sent to {sent} employee(s)."
    if errors:
        result += "<br>Issues: " + "; ".join(errors)
    return result
