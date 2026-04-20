import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_hr_manager_emails, get_supervisor_contact

def send_email(recipients, subject, message):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        header=("Leave Application", "text/html")
    )

def generate_message(doc, employee_name, email_type, sender_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": """
            Dear {},<br><br>
            I have submitted my {} for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, sender_name or employee_name),
        "employee_approve_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by your supervisor, and it has now been submitted to HR for final review. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Supervisor
        """.format(employee_name, doc.doctype, doctype_url),
        "employee_approved_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and approved by your supervisor. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Supervisor
        """.format(employee_name, doc.doctype, doctype_url),
        "employee_rejected_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Supervisor
        """.format(employee_name, doc.doctype, doctype_url),
        "hr": """
            Dear HR Manager,<br><br>
            You have a new {} for {}, submitted for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(doc.doctype,employee_name, doctype_url, employee_name),
        "employee_rejected_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url),
        "employee_approved_hr": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved By HR. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR Department
        """.format(employee_name, doc.doctype, doctype_url)
    }
    
    return messages[email_type]

def alert(doc, method):
    if doc.workflow_state in [
        "Submitted to Supervisor", "Approved by Supervisor", "Rejected By Supervisor", "Submitted to HR", "Rejected By HR", "Approved By HR", "Approved by HR"
    ]:
        employee_id = doc.employee
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                supervisor_contact = get_supervisor_contact(employee)

                message = generate_message(
                    doc,
                    supervisor_contact.name,
                    "supervisor",
                    sender_name=employee.employee_name
                )
                send_email(
                    recipients=[supervisor_contact.email],
                    subject=frappe._('Leave Application from {}'.format(employee.employee_name)),
                    message=message
                )
        
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_supervisor")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Leave Application has been Approved by Supervisor'),
                message=message_to_employee
            )
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Leave Application has been Rejected'),
                message=message_to_employee
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_manager_emails = get_hr_manager_emails()

            message_to_hr = generate_message(doc, employee.employee_name, "hr")
            send_email(
                recipients=hr_manager_emails,
                subject=frappe._('Leave Application'),
                message=message_to_hr
            )

            message_to_employee = generate_message(doc, employee.employee_name, "employee_approve_supervisor")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Leave Application has been Approved by Supervisor and Submitted to HR'),
                message=message_to_employee
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Leave Application has been Rejected'),
                message=message_to_employee
            )
        elif doc.workflow_state in ["Approved By HR", "Approved by HR"]:
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Leave Application has been Approved by HR'),
                message=message_to_employee
            )

doc_events = {
    "Leave Application": {
        "on_update": alert
    }
}
