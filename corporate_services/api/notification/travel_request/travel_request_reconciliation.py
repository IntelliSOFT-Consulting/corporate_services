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
        header=("Travel Request Reconciliation", "text/html")
    )

def generate_message(doc, employee_name, email_type, supervisor_name=None):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    messages = {
        "supervisor_update": """
            Dear {},<br><br>
            {}, has submitted the Travel Request Reconciliation, for the recent travel. <br><br> Thank you.
        """.format(supervisor_name, employee_name),

        "submitted_to_finance": """
            Dear Finance,<br><br>
            {}</b> Travel Request Reconciliation submitted by <b>{}</b> has been submitted to Finance for further review and approval. You can view the details by clicking <a href="{}">here</a>.<br><br>
            Thank you for your prompt attention.<br><br>
            Best regards,<br>
            ERPNext Travel Module.
        """.format(employee_name, employee_name, doc.doctype, doctype_url),

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

        "supervisor": """
            Dear {},<br><br>
            {}, has submitted the Travel Request Reconciliation, for the recent travel. <br><br> Thank you.
        """.format(supervisor_name, employee_name)
    }
    return messages[email_type]

def alert(doc, method):
    if doc.workflow_state in [
        "Submitted to Finance", "Approved by Finance" , "Rejected by Finance"
    ]:
        
        travel_request_doc = frappe.get_doc("Travel Request", doc.travel_request)

        employee_id = travel_request_doc.employee
        
        employee = frappe.get_doc("Employee", employee_id)
        
        employee_email = employee.company_email or employee.personal_email

        supervisor_id = employee.reports_to
        supervisor = frappe.get_doc("Employee", supervisor_id)
        supervisor_email = supervisor.company_email or supervisor.personal_email
        supervisor_name = supervisor.employee_name
        
        finance_team = frappe.get_all('Has Role', filters={'role': 'Finance'}, fields=['parent'])
        finance_team_emails = [frappe.get_value('User', finance_manager.parent, 'email') for finance_manager in finance_team]
        
        hr_managers = frappe.get_all('Has Role', filters={'role': 'HR Manager'}, fields=['parent'])
        hr_manager_emails = [frappe.get_value('User', hr_manager.parent, 'email') for hr_manager in hr_managers]

        print_format = "Standard"
        pdf_content = frappe.get_print(doc.doctype, doc.name, print_format, as_pdf=True)

        if doc.workflow_state == "Submitted to Finance":
            
            message_to_finance = generate_message(doc, employee.employee_name, "submitted_to_finance")
            send_email(
                recipients=finance_team_emails,
                subject=frappe._('Travel Request Reconciliation from {}'.format(employee.employee_name)),
                message=message_to_finance,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
            
            message_to_supervisor = generate_message(doc, employee.employee_name, "supervisor", supervisor_name )
            send_email(
                recipients=[supervisor_email],
                subject=frappe._('Submission of Travel Request Reconciliation for {}'.format(employee.employee_name)),
                message=message_to_supervisor,
                pdf_content=pdf_content,
                doc_name=doc.name
                )
       
        elif doc.workflow_state == "Approved by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "finance_approved")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Travel Request Reconciliation has been Approved by Finance'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )
          
        elif doc.workflow_state == "Rejected by Finance":
            message_to_employee = generate_message(doc, employee.employee_name, "finance_rejected")
            send_email(
                recipients=[employee_email],
                subject=frappe._('Your Travel Request Reconciliation has been Rejected by Finance'),
                message=message_to_employee,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

            message_to_hr = generate_message(doc, employee.employee_name, "hr_finance_rejected")
            send_email(
                recipients= hr_manager_emails,
                subject=frappe._('Travel Request Reconciliation Rejected by Finance'),
                message=message_to_hr,
                pdf_content=pdf_content,
                doc_name=doc.name
            )

doc_events = {
    "Travel Request Reconciliation": {
        "on_update": alert
    }
}
