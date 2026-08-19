import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_hr_manager_emails,
    get_supervisor_contact,
)
from corporate_services.api.notification.dispatch_log import on_transition
from corporate_services.api.notification.mailer import send_email, build_email_body

HEADER = "Performance Appraisal"


def generate_message(doc, recipient_name, employee_name, email_type):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": build_email_body(
            greeting=f"Dear {recipient_name}",
            intro=f"A {doc.doctype} for <b>{employee_name}</b> has been initiated by HR and assigned to you for completion.",
            extra="<p>Please remember to complete it within the evaluation period.</p>",
            action_line="Kindly review, complete, and submit the appraisal back to HR",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),

        "hr": build_email_body(
            greeting="Dear HR Manager",
            intro=f"The {doc.doctype} for <b>{employee_name}</b> has been completed by the supervisor and submitted for your review and approval.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer=recipient_name,
            cta_text="here",
        ),

        "needs_clarification": build_email_body(
            greeting=f"Dear {recipient_name}",
            intro=f"HR has requested clarification on the {doc.doctype} for <b>{employee_name}</b>.",
            action_line="Please review the comments and resubmit",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),

        "employee_approved_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed and approved by the HR department.",
            action_line="You can view the details",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),

        "employee_rejected_hr": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been reviewed by the HR department but unfortunately it has been rejected.",
            action_line="You can view the feedback",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),

        "employee_submitted": build_email_body(
            greeting=f"Dear {employee_name}",
            intro=f"Your {doc.doctype} has been completed.",
            extra="<p>Should you have any questions or require clarification, please feel free to reach out to the HR or your supervisor.</p>",
            action_line="Kindly use the link provided to view your appraisal and feedback",
            link_url=doctype_url,
            signer="HR Department",
            cta_text="here",
        ),
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
        "Submitted to Employee",
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
            header=HEADER,
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
            header=HEADER,
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
            header=HEADER,
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
            header=HEADER,
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
            header=HEADER,
        )

    elif doc.workflow_state == "Submitted to Employee":
        if not employee_email:
            return

        message = generate_message(
            doc, employee.employee_name, employee.employee_name, "employee_submitted"
        )
        send_email(
            doc,
            recipients=[employee_email],
            subject=frappe._("Your Performance Appraisal is ready for review"),
            message=message,
            header=HEADER,
        )
