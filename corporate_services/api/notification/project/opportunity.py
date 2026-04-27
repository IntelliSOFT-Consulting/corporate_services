import frappe
from frappe.utils import get_url_to_form
from corporate_services.api.helpers.print_formats import get_default_print_format

def send_email(recipients, subject, message, pdf_content, doc_name):
    frappe.sendmail(
        recipients=recipients,
        subject=subject,
        message=message,
        attachments=[{
            'fname': '{}.pdf'.format(doc_name),
            'fcontent': pdf_content
        }],
        header=("Opportunity", "text/html")
    )

def generate_message(doc, approver_employee_name, employee_name, email_type):
    """
    Messages for different scenarios in the Opportunity Module.

    """
    doctype_url = get_url_to_form(doc.doctype, doc.name)

    messages = {
        "feedback_from_opp_owner": f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #0066cc;">Feedback from Opportunity Owner</h2>
            <p>Dear {approver_employee_name},</p>
            <p>
                <strong>{employee_name}</strong> has reviewed the Opportunity <strong>{doc.name}</strong> 
                and shared feedback for the same. You can view the details 
                <a href="{doctype_url}" style="color: #0066cc; text-decoration: none;">here</a>.
            </p>
            <p style="margin-top: 20px;">Best regards,<br>ERP Next, Opportunity Module</p>
        </div>
        """,

        "approval_feedback_from_ceo": f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #28a745;">Approval Feedback from CEO</h2>
            <p>Dear {employee_name},</p>
            <p>
                <strong>{approver_employee_name}</strong>, has approved the project bid based on your feedback. 
                The bid will be added to projects, and you can access it via the Project Module 
                under the Project Manager workspace. View the details 
                <a href="{doctype_url}" style="color: #0066cc; text-decoration: none;">here</a>.
            </p>
            <p style="margin-top: 20px;">Best regards,<br>ERP Next, Opportunity Module</p>
        </div>
        """,

        "rejection_feedback_from_ceo": f"""
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #dc3545;">Rejection Feedback from CEO</h2>
            <p>Dear {employee_name},</p>
            <p>
                <strong>{approver_employee_name}</strong> has rejected the project bid based on your feedback. 
                View the details 
                <a href="{doctype_url}" style="color: #0066cc; text-decoration: none;">here</a>.
            </p>
            <p style="margin-top: 20px;">Best regards,<br>ERP Next, Opportunity Module</p>
        </div>
        """
    }

    return messages[email_type]


def _get_active_owner_user(doc):
    """Return the User ID of the currently Active owner from the child table,
    falling back to the legacy opportunity_owner field."""
    if getattr(doc, "custom_opportunity_owners", None):
        for row in reversed(doc.custom_opportunity_owners):
            if row.status == "Active" and row.user:
                return row.user
    return doc.get("opportunity_owner")


def alert(doc, method):
    if doc.workflow_state in [
        "Submitted to CEO", "Approved by CEO", "Rejected by CEO"
    ]:
        employee_id = _get_active_owner_user(doc)
        if not employee_id:
            return
        user = frappe.get_doc("User", employee_id)

        linked_employee = frappe.get_all(
            "Employee",
            filters={"user_id": user.name},
            fields=["name", "employee_name", "company_email", "personal_email"]
        )

        if linked_employee:
            employee = linked_employee[0]
            employee_email = employee.get("company_email") or employee.get("personal_email")
        else:
            employee_email = None
            employee = None

        approver_email = doc.custom_opportunity_approver
        approver_user = frappe.get_doc("User", approver_email)

        linked_approver_employee = frappe.get_all(
            "Employee",
            filters={"user_id": approver_user.name},
            fields=["name", "employee_name", "company_email", "personal_email"]
        )

        if linked_approver_employee:
            approver_employee = linked_approver_employee[0]
            approver_employee_name = approver_employee.get("employee_name")
        else:
            approver_employee_name = None

        pdf_content = frappe.get_print(
            doc.doctype, doc.name, get_default_print_format(doc.doctype), as_pdf=True
        )

        if doc.workflow_state == "Submitted to CEO":
            if employee:
                message_to_employee = generate_message(
                    doc, approver_employee_name, employee.get("employee_name"), "feedback_from_opp_owner"
                )
                send_email(
                    recipients=[approver_email],
                    subject=frappe._('Project Bid Feedback from the Opportunity owner'),
                    message=message_to_employee,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
        elif doc.workflow_state == "Approved by CEO":
            if employee:
                message_to_employee = generate_message(
                    doc, approver_employee_name, employee.get("employee_name"), "approval_feedback_from_ceo"
                )
                send_email(
                    recipients=[employee_email],
                    subject=frappe._('Project Bid Feedback from the CEO'),
                    message=message_to_employee,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )
        elif doc.workflow_state == "Rejected by CEO":
            if employee:
                message = generate_message(
                    doc, approver_employee_name, employee.get("employee_name"), "rejection_feedback_from_ceo"
                )
                send_email(
                    recipients=[employee_email],
                    subject=frappe._('Project Bid Feedback from the CEO'),
                    message=message,
                    pdf_content=pdf_content,
                    doc_name=doc.name
                )

doc_events = {
    "Opportunity": {
        "on_update": alert
    }
}

