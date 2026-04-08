import frappe
from frappe.utils import get_fullname, get_url_to_form

@frappe.whitelist()
def application_received(doc_or_docname=None, method=None):
    # Handle both direct call (docname string) and hook call (document object)
    if isinstance(doc_or_docname, str):
        doc = frappe.get_doc("Job Applicant", doc_or_docname)
    else:
        doc = doc_or_docname

    if not doc or not doc.email_id:
        frappe.throw(f"No email found for applicant {doc.applicant_name if doc else 'unknown'}.")

    # Get the job opening details
    job_opening = frappe.get_doc("Job Opening", doc.job_title) if doc.job_title else None
    role_title = job_opening.job_title if job_opening else doc.custom_role 

    # Get company name
    company_name = frappe.db.get_single_value("Global Defaults", "default_company") or "Our Company"

    # Get HR manager/recruiter name for signature
    signature_name = get_fullname(frappe.session.user)
    signature_title = "Human Resources"

    # Build the email message
    email_message = f"""
    Dear {doc.applicant_name},<br><br>

    Thank you for applying for the role of <strong>{role_title}</strong> at {company_name}. 
    We have received your application (Ref: {doc.name}) and our team is reviewing it.<br><br>

    If your profile matches what we are looking for, we will contact you with next steps. 
    Thank you again for your interest in joining {company_name}.<br><br>

    Kind regards,<br>
    {signature_name}<br>
    {signature_title}<br>
    {company_name}
    """

    frappe.sendmail(
        recipients=[doc.email_id],
        subject=f"Application Received - {role_title} at {company_name}",
        message=email_message
    )

    # Add a comment to the document
    doc.add_comment("Comment", f"Application received email sent to {doc.email_id}")

    return "Application acknowledgment email sent successfully."