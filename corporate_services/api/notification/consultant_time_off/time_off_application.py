import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import (
    get_supervisor_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients


def build_email_body(greeting, intro, action_line, link_url, sign_off, signer):
    """Return a consistently structured HTML email body."""
    return """
        <p>{greeting},</p>
        <p>{intro}</p>
        <p>{action_line} <a href="{link}">Click here to view it</a>.</p>
        <br>
        <p>Kind regards,<br><strong>{signer}</strong></p>
    """.format(
        greeting=greeting,
        intro=intro,
        action_line=action_line,
        link=link_url,
        signer=signer,
    )


def generate_message(doc, employee_name, supervisor_name, email_type):
    url = get_url_to_form(doc.doctype, doc.name)
    doctype_label = doc.doctype

    templates = {
        "supervisor": build_email_body(
            greeting="Dear {}".format(supervisor_name),
            intro="{} has submitted a {} for your review and approval.".format(employee_name, doctype_label),
            action_line="Please review the application at your earliest convenience.",
            link_url=url,
            sign_off="Kind regards",
            signer=employee_name,
        ),
        "employee_approved": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="Good news! Your {} has been reviewed and approved by your supervisor.".format(doctype_label),
            action_line="You can view the approved application at any time.",
            link_url=url,
            sign_off="Kind regards",
            signer="Your Supervisor",
        ),
        "employee_rejected": build_email_body(
            greeting="Dear {}".format(employee_name),
            intro="We regret to inform you that your {} has been reviewed and rejected by your supervisor.".format(doctype_label),
            action_line="Please review the details and reach out to your supervisor if you have any questions.",
            link_url=url,
            sign_off="Kind regards",
            signer="Your Supervisor",
        ),
    }

    return templates[email_type]


def send_email(doc, recipients, subject, message, pdf_content, doc_name):
    recipients = filter_recipients(doc, recipients)
    if not recipients:
        return
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            "fname": "{}.pdf".format(doc_name),
            "fcontent": pdf_content,
        }],
        header=("Consultant Time Off Application", "text/html"),
    )



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

    employee = frappe.get_doc("Employee", doc.employee)
    employee_email = employee.company_email or employee.personal_email

    print_format = get_default_print_format(doc.doctype)
    pdf_content = frappe.get_print(doc.doctype, doc.name, print_format, as_pdf=True)

    if doc.workflow_state == "Submitted to Supervisor":
        if not employee.reports_to:
            return

        supervisor_contact = get_supervisor_contact(employee)

        send_email(
            doc,
            recipients=[supervisor_contact.email],
            subject=frappe._("Time Off Application from {}".format(employee.employee_name)),
            message=generate_message(doc, employee.employee_name, supervisor_contact.name, "supervisor"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )

    elif doc.workflow_state == "Approved by Supervisor":
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Time Off Application has been Approved"),
            message=generate_message(doc, employee.employee_name, None, "employee_approved"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )

    elif doc.workflow_state == "Rejected By Supervisor":
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Time Off Application has been Rejected"),
            message=generate_message(doc, employee.employee_name, None, "employee_rejected"),
            pdf_content=pdf_content,
            doc_name=doc.name,
        )


doc_events = {
    "Consultant Time Off Application": {
        "on_update": alert,
    }
}
