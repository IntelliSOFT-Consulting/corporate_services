import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import (
    get_finance_team_emails,
    get_hr_manager_emails,
    get_supervisor_contact,
)


def send_email(recipients, subject, message):
    recipients = [email for email in (recipients or []) if email]
    if not recipients:
        return

    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        header=("Travel Request", "text/html")
    )

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor": """
            Dear {},<br><br>
            I have submitted my {} for your review and approval. You can view it <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(supervisor_name, doc.doctype, doctype_url, employee_name),
        
        "approved_by_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and Approved by your supervisor. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),

        "supervisor_rejected": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the reason and details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),

        "submitted_to_finance": """
            Dear Finance,<br><br>
            {}, {} has been reviewed and, it has been Approved by their Supervisor. You can view the details <a href="{}">here</a>.<br><br>
            
        """.format(employee_name, doc.doctype, doctype_url ),

        "finance_approved": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
        """.format(employee_name, doc.doctype, doctype_url),

        "finance_rejected": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Rejected by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
        """.format(employee_name, doc.doctype, doctype_url),
        
        "hr_finance_rejected": """
            Dear HR,<br><br>
            {}, {} has been reviewed and, it has been Rejected by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
        """.format(employee_name, doc.doctype, doctype_url),
    }
    return messages[email_type]

def alert(doc, method):
    if doc.workflow_state in [
        "Submitted to Supervisor","Approved by Supervisor", "Rejected By Supervisor",  "Approved by HR", "Submitted to Finance", "Approved by Finance" , "Rejected by Finance"
    ]:
        employee_id = doc.employee
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email


        supervisor_contact = get_supervisor_contact(employee)
        supervisor_email = supervisor_contact.email if supervisor_contact else None
        supervisor_name = supervisor_contact.name if supervisor_contact else None

        finance_team_emails = get_finance_team_emails()
        hr_manager_emails = get_hr_manager_emails()

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
                send_email(
                    recipients=[supervisor_email],
                    subject=frappe._('Travel Request from {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                )
             
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Approved by the supervisor'),
                message=message_to_employee,
            )     

        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "supervisor_rejected", supervisor_name)
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Rejected'),
                message=message_to_employee,
            )
          
        elif doc.workflow_state == "Submitted to Finance":
            
            message_to_finance = generate_message(doc, employee.employee_name, "submitted_to_finance")
            send_email(
                recipients=finance_team_emails,
                subject=frappe._('Travel Request from {}'.format(employee.employee_name)),
                message=message_to_finance,
            )

            if supervisor_email:
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name)
                send_email(
                    recipients=[supervisor_email],
                    subject=frappe._('Submission of Travel Request for {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                )
       
        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "finance_approved")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Approved by Finance'),
                message=message_to_employee,
            )
          
        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "finance_rejected")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Travel Request has been Rejected by Finance'),
                message=message_to_employee,
            )

            message_to_hr = generate_message(doc, employee.employee_name, "hr_finance_rejected")
            send_email(
                recipients= hr_manager_emails,
                subject=frappe._('Travel Request Rejected by Finance'),
                message=message_to_hr,
            )

doc_events = {
    "Travel Request": {
        "on_update": alert
    }
}
