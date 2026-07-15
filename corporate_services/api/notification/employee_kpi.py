import frappe
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails
from frappe.utils import get_url_to_form


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


def _send_workflow_email(doc, recipients, subject, message):
    recipients = filter_recipients(doc, list(dict.fromkeys([r for r in recipients if r])))
    if not recipients:
        return

    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        header=("Employee KPI", "text/html"),
    )


def alert(doc, method):
    watched_states = {
        "Submitted to Supervisor",
        "Submitted to HR",
        "Needs Clarification",
        "Approved by HR",
        "Rejected By HR",
        "Rejected By Supervisor",
    }

    if doc.workflow_state not in watched_states:
        return

    if not on_transition(doc):
        return

    employee = frappe.get_doc("Employee", doc.employee)
    employee_name = employee.employee_name or employee.name
    employee_email = employee.company_email or employee.personal_email
    supervisor_email = _get_supervisor_email(employee)
    hr_emails = get_hr_manager_emails()
    doc_link = get_url_to_form(doc.doctype, doc.name)

    if doc.workflow_state == "Submitted to Supervisor":
        if not supervisor_email:
            return
        _send_workflow_email(
            doc,
            recipients=[supervisor_email],
            subject=f"Employee KPI from {employee_name}",
            message=f"""
                <p>Dear Supervisor,</p>
                <p>{frappe.utils.escape_html(employee_name)} has submitted their KPI for your review.</p>
                <p><a href="{doc_link}">Open Employee KPI</a></p>
                <p>Kind regards,<br><strong>HR Department</strong></p>
            """,
        )
        return

    if doc.workflow_state == "Submitted to HR":
        _send_workflow_email(
            doc,
            recipients=hr_emails,
            subject=f"Employee KPI pending HR review - {employee_name}",
            message=f"""
                <p>Dear HR Manager,</p>
                <p>{frappe.utils.escape_html(employee_name)}'s KPI has been submitted to HR.</p>
                <p><a href="{doc_link}">Open Employee KPI</a></p>
                <p>Kind regards,<br><strong>Supervisor</strong></p>
            """,
        )
        return

    if not employee_email:
        return

    if doc.workflow_state == "Needs Clarification":
        _send_workflow_email(
            doc,
            recipients=[employee_email],
            subject=f"Clarification required on your Employee KPI - {employee_name}",
            message=f"""
                <p>Dear {frappe.utils.escape_html(employee_name)},</p>
                <p>Clarification has been requested on your Employee KPI.</p>
                <p><strong>Clarification Required:</strong><br>{frappe.utils.escape_html(doc.clarification_required or "Not provided")}</p>
                <p><a href="{doc_link}">Open Employee KPI</a></p>
                <p>Kind regards,<br><strong>HR Department</strong></p>
            """,
        )
        return

    state_subject_map = {
        "Rejected By Supervisor": "Your Employee KPI was returned by Supervisor",
        "Rejected By HR": "Your Employee KPI was returned by HR",
        "Approved by HR": "Your Employee KPI has been approved by HR",
    }
    state_intro_map = {
        "Rejected By Supervisor": "Your Employee KPI has been returned by your supervisor for revision.",
        "Rejected By HR": "Your Employee KPI has been returned by HR for revision.",
        "Approved by HR": "Your Employee KPI has been fully reviewed and approved by HR.",
    }

    _send_workflow_email(
        doc,
        recipients=[employee_email],
        subject=state_subject_map.get(doc.workflow_state, "Employee KPI Update"),
        message=f"""
            <p>Dear {frappe.utils.escape_html(employee_name)},</p>
            <p>{state_intro_map.get(doc.workflow_state, "Your Employee KPI has been updated.")}</p>
            <p><a href="{doc_link}">Open Employee KPI</a></p>
            <p>Kind regards,<br><strong>HR Department</strong></p>
        """,
    )
