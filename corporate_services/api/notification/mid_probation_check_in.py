import frappe
from frappe import _
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails, get_user_contact
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import notify, build_email_body

SIGNIFICANT_CONCERN = "Significant concern - HR to be informed"
HEADER = "Mid-Probation Check-In"


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
    submitter = get_user_contact(doc.owner)

    if doc.workflow_state == "Submitted to HR":
        flagged = doc.overall_midway_position == SIGNIFICANT_CONCERN
        subject = _("{0}Mid-Probation Check-In submitted for {1}").format(
            "[Significant Concern] " if flagged else "", doc.employee_name
        )
        message = build_email_body(
            greeting="Dear HR",
            intro=f"{submitter.name} has submitted a Mid-Probation Check-In for {doc.employee_name} for your review.",
            extra="<p><b>This check-in has been flagged as a significant concern.</b></p>" if flagged else "",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="System",
            cta_text="here",
        )
        content = f"{submitter.name} has submitted a Mid-Probation Check-In for {doc.employee_name}."
        notify(doc, get_hr_manager_emails(), subject, message, content, header=HEADER)
        return

    recipients = [submitter.user_id or submitter.email]

    if doc.workflow_state == "Approved by HR":
        subject = _("Mid-Probation Check-In for {0} has been approved").format(doc.employee_name)
        message = build_email_body(
            greeting=f"Dear {submitter.name}",
            intro=f"The Mid-Probation Check-In you submitted for {doc.employee_name} has been reviewed and approved by HR.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR",
            cta_text="here",
        )
        content = f"Your Mid-Probation Check-In for {doc.employee_name} has been approved by HR."

    elif doc.workflow_state == "Rejected By HR":
        subject = _("Mid-Probation Check-In for {0} has been rejected").format(doc.employee_name)
        message = build_email_body(
            greeting=f"Dear {submitter.name}",
            intro=f"The Mid-Probation Check-In you submitted for {doc.employee_name} has been reviewed and rejected by HR.",
            extra=f"<p><b>HR Remarks:</b><br>{doc.hr_remarks or 'Not provided'}</p>",
            action_line="You can view the details and remarks",
            link_url=doctype_url,
            signer="HR",
            cta_text="here",
        )
        content = f"Your Mid-Probation Check-In for {doc.employee_name} has been rejected by HR."

    else:  # Needs Clarification
        subject = _("Clarification requested on Mid-Probation Check-In for {0}").format(doc.employee_name)
        message = build_email_body(
            greeting=f"Dear {submitter.name}",
            intro=f"HR has requested clarification on the Mid-Probation Check-In you submitted for {doc.employee_name} before it can be approved.",
            extra=f"<p><b>HR Remarks:</b><br>{doc.hr_remarks or 'Not provided'}</p>",
            action_line="You can view the details and update your responses",
            link_url=doctype_url,
            signer="HR",
            cta_text="here",
        )
        content = f"HR has requested clarification on the Mid-Probation Check-In for {doc.employee_name}."

    notify(doc, recipients, subject, message, content, header=HEADER)
