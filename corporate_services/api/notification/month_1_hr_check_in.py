import frappe
from frappe import _
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails, get_employee_contact
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import notify, build_email_body

HEADER = "Month 1 HR Check-In"


def get_hr_recipients(doc):
    recipients = set(get_hr_manager_emails())
    if doc.hr_representative:
        hr_rep = get_employee_contact(doc.hr_representative)
        if hr_rep.user_id or hr_rep.email:
            recipients.add(hr_rep.user_id or hr_rep.email)
    return list(recipients)


def alert(doc, method):
    if not on_transition(doc):
        return

    if doc.workflow_state not in [
        "Submitted to HR",
        "Approved by HR",
        "Rejected By HR",
        "Needs Clarification",
    ]:
        return

    doctype_url = get_url_to_form(doc.doctype, doc.name)
    employee = get_employee_contact(doc.employee)

    if doc.workflow_state == "Submitted to HR":
        subject = _("Month 1 HR Check-In submitted by {0}").format(employee.name)
        message = build_email_body(
            greeting="Dear HR",
            intro=f"{employee.name} has submitted their Month 1 HR Check-In for your review.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="System",
            cta_text="here",
        )
        content = f"{employee.name} has submitted their Month 1 HR Check-In."
        notify(doc, get_hr_recipients(doc), subject, message, content, header=HEADER)
        return

    recipients = [employee.user_id or employee.email]

    if doc.workflow_state == "Approved by HR":
        subject = _("Your Month 1 HR Check-In has been approved")
        message = build_email_body(
            greeting=f"Dear {employee.name}",
            intro="Your Month 1 HR Check-In has been reviewed and approved by HR.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR",
            cta_text="here",
        )
        content = "Your Month 1 HR Check-In has been approved by HR."

    elif doc.workflow_state == "Rejected By HR":
        subject = _("Your Month 1 HR Check-In has been rejected")
        message = build_email_body(
            greeting=f"Dear {employee.name}",
            intro="Your Month 1 HR Check-In has been reviewed and rejected by HR.",
            extra=f"<p><b>HR Remarks:</b><br>{doc.hr_remarks or 'Not provided'}</p>",
            action_line="You can view the details and remarks",
            link_url=doctype_url,
            signer="HR",
            cta_text="here",
        )
        content = "Your Month 1 HR Check-In has been rejected by HR."

    else:  # Clarification Requested
        subject = _("Clarification requested on your Month 1 HR Check-In")
        message = build_email_body(
            greeting=f"Dear {employee.name}",
            intro="HR has requested clarification on your Month 1 HR Check-In before it can be approved.",
            extra=f"<p><b>HR Remarks:</b><br>{doc.hr_remarks or 'Not provided'}</p>",
            action_line="You can view the details and update your responses",
            link_url=doctype_url,
            signer="HR",
            cta_text="here",
        )
        content = "HR has requested clarification on your Month 1 HR Check-In."

    notify(doc, recipients, subject, message, content, header=HEADER)
