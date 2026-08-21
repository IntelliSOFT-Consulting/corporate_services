import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body, pdf_attachment

HEADER = "Exit Interview"


def generate_message(doc, employee_name, email_type):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        # Employee submits → Supervisor receives
        "supervisor": build_email_body(
            greeting=f"Dear {doc.custom_supervisor_name or 'Supervisor'}",
            intro=f"{employee_name} has submitted an {doc.doctype} for your review and approval.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),

        # Supervisor approves → HR receives
        "hr": build_email_body(
            greeting="Dear HR Manager",
            intro=f"You have a new {doc.doctype} for <b>{employee_name}</b>, approved by the Supervisor and submitted for your final review.",
            action_line="You can view it",
            link_url=doctype_url,
            signer=employee_name,
            cta_text="here",
        ),

        # Supervisor rejects → Employee receives
        "employee_rejected_supervisor": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately rejected by your Supervisor.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="Supervisor",
            cta_text="here",
        ),

        # HR rejects → Employee receives
        "employee_rejected_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and unfortunately rejected by the HR Department.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),

        # HR approves → Employee receives
        "employee_approved_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by the HR Department.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),
    }

    return messages[email_type]


def alert(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state not in [
        "Submitted to Supervisor",
        "Rejected By Supervisor",
        "Submitted to HR",
        "Rejected By HR",
        "Approved by HR",
    ]:
        return

    employee = frappe.get_doc("Employee", doc.employee)
    employee_email = employee.company_email or employee.personal_email

    attachments = pdf_attachment(doc)

    if doc.workflow_state == "Submitted to Supervisor":
        supervisor_contact = get_supervisor_contact(employee)
        if not supervisor_contact:
            return

        message = generate_message(doc, employee.employee_name, "supervisor")
        send_email(
            doc,
            recipients=[supervisor_contact.email],
            subject=frappe._("Exit Interview Submitted - {}".format(employee.employee_name)),
            message=message,
            header=HEADER,
            attachments=attachments,
        )

    elif doc.workflow_state == "Rejected By Supervisor":
        message = generate_message(doc, employee.employee_name, "employee_rejected_supervisor")
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Exit Interview has been Rejected by Supervisor"),
            message=message,
            header=HEADER,
            attachments=attachments,
        )

    elif doc.workflow_state == "Submitted to HR":
        hr_manager_emails = get_hr_manager_emails()

        message = generate_message(doc, employee.employee_name, "hr")
        send_email(
            doc,
            recipients=hr_manager_emails,
            subject=frappe._("Exit Interview Submitted to HR - {}".format(employee.employee_name)),
            message=message,
            header=HEADER,
            attachments=attachments,
        )

        # Tick the exit interview checkbox and set the link on the employee's OffBoarding Schedule
        offboarding = frappe.db.get_value(
            "OffBoarding Schedule",
            {"employee": doc.employee},
            "name"
        )
        if offboarding:
            frappe.db.set_value(
                "OffBoarding Schedule",
                offboarding,
                {
                    "exit_interview_with_supervisor": 1,
                    "exit_interview_link": doc.name,
                }
            )
            frappe.db.commit()

    elif doc.workflow_state == "Rejected By HR":
        message = generate_message(doc, employee.employee_name, "employee_rejected_hr")
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Exit Interview has been Rejected by HR"),
            message=message,
            header=HEADER,
            attachments=attachments,
        )

    elif doc.workflow_state == "Approved by HR":
        message = generate_message(doc, employee.employee_name, "employee_approved_hr")
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Exit Interview has been Approved by HR"),
            message=message,
            header=HEADER,
            attachments=attachments,
        )


doc_events = {
    "Exit Interview": {
        "on_update": alert
    }
}
