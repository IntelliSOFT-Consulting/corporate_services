import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_supervisor_contact
from corporate_services.api.notification.dispatch_log import on_transition, filter_recipients

def employee_grievance(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state == "Approved by HR":

        owner_email = frappe.db.get_value("User", doc.owner, "email")
        
        subject = "Your document has been approved by HR"
        message = f"Hello,\n\nYour Grievance {doc.name} has been received and approved by HR.\n\nBest Regards,\n\n HR"
        
        frappe.sendmail(
            recipients=[owner_email],
            subject=subject,
            message=message
        )
        
        
def alert_supervisor_asset_requisition(doc, method):
    if not on_transition(doc):
        return
    if doc.workflow_state == "Submitted to Supervisor":
        
        employee_id = doc.requested_by
        employee = frappe.get_doc("Employee", employee_id)
        
        if employee.reports_to:
            supervisor_contact = get_supervisor_contact(employee)
            message = """
                Dear {},\n\n
    
                I have submitted my {} for your review and approval.\n\n
            
                Kind regards,
                
                {}
                """.format(supervisor_contact.name, doc.doctype, employee.employee_name)
            
            frappe.sendmail(
                recipients=[supervisor_contact.email],
                subject=frappe._('Asset Custodianship Requisition Submission from {}'.format(employee.employee_name)),
                message=message,
            )
            

            
            


def send_email(recipients, subject, message, pdf_content, doc_name):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            'fname': '{}.pdf'.format(doc_name),
            'fcontent': pdf_content
        }],
        header=("Work Continuity Plan Submission", "text/html")
    )

doc_events = {
    "Employee Grievance": {
        "on_update": employee_grievance
    },
    "Asset Custodianship Requisition":{
        "on_update": alert_supervisor_asset_requisition
    },
}
