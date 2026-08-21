import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_supervisor_contact,
    get_employee_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body, pdf_attachment

HEADER = "Consultant Time Off Application"


def generate_message(doc, employee_name, supervisor_name, email_type):
    url = get_url_to_form(doc.doctype, doc.name)
    doctype_label = doc.doctype

    templates = {
        "supervisor": build_email_body(
            greeting="Dear {}".format(supervisor_name),
            intro="{} has submitted a {} for your review and approval.".format(employee_name, doctype_label),
            action_line="Please review the application at your earliest convenience.",
            link_url=url,
            signer=employee_name,
        ),
        "employee_approved": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="Good news! Your {} has been reviewed and approved by your supervisor.".format(doctype_label),
            action_line="You can view the approved application at any time.",
            link_url=url,
            signer="Your Supervisor",
        ),
        "employee_rejected": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="We regret to inform you that your {} has been reviewed and rejected by your supervisor.".format(doctype_label),
            action_line="Please review the details and reach out to your supervisor if you have any questions.",
            link_url=url,
            signer="Your Supervisor",
        ),
    }

    return templates[email_type]


def alert(doc, method):
    if not on_transition(doc):
        return
    WATCHED_STATES = {
        "Submitted to Supervisor",
        "Approved by Supervisor",
        "Rejected By Supervisor",
    }

    if doc.workflow_state not in WATCHED_STATES:
        return

    employee = get_employee_contact(doc.employee)

    attachments = pdf_attachment(doc)

    if doc.workflow_state == "Submitted to Supervisor":
        supervisor_contact = get_supervisor_contact(employee.employee)
        if not supervisor_contact:
            return

        send_email(
            doc,
            recipients=[supervisor_contact.email],
            subject=frappe._("Time Off Application from {}".format(employee.name)),
            message=generate_message(doc, employee.name, supervisor_contact.name, "supervisor"),
            header=HEADER,
            attachments=attachments,
        )

    elif doc.workflow_state == "Approved by Supervisor":
        send_email(
            doc,
            recipients=[employee.email],
            subject=frappe._("Your Time Off Application has been Approved"),
            message=generate_message(doc, employee.name, None, "employee_approved"),
            header=HEADER,
            attachments=attachments,
        )

    elif doc.workflow_state == "Rejected By Supervisor":
        send_email(
            doc,
            recipients=[employee.email],
            subject=frappe._("Your Time Off Application has been Rejected"),
            message=generate_message(doc, employee.name, None, "employee_rejected"),
            header=HEADER,
            attachments=attachments,
        )


doc_events = {
    "Consultant Time Off Application": {
        "on_update": alert,
    }
}
