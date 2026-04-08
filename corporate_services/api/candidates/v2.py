import frappe
from frappe import _
import json
import re

# Constants
DOCTYPE_JOB_CANDIDATE = 'Job Applicant'


def get_initial_workflow_state(doctype):
    workflow_name = frappe.db.get_value(
        'Workflow',
        {'document_type': doctype, 'is_active': 1},
        'name',
    )
    if not workflow_name:
        return None

    initial_state = frappe.db.get_value(
        'Workflow Document State',
        {'parent': workflow_name, 'is_initial_state': 1},
        'state',
    )
    if initial_state:
        return initial_state

    # Fallback: first state defined in the workflow
    first_state = frappe.db.get_value(
        'Workflow Document State',
        {'parent': workflow_name},
        'state',
        order_by='idx asc',
    )
    return first_state


def get_job_opening(role):
    if not role:
        return None

    opening = frappe.db.get_value(
        'Job Opening',
        {'job_title': role, 'status': 'Open'},
        'name',
    )
    if opening:
        return opening

    opening = frappe.db.get_value(
        'Job Opening',
        {'job_title': role},
        'name',
    )
    if opening:
        return opening

    opening = frappe.db.get_value(
        'Job Opening',
        {'job_title': ['like', role]},
        'name',
    )
    return opening


@frappe.whitelist()
def create_job_candidate():
    """
    Create a Job Candidate entry from external system.
    Accepts multipart/form-data with files and JSON data.
    
    Required fields:
    - names: Candidate's full name
    - email_address: Valid email address
    - cv: Resume/CV file (attached)
    
    Optional fields:
    - phone: Phone number
    - role: Role/position name the candidate is applying for.
            Matched against Job Opening.job_title to populate the
            standard job_title Link field automatically.
    - role_description: Description of the role
    - cover_letter: Cover letter file (attached)
    - minimum_requirements: JSON array of minimum requirements
    - preferred_attributes: JSON array of preferred attributes
    
    Returns:
    - Success: {"success": true, "data": {candidate details}}
    - Error: {"success": false, "errors": {field: error_message}}
    """
    try:
        # Parse form data
        form_data = frappe.local.form_dict
        files = frappe.request.files
        
        # Validate and extract form fields
        validation_errors = {}
        
        # Extract and validate required fields
        names = form_data.get('names', '').strip()
        email_address = form_data.get('email_address', '').strip()
        phone = form_data.get('phone', '').strip()
        role = form_data.get('role', '').strip()
        role_description = form_data.get('role_description', '').strip()
        preferred_amount_raw = form_data.get('preferred_amount', '').strip()
        preferred_amount = None
        
        # Validate names
        if not names:
            validation_errors['names'] = 'Candidate name is required'
        
        # Validate email
        if not email_address:
            validation_errors['email_address'] = 'Email address is required'
        elif not is_valid_email(email_address):
            validation_errors['email_address'] = 'Invalid email address format'
        
        # Validate CV file
        cv_file = files.get('cv')
        if not cv_file:
            validation_errors['cv'] = 'Resume/CV file is required'

        if preferred_amount_raw:
            try:
                preferred_amount = float(preferred_amount_raw)
            except ValueError:
                validation_errors['preferred_amount'] = 'Preferred amount must be a valid number'
        
        # Get optional cover letter file
        cover_letter_file = files.get('cover_letter')
        
        # Parse child table data
        minimum_requirements = []
        preferred_attributes = []
        
        if form_data.get('minimum_requirements'):
            try:
                minimum_requirements = json.loads(form_data.get('minimum_requirements'))
                if not isinstance(minimum_requirements, list):
                    validation_errors['minimum_requirements'] = 'Minimum requirements must be an array'
            except json.JSONDecodeError:
                validation_errors['minimum_requirements'] = 'Invalid JSON format for minimum requirements'
        
        if form_data.get('preferred_attributes'):
            try:
                preferred_attributes = json.loads(form_data.get('preferred_attributes'))
                if not isinstance(preferred_attributes, list):
                    validation_errors['preferred_attributes'] = 'Preferred attributes must be an array'
            except json.JSONDecodeError:
                validation_errors['preferred_attributes'] = 'Invalid JSON format for preferred attributes'
        
        # Return validation errors if any
        if validation_errors:
            return {'success': False, 'errors': validation_errors}


        job_opening_name = get_job_opening(role)
        request_preferred_amount = 0
        preferred_amount_mandatory = 0
        if job_opening_name:
            request_preferred_amount, preferred_amount_mandatory = frappe.db.get_value(
                'Job Opening',
                job_opening_name,
                ['custom_request_preferred_amount', 'custom_preferred_amount_mandatory'],
            ) or (0, 0)

        if request_preferred_amount and preferred_amount_mandatory and preferred_amount is None:
            validation_errors['preferred_amount'] = 'Preferred amount is required for this role'

        if validation_errors:
            return {'success': False, 'errors': validation_errors}

 
        initial_workflow_state = get_initial_workflow_state(DOCTYPE_JOB_CANDIDATE)

        # Create the Job Applicant document
        doc_data = {
            'doctype': DOCTYPE_JOB_CANDIDATE,
            'applicant_name': names,
            'email_id': email_address,
            'phone_number': phone if phone else None,
            'job_title': job_opening_name,
            'custom_role': role if role else None,
            'custom_role_description': role_description if role_description else None,
            'custom_preferred_amount': preferred_amount,
        }

        if initial_workflow_state:
            doc_data['workflow_state'] = initial_workflow_state

        candidate_doc = frappe.get_doc(doc_data)

        # Save CV file
        cv_file_doc = None
        if cv_file:
            cv_file_doc = save_file(
                file=cv_file,
                doctype=DOCTYPE_JOB_CANDIDATE,
                docname=None,
                fieldname='resume_attachment',
            )
            candidate_doc.resume_attachment = cv_file_doc.file_url  

        # Save cover letter file
        cover_letter_file_doc = None
        if cover_letter_file:
            cover_letter_file_doc = save_file(
                file=cover_letter_file,
                doctype=DOCTYPE_JOB_CANDIDATE,
                docname=None,
                fieldname='custom_cover_letter_attachment',
            )
            candidate_doc.custom_cover_letter_attachment = cover_letter_file_doc.file_url  

        # Add minimum requirements child table entries
        for req in minimum_requirements:
            if isinstance(req, dict):
                candidate_doc.append('custom_minimum_requirements', req)

        # Add preferred attributes child table entries
        for attr in preferred_attributes:
            if isinstance(attr, dict):
                candidate_doc.append('custom_preferred_attributes', attr)

        # Insert the document
        candidate_doc.insert(ignore_permissions=True)

        # Update file attachments to link to the created document
        if cv_file_doc:
            update_file_attachment(
                cv_file_doc.name,
                candidate_doc.name,
                DOCTYPE_JOB_CANDIDATE,
                'resume_attachment',
            )
        if cover_letter_file_doc:
            update_file_attachment(
                cover_letter_file_doc.name,
                candidate_doc.name,
                DOCTYPE_JOB_CANDIDATE,
                'custom_cover_letter_attachment',
            )

        frappe.db.commit()

        return {
            'success': True,
            'data': {
                'name': candidate_doc.name,
                'applicant_name': candidate_doc.applicant_name,
                'email_id': candidate_doc.email_id,
                'phone_number': candidate_doc.phone_number or None,
                'job_title': candidate_doc.job_title or None,
                'custom_role': candidate_doc.custom_role or None,
                'custom_role_description': candidate_doc.custom_role_description or None,
                'custom_preferred_amount': candidate_doc.custom_preferred_amount,
                'resume_attachment': candidate_doc.resume_attachment or None,
                'custom_cover_letter_attachment': candidate_doc.custom_cover_letter_attachment or None,
                '_job_opening_matched': bool(job_opening_name),
            }
        }
        
    except frappe.DuplicateEntryError:
        frappe.db.rollback()
        return {
            'success': False,
            'errors': {
                'email_address': 'A candidate with this email already exists'
            }
        }
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), 'Job Candidate API Error')
        return {
            'success': False,
            'errors': {
                'general': str(e)
            }
        }


def is_valid_email(email):
    """Validate email address format"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None


def save_file(file, doctype, docname, fieldname):
    """
    Save uploaded file to ERPNext File doctype
    
    Args:
        file: FileStorage object from request
        doctype: DocType to attach file to
        docname: Document name to attach file to (can be None initially)
        fieldname: Field name where file is attached
    
    Returns:
        File document
    """
    file_data = {
        'doctype': 'File',
        'file_name': file.filename,
        'is_private': 1,
        'content': file.read(),
    }
    
    # Only set attachment fields if docname is provided
    # Frappe requires both attached_to_doctype and attached_to_name together
    if docname:
        file_data['attached_to_doctype'] = doctype
        file_data['attached_to_name'] = docname
        file_data['attached_to_field'] = fieldname
    
    file_doc = frappe.get_doc(file_data)
    file_doc.save(ignore_permissions=True)
    return file_doc


def update_file_attachment(file_name, docname, doctype, fieldname):
    """
    Update file attachment to link to the created document
    
    Args:
        file_name: Name of the File document
        docname: Name of the Job Candidate document
        doctype: DocType to attach file to
        fieldname: Field name where file is attached
    """
    frappe.db.set_value('File', file_name, {
        'attached_to_doctype': doctype,
        'attached_to_name': docname,
        'attached_to_field': fieldname,
    })


@frappe.whitelist()
def send_rejection_email():
    """
    Send a rejection email to a candidate who did not meet minimum requirements.
    Accepts JSON body with candidate_name, candidate_email, and role_title.
    """
    try:
        data = frappe.local.form_dict

        candidate_name = data.get("candidate_name", "").strip()
        candidate_email = data.get("candidate_email", "").strip()
        role_title = data.get("role_title", "").strip()

        validation_errors = {}
        if not candidate_name:
            validation_errors["candidate_name"] = "Candidate name is required"
        if not candidate_email:
            validation_errors["candidate_email"] = "Candidate email is required"
        elif not is_valid_email(candidate_email):
            validation_errors["candidate_email"] = "Invalid email address format"

        if validation_errors:
            return {"success": False, "errors": validation_errors}

        company_name = frappe.get_value("Global Defaults", None, "default_company") or "Our Company"
        signature_name = frappe.get_value("User", frappe.session.user, "full_name") or "The HR Team"

        subject = f"Application Update - {role_title} at {company_name}"

        message = f"""Dear {candidate_name},

Thank you for your interest in the role of {role_title} at {company_name}.

Based on the minimum requirements indicated in your application, we will not be progressing with your application at this time. We encourage you to apply again in future if your experience aligns with the requirements of a role.

We appreciate the time you took to apply and wish you the best in your career journey.

Kind regards,
{signature_name}
Human Resources
{company_name}"""

        frappe.sendmail(
            recipients=[candidate_email],
            subject=subject,
            message=message,
            now=True,
        )

        return {"success": True, "data": {"email_sent_to": candidate_email}}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Rejection Email API Error")
        return {"success": False, "errors": {"general": str(e)}}
