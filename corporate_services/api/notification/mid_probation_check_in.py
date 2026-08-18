import frappe
from frappe import _
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients

SIGNIFICANT_CONCERN = "Significant concern - HR to be informed"


def get_submitter_contact(doc):
    user = frappe.get_doc("User", doc.owner)
    return frappe._dict(email=user.email, user_id=user.name, name=user.full_name or user.name)


def send_email(recipients, subject, message):
    recipients = [r for r in recipients if r]
    if not recipients:
        return
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        header=("Mid-Probation Check-In", "text/html"),
    )


def create_notification_log(recipient, doc, subject, content):
    if not recipient:
        return
    try:
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "subject": subject,
                "email_content": content,
                "for_user": recipient,
                "type": "Alert",
                "document_type": doc.doctype,
                "document_name": doc.name,
                "from_user": frappe.session.user,
            }
        ).insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(
            message=frappe.get_traceback(),
            title="Mid-Probation Check-In Notification Log Failed",
        )


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
    submitter = get_submitter_contact(doc)

    if doc.workflow_state == "Submitted to HR":
        recipients = filter_recipients(doc, [r for r in get_hr_manager_emails() if r])
        flagged = doc.overall_midway_position == SIGNIFICANT_CONCERN
        subject = _("{0}Mid-Probation Check-In submitted for {1}").format(
            "[Significant Concern] " if flagged else "", doc.employee_name
        )
        message = """
            Dear HR,<br><br>
            {0} has submitted a Mid-Probation Check-In for {1} for your review.
            {2}
            You can view the details <a href="{3}">here</a>.<br><br>
            Kind regards,<br>
            System
        """.format(
            submitter.name,
            doc.employee_name,
            "<br><b>This check-in has been flagged as a significant concern.</b><br>" if flagged else "",
            doctype_url,
        )
        send_email(recipients, subject, message)
        for recipient in recipients:
            create_notification_log(
                recipient, doc, subject, f"{submitter.name} has submitted a Mid-Probation Check-In for {doc.employee_name}."
            )
        return

    recipients = filter_recipients(doc, [submitter.user_id or submitter.email])

    if doc.workflow_state == "Approved by HR":
        subject = _("Mid-Probation Check-In for {0} has been approved").format(doc.employee_name)
        message = """
            Dear {0},<br><br>
            The Mid-Probation Check-In you submitted for {1} has been reviewed and approved by HR.
            You can view the details <a href="{2}">here</a>.<br><br>
            Kind regards,<br>
            HR
        """.format(submitter.name, doc.employee_name, doctype_url)
        content = f"Your Mid-Probation Check-In for {doc.employee_name} has been approved by HR."

    elif doc.workflow_state == "Rejected By HR":
        subject = _("Mid-Probation Check-In for {0} has been rejected").format(doc.employee_name)
        message = """
            Dear {0},<br><br>
            The Mid-Probation Check-In you submitted for {1} has been reviewed and rejected by HR.
            You can view the details and remarks <a href="{2}">here</a>.<br><br>
            <b>HR Remarks:</b><br>{3}<br><br>
            Kind regards,<br>
            HR
        """.format(submitter.name, doc.employee_name, doctype_url, doc.hr_remarks or "Not provided")
        content = f"Your Mid-Probation Check-In for {doc.employee_name} has been rejected by HR."

    else:  # Needs Clarification
        subject = _("Clarification requested on Mid-Probation Check-In for {0}").format(doc.employee_name)
        message = """
            Dear {0},<br><br>
            HR has requested clarification on the Mid-Probation Check-In you submitted for {1} before it can be approved.
            You can view the details and update your responses <a href="{2}">here</a>.<br><br>
            <b>HR Remarks:</b><br>{3}<br><br>
            Kind regards,<br>
            HR
        """.format(submitter.name, doc.employee_name, doctype_url, doc.hr_remarks or "Not provided")
        content = f"HR has requested clarification on the Mid-Probation Check-In for {doc.employee_name}."

    send_email(recipients, subject, message)
    for recipient in recipients:
        create_notification_log(recipient, doc, subject, content)
