import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients


def send_email(doc, recipients, subject, message, cc=None):
    recipients = filter_recipients(doc, recipients)
    if not recipients:
        return
    frappe.sendmail(
        recipients=recipients,
        cc=cc,
        subject=subject,
        message=message,
        header=("Performance Appraisal", "text/html"),
    )


def generate_message(doc, recipient_name, employee_name, email_type):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": """
            Dear {},<br><br>
            A {} for <b>{}</b> has been initiated by HR and assigned to you for completion.
            Kindly review and complete the appraisal <a href="{}">here</a>, then submit it back to HR.<br><br>
            Please remember to complete it within the evaluation period.<br><br>
            Kind regards,<br>
            HR Department
        """.format(recipient_name, doc.doctype, employee_name, doctype_url),

        "hr": """
            Dear HR Manager,<br><br>
            The {} for <b>{}</b> has been completed by the supervisor and submitted for your review and approval.
            You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(doc.doctype, employee_name, doctype_url, recipient_name),

        "needs_clarification": """
            Dear {},<br><br>
            HR has requested clarification on the {} for <b>{}</b>.
            Please review the comments and resubmit <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(recipient_name, doc.doctype, employee_name, doctype_url),

        "employee_approved_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by the HR department.
            You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),

        "employee_rejected_hr": """
            Dear {},<br><br>
            Your {} has been reviewed by the HR department but unfortunately it has been rejected.
            You can view the feedback <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),
    }

    return messages[email_type]


def alert(doc, method):
    if not on_transition(doc):
        return
    notify_states = [
        "Submitted to Supervisor",
        "Submitted to HR",
        "Needs Clarification",
        "Approved by HR",
        "Rejected By HR",
    ]
    if getattr(doc, "workflow_state", None) not in notify_states:
        return

    employee = frappe.get_doc("Employee", doc.employee)
    employee_email = employee.company_email or employee.personal_email

    if doc.workflow_state == "Submitted to Supervisor":
        supervisor_contact = get_supervisor_contact(employee)
        if not supervisor_contact:
            return

        message = generate_message(
            doc, supervisor_contact.name, employee.employee_name, "supervisor"
        )
        send_email(
            doc,
            recipients=[supervisor_contact.email],
            cc=[employee_email] if employee_email else None,
            subject=frappe._("Performance Appraisal to complete for {}".format(employee.employee_name)),
            message=message,
        )

    elif doc.workflow_state == "Submitted to HR":
        message = generate_message(
            doc, employee.employee_name, employee.employee_name, "hr"
        )
        send_email(
            doc,
            recipients=get_hr_manager_emails(),
            subject=frappe._("Performance Appraisal submitted for {}".format(employee.employee_name)),
            message=message,
        )

    elif doc.workflow_state == "Needs Clarification":
        supervisor_contact = get_supervisor_contact(employee)
        if not supervisor_contact:
            return

        message = generate_message(
            doc, supervisor_contact.name, employee.employee_name, "needs_clarification"
        )
        send_email(
            doc,
            recipients=[supervisor_contact.email],
            subject=frappe._("Clarification requested on Performance Appraisal for {}".format(employee.employee_name)),
            message=message,
        )

    elif doc.workflow_state == "Approved by HR":
        message = generate_message(
            doc, employee.employee_name, employee.employee_name, "employee_approved_hr"
        )
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Performance Appraisal has been Approved"),
            message=message,
        )

    elif doc.workflow_state == "Rejected By HR":
        message = generate_message(
            doc, employee.employee_name, employee.employee_name, "employee_rejected_hr"
        )
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Performance Appraisal has been Rejected"),
            message=message,
        )
