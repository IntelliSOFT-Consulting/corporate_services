from frappe.utils import get_url_to_form, nowdate

import frappe
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails
from corporate_services.icl_corporate_services.page.intern_weekly_progress_dashboard.intern_weekly_progress_dashboard import (
    get_dashboard_data,
    is_weekly_reminder_due,
)


def send_weekly_progress_report_reminders_if_due():
    config = frappe.get_single("HR Config")
    if not is_weekly_reminder_due(config):
        return

    data = get_dashboard_data(getattr(config, "weekly_progress_contract_type", None))
    missing_rows = data.get("missing_rows", [])
    if not missing_rows:
        frappe.db.set_value(
            "HR Config",
            "HR Config",
            "weekly_progress_last_reminder_sent_on",
            nowdate(),
            update_modified=True,
        )
        frappe.db.commit()
        return

    hr_emails = get_hr_manager_emails()
    week_start = data.get("week_start")
    week_end = data.get("week_end")

    for row in missing_rows:
        employee = frappe.get_doc("Employee", row["employee"])
        intern_recipient = employee.company_email or employee.personal_email
        if not intern_recipient:
            continue

        recipients = {intern_recipient}
        supervisor_email = _get_supervisor_email(employee)
        if supervisor_email:
            recipients.add(supervisor_email)
        for hr_email in hr_emails or []:
            recipients.add(hr_email)

        message = f"""
            <p>Dear {frappe.utils.escape_html(employee.employee_name or employee.name)},</p>
            <p>This is a reminder to submit your Weekly Progress Report.</p>
            <p><strong>Week:</strong> {frappe.utils.escape_html(str(week_start))} to {frappe.utils.escape_html(str(week_end))}</p>
            <p>Please submit by close of business.</p>
            <p>Kind regards,<br><strong>HR Department</strong></p>
        """
        frappe.sendmail(
            recipients=list(recipients),
            subject="Weekly Progress Report Reminder",
            message=message,
            header=("Weekly Progress Report", "text/html"),
        )

    frappe.db.set_value(
        "HR Config",
        "HR Config",
        "weekly_progress_last_reminder_sent_on",
        nowdate(),
        update_modified=True,
    )
    frappe.db.commit()


def _get_supervisor_email(employee):
    if not employee.reports_to:
        return None
    supervisor = frappe.db.get_value(
        "Employee",
        employee.reports_to,
        ["company_email", "personal_email"],
        as_dict=True,
    )
    if not supervisor:
        return None
    return supervisor.get("company_email") or supervisor.get("personal_email")


def _send_workflow_email(recipients, subject, message):
    if not recipients:
        return

    frappe.sendmail(
        recipients=list(dict.fromkeys([r for r in recipients if r])),
        subject=subject,
        message=message,
        header=("Weekly Progress Report", "text/html"),
    )


def alert(doc, method):
    watched_states = {
        "Submitted to Supervisor",
        "Submitted to HR",
        "Rejected By Supervisor",
        "Rejected By HR",
        "Approved by HR",
    }

    if doc.workflow_state not in watched_states:
        return

    employee = frappe.get_doc("Employee", doc.intern)
    employee_name = employee.employee_name or employee.name
    employee_email = employee.company_email or employee.personal_email
    supervisor_email = _get_supervisor_email(employee)
    hr_emails = get_hr_manager_emails()
    doc_link = get_url_to_form(doc.doctype, doc.name)

    if doc.workflow_state == "Submitted to Supervisor":
        if not supervisor_email:
            return
        _send_workflow_email(
            recipients=[supervisor_email],
            subject=f"Weekly Progress Report from {employee_name}",
            message=f"""
                <p>Dear Supervisor,</p>
                <p>{frappe.utils.escape_html(employee_name)} has submitted a Weekly Progress Report for your review.</p>
                <p><a href="{doc_link}">Open Weekly Progress Report</a></p>
                <p>Kind regards,<br><strong>HR Department</strong></p>
            """,
        )
        return

    if doc.workflow_state == "Submitted to HR":
        _send_workflow_email(
            recipients=hr_emails,
            subject=f"Weekly Progress Report pending HR review - {employee_name}",
            message=f"""
                <p>Dear HR Manager,</p>
                <p>{frappe.utils.escape_html(employee_name)}'s Weekly Progress Report has been submitted to HR.</p>
                <p><a href="{doc_link}">Open Weekly Progress Report</a></p>
                <p>Kind regards,<br><strong>Supervisor</strong></p>
            """,
        )
        return

    # Decision states notify employee only
    if not employee_email:
        return

    state_subject_map = {
        "Rejected By Supervisor": "Your Weekly Progress Report was returned by Supervisor",
        "Rejected By HR": "Your Weekly Progress Report was returned by HR",
        "Approved by HR": "Your Weekly Progress Report has been approved by HR",
    }
    state_intro_map = {
        "Rejected By Supervisor": "Your Weekly Progress Report has been returned by your supervisor for revision.",
        "Rejected By HR": "Your Weekly Progress Report has been returned by HR for revision.",
        "Approved by HR": "Your Weekly Progress Report has been fully reviewed and approved by HR.",
    }

    _send_workflow_email(
        recipients=[employee_email],
        subject=state_subject_map.get(doc.workflow_state, "Weekly Progress Report Update"),
        message=f"""
            <p>Dear {frappe.utils.escape_html(employee_name)},</p>
            <p>{state_intro_map.get(doc.workflow_state, "Your Weekly Progress Report has been updated.")}</p>
            <p><a href="{doc_link}">Open Weekly Progress Report</a></p>
            <p>Kind regards,<br><strong>HR Department</strong></p>
        """,
    )
