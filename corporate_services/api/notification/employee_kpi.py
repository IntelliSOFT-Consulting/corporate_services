import frappe
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails
from corporate_services.api.notification.mailer import send_email, build_email_body
from frappe.utils import format_date, get_url_to_form

HEADER = "Employee KPI"


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
    send_email(doc, recipients, subject, message, header=HEADER)


def send_creation_reminder(doc, method):
    if doc.kpi_reminder_sent:
        return

    employee = frappe.get_doc("Employee", doc.employee)
    employee_name = employee.employee_name or employee.name
    employee_email = employee.company_email or employee.personal_email

    if not employee_email:
        return

    supervisor_email = _get_supervisor_email(employee)
    doc_link = get_url_to_form(doc.doctype, doc.name)
    deadline_text = format_date(doc.submission_deadline) if doc.submission_deadline else None
    period_text = f"{format_date(doc.review_period_start, 'MMM yyyy')} - {format_date(doc.review_period_end, 'MMM yyyy')}"

    recipients = [employee_email]
    cc = [supervisor_email] if supervisor_email else []

    message = build_email_body(
        greeting=f"Dear {frappe.utils.escape_html(employee_name)}",
        intro=f"A new KPI cycle has been started for the review period <strong>{period_text}</strong>.",
        extra=f"<p>Please fill in your KPIs and submit them to your supervisor for review{f' by <strong>{deadline_text}</strong>' if deadline_text else ''}.</p>",
        action_line="You can access the form",
        link_url=doc_link,
        signer="HR Department",
        cta_text="here",
    )
    send_email(doc, recipients, f"Action Required: Fill in your KPI for {period_text}", message, header=HEADER, cc=cc, dedup=False)

    doc.db_set("kpi_reminder_sent", 1, update_modified=False)


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
            message=build_email_body(
                greeting="Dear Supervisor",
                intro=f"{frappe.utils.escape_html(employee_name)} has submitted their KPI for your review.",
                action_line="You can view it",
                link_url=doc_link,
                signer="HR Department",
                cta_text="here",
            ),
        )
        return

    if doc.workflow_state == "Submitted to HR":
        _send_workflow_email(
            doc,
            recipients=hr_emails,
            subject=f"Employee KPI pending HR review - {employee_name}",
            message=build_email_body(
                greeting="Dear HR Manager",
                intro=f"{frappe.utils.escape_html(employee_name)}'s KPI has been submitted to HR.",
                action_line="You can view it",
                link_url=doc_link,
                signer="Supervisor",
                cta_text="here",
            ),
        )
        return

    if not employee_email:
        return

    if doc.workflow_state == "Needs Clarification":
        _send_workflow_email(
            doc,
            recipients=[employee_email],
            subject=f"Clarification required on your Employee KPI - {employee_name}",
            message=build_email_body(
                greeting=f"Dear {frappe.utils.escape_html(employee_name)}",
                intro="Clarification has been requested on your Employee KPI.",
                extra=f"<p><strong>Clarification Required:</strong><br>{frappe.utils.escape_html(doc.clarification_required or 'Not provided')}</p>",
                action_line="You can view it",
                link_url=doc_link,
                signer="HR Department",
                cta_text="here",
            ),
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
        message=build_email_body(
            greeting=f"Dear {frappe.utils.escape_html(employee_name)}",
            intro=state_intro_map.get(doc.workflow_state, "Your Employee KPI has been updated."),
            action_line="You can view it",
            link_url=doc_link,
            signer="HR Department",
            cta_text="here",
        ),
    )
