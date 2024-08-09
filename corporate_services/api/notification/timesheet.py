import frappe
from frappe.utils import get_url_to_form

def send_email(recipients, subject, message, pdf_content, doc_name):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            'fname': '{}.pdf'.format(doc_name),
            'fcontent': pdf_content
        }],
        header=("Timesheet Submission", "text/html")
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

        "employee_rejected_supervisor": """
            Dear {},<br><br>
            Your {} has been reviewed and unfortunately, it has been rejected. You can view the reason and details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, doctype_url, supervisor_name),

        "submitted_to_finance": """
            Dear Finance,<br><br>
            {}, {} has been reviewed and, it has been Approved by {}. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            {}
        """.format(employee_name, doc.doctype, supervisor_name, doctype_url, supervisor_name ),

        "employee_approved_finance": """
            Dear {},<br><br>
            Your {} has been reviewed and, it has been Approved by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance Department
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
        """.format(employee_name, doc.doctype, doctype_url),
        
        
        
        "employee_rejected_finance": """
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
        "Submitted to Supervisor", "Rejected By Supervisor", "Submitted to Finance", "Approved by Finance" , "Rejected by Finance"
    ]:
        employee_id = doc.employee
        
        employee = frappe.get_doc("Employee", employee_id)
        employee_email = employee.company_email or employee.personal_email


        supervisor_id = employee.reports_to
        supervisor = frappe.get_doc("Employee", supervisor_id)
        supervisor_email = supervisor.company_email or supervisor.personal_email
        supervisor_name = supervisor.employee_name


        print_format = "Standard"
        pdf_content = frappe.get_print(doc.doctype, doc.name, print_format, as_pdf=True)

        if doc.workflow_state == "Submitted to Supervisor":
            if employee.reports_to:
                
                message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
                send_email(
                    recipients=[supervisor_email],
                    subject=frappe._('Timesheet Submission from {}'.format(employee.employee_name)),
                    message=message_to_supervisor,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
             
        elif doc.workflow_state == "Approved by Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "approved_by_supervisor", supervisor_name)
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Approved by the supervisor'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )     
             
        elif doc.workflow_state == "Rejected By Supervisor":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_supervisor", supervisor_name)
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Submitted to HR":
            hr_managers = frappe.get_all('Has Role', filters={'role': 'HR Manager'}, fields=['parent'])
            hr_manager_emails = [frappe.get_value('User', hr_manager.parent, 'email') for hr_manager in hr_managers]

            message = generate_message(doc, employee.employee_name, "hr")
            send_email(
                recipients=hr_manager_emails,
                subject=frappe._('Timesheet Submission'),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Rejected By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Rejected'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
        elif doc.workflow_state == "Approved By HR":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_hr")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet has been Approved by HR'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
       
       
       
       
        elif doc.workflow_state == "Submitted to Finance":
            finance_team = frappe.get_all('Has Role', filters={'role': 'Finance'}, fields=['parent'])
            finance_team_emails = [frappe.get_value('User', finance_manager.parent, 'email') for finance_manager in finance_team]
            message_to_finance = generate_message(doc, employee.employee_name, "submitted_to_finance", supervisor_name)
            send_email(
                recipients=finance_team_emails,
                subject=frappe._('Timesheet Submission from {}'.format(employee.employee_name)),
                message=message_to_finance,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
       
        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_approved_finance")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Approved by Finance'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
            
            
            
        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "employee_rejected_finance")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Timesheet Submission has been Rejected by Finance'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            # sending email to the HR.
            hr_managers = frappe.get_all('Has Role', filters={'role': 'HR Manager'}, fields=['parent'])
            hr_manager_emails = [frappe.get_value('User', hr_manager.parent, 'email') for hr_manager in hr_managers]
            message_to_hr = generate_message(doc, employee.employee_name, "hr_finance_rejected")
            send_email(
                recipients= hr_manager_emails,
                subject=frappe._('Timesheet Submission Rejected by Finance'),
                message=message_to_hr,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

doc_events = {
    "Timesheet Submission": {
        "on_update": alert
    }
}
