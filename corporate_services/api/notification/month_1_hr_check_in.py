import frappe
from frappe import _
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients


def get_employee_contact(employee_id):
    employee = frappe.get_doc("Employee", employee_id)
    return frappe._dict(
        email=employee.company_email or employee.personal_email,
        user_id=employee.user_id,
        name=employee.employee_name,
    )


def get_hr_recipients(doc):
    recipients = set(get_hr_manager_emails())
    if doc.hr_representative:
        hr_rep = get_employee_contact(doc.hr_representative)
        if hr_rep.user_id or hr_rep.email:
            recipients.add(hr_rep.user_id or hr_rep.email)
    return list(recipients)


def send_email(recipients, subject, message):
    recipients = [r for r in recipients if r]
    if not recipients:
        return
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        header=("Month 1 HR Check-In", "text/html"),
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
            title="Month 1 HR Check-In Notification Log Failed",
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
    employee = get_employee_contact(doc.employee)

    if doc.workflow_state == "Submitted to HR":
        recipients = filter_recipients(doc, get_hr_recipients(doc))
        subject = _("Month 1 HR Check-In submitted by {0}").format(employee.name)
        message = """
            Dear HR,<br><br>
            {0} has submitted their Month 1 HR Check-In for your review. You can view the details <a href="{1}">here</a>.<br><br>
            Kind regards,<br>
            System
        """.format(employee.name, doctype_url)
        send_email(recipients, subject, message)
        for recipient in recipients:
            create_notification_log(recipient, doc, subject, f"{employee.name} has submitted their Month 1 HR Check-In.")
        return

    recipients = filter_recipients(doc, [employee.user_id or employee.email])

    if doc.workflow_state == "Approved by HR":
        subject = _("Your Month 1 HR Check-In has been approved")
        message = """
            Dear {0},<br><br>
            Your Month 1 HR Check-In has been reviewed and approved by HR. You can view the details <a href="{1}">here</a>.<br><br>
            Kind regards,<br>
            HR
        """.format(employee.name, doctype_url)
        content = "Your Month 1 HR Check-In has been approved by HR."

    elif doc.workflow_state == "Rejected By HR":
        subject = _("Your Month 1 HR Check-In has been rejected")
        message = """
            Dear {0},<br><br>
            Your Month 1 HR Check-In has been reviewed and rejected by HR. You can view the details and remarks <a href="{1}">here</a>.<br><br>
            <b>HR Remarks:</b><br>{2}<br><br>
            Kind regards,<br>
            HR
        """.format(employee.name, doctype_url, doc.hr_remarks or "Not provided")
        content = "Your Month 1 HR Check-In has been rejected by HR."

    else:  # Clarification Requested
        subject = _("Clarification requested on your Month 1 HR Check-In")
        message = """
            Dear {0},<br><br>
            HR has requested clarification on your Month 1 HR Check-In before it can be approved. You can view the details and update your responses <a href="{1}">here</a>.<br><br>
            <b>HR Remarks:</b><br>{2}<br><br>
            Kind regards,<br>
            HR
        """.format(employee.name, doctype_url, doc.hr_remarks or "Not provided")
        content = "HR has requested clarification on your Month 1 HR Check-In."

    send_email(recipients, subject, message)
    for recipient in recipients:
        create_notification_log(recipient, doc, subject, content)
