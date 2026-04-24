import frappe
from frappe.utils import get_url_to_form, now_datetime, add_days, get_datetime
from corporate_services.api.helpers.print_formats import get_default_print_format
from corporate_services.api.notification.notification_contacts import (
    get_finance_team_emails,
    get_hr_manager_emails,
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
        header=("Staff Requisition", "text/html")
    )

def get_user_full_name(email):
    """Get the full name of a user from their email"""
    return frappe.get_value('User', email, 'full_name') or email

def generate_message(doc, employee_name, email_type, recipient_email):
    doctype_url = get_url_to_form(doc.doctype, doc.name)
    recipient_name = get_user_full_name(recipient_email)
    
    messages = {
        "submitted_to_hr": """
            Dear {},<br><br>
            {}, {} has been submitted for your review. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            System
        """.format(recipient_name, employee_name, doc.doctype, doctype_url),

        "submitted_to_finance": """
            Dear {},<br><br>
            {}, {} has been reviewed and approved by HR. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            HR
        """.format(recipient_name, employee_name, doc.doctype, doctype_url),
        
        "submitted_to_ceo": """
            Dear {},<br><br>
            {}, {} has been reviewed and approved by Finance. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            Finance
        """.format(recipient_name, employee_name, doc.doctype, doctype_url),
        
        "approved_by_ceo": """
            Dear {},<br><br>
            {}, {} has been approved by the CEO. You can view the details <a href="{}">here</a>.<br><br>
            Kind regards,<br>
            CEO
        """.format(recipient_name, employee_name, doc.doctype, doctype_url),

        "rejected_by_hr": """
            Dear {},<br><br>
            Your {} {} has been rejected by HR. You can view the details <a href="{}">here</a>.<br><br>
            <b>Rejection Reason:</b><br>{}<br><br>
            Kind regards,<br>
            HR
        """.format(recipient_name, doc.doctype, doc.name, doctype_url, doc.rejection_reason or "Not provided"),

        "rejected_by_finance": """
            Dear {},<br><br>
            Your {} {} has been rejected by Finance. You can view the details <a href="{}">here</a>.<br><br>
            <b>Rejection Reason:</b><br>{}<br><br>
            Kind regards,<br>
            Finance
        """.format(recipient_name, doc.doctype, doc.name, doctype_url, doc.rejection_reason or "Not provided"),

        "rejected_by_ceo": """
            Dear {},<br><br>
            Your {} {} has been rejected by the CEO. You can view the details <a href="{}">here</a>.<br><br>
            <b>Rejection Reason:</b><br>{}<br><br>
            Kind regards,<br>
            CEO
        """.format(recipient_name, doc.doctype, doc.name, doctype_url, doc.rejection_reason or "Not provided")
    }
    return messages[email_type]


def get_requestor_email(requestor_doc):
    user_email = None
    if requestor_doc.user_id:
        user_email = frappe.get_value("User", requestor_doc.user_id, "email")
    return requestor_doc.company_email or requestor_doc.personal_email or user_email

def get_users_with_role(role):
    """Get email addresses of all users with a specific role"""
    if role == "HR Manager":
        return get_hr_manager_emails()
    if role == "Finance":
        return get_finance_team_emails()

    users = frappe.get_all('Has Role', filters={'role': role}, fields=['parent'])
    return [frappe.get_value('User', user.parent, 'email') for user in users]

def add_approval_if_not_exists(doc, title, action_performed=None):
    """Add approval entry if it doesn't already exist"""
    approval_exists = any(row.title == title for row in doc.staff_requisition_approval)
    
    if not approval_exists:
        doc.append('staff_requisition_approval', {
            'title': title,
            'action_performed': action_performed,
            'employee_name': frappe.session.user,
            'datetime': now_datetime()
        })
        doc.flags.in_alert = True
        doc.save(ignore_permissions=True)

def alert(doc, method):
    if doc.flags.in_alert:
        return
    
    if doc.workflow_state not in [
        "Submitted to HR",
        "Submitted to Finance",
        "Submitted to CEO",
        "Approved by CEO",
        "Rejected By HR",
        "Rejected by Finance",
        "Rejected by CEO",
    ]:
        return
    
    requestor = frappe.get_doc("Employee", doc.requestor)
    requestor_name = requestor.employee_name
    requestor_email = get_requestor_email(requestor)
    
    
    pdf_content = frappe.get_print(
        doc.doctype,
        doc.name,
        get_default_print_format(doc.doctype),
        as_pdf=True,
    )
    
    
    workflow_config = {
        "Submitted to HR": {
            "recipients": get_users_with_role('HR Manager'),
            "message_type": "submitted_to_hr",
            "approval_title": "Requestor",
            "action_performed": "Submitted",
            
        },
        "Submitted to Finance": {
            "recipients": get_users_with_role('Finance'),
            "message_type": "submitted_to_finance",
            "approval_title": "HR",
            "action_performed": "Approval",
        },
        "Submitted to CEO": {
            "recipients": get_users_with_role('CEO'),
            "message_type": "submitted_to_ceo",
            "approval_title": "Finance",
            "action_performed": "Approval",
        },
        "Approved by CEO": {
            "recipients": get_users_with_role('HR Manager'),
            "message_type": "approved_by_ceo",
            "approval_title": "CEO",
            "action_performed": "Approval",
        },
        "Rejected By HR": {
            "recipients": [requestor_email] if requestor_email else [],
            "message_type": "rejected_by_hr",
            "approval_title": "HR",
            "action_performed": "Rejection",
            "subject": "Your Staff Requisition has been Rejected by HR",
        },
        "Rejected by Finance": {
            "recipients": [requestor_email] if requestor_email else [],
            "message_type": "rejected_by_finance",
            "approval_title": "Finance",
            "action_performed": "Rejection",
            "subject": "Your Staff Requisition has been Rejected by Finance",
        },
        "Rejected by CEO": {
            "recipients": [requestor_email] if requestor_email else [],
            "message_type": "rejected_by_ceo",
            "approval_title": "CEO",
            "action_performed": "Rejection",
            "subject": "Your Staff Requisition has been Rejected by CEO",
        },
    }
    
    config = workflow_config[doc.workflow_state]
    
    if "approval_title" in config:
        add_approval_if_not_exists(
            doc,
            config["approval_title"],
            config.get("action_performed"),
        )
    
    if config.get("recipients") and config.get("message_type"):
        for recipient_email in config["recipients"]:
            message = generate_message(doc, requestor_name, config["message_type"], recipient_email)
            send_email(
                recipients=[recipient_email],
                subject=frappe._(config.get("subject") or 'Staff Requisition from {}'.format(requestor_name)),
                message=message,
                pdf_content=pdf_content,
                doc_name=doc.name
            )


def send_approval_overdue_reminders():
    """
    Scheduled function to send overdue approval reminders.
    Checks for Staff Requisitions pending approval beyond 12 hours.
    Sends email and ERP inbox notifications to current approver and HR.
    
    ONLY sends during business hours (8 AM - 5 PM).
    If overdue time falls outside business hours, waits until 8 AM to send.
    """
    from datetime import time as dt_time
    
    # Check if current time is within business hours (8 AM - 5 PM)
    current_time = now_datetime()
    current_hour = current_time.hour
    
    # Define business hours
    BUSINESS_START = 8
    BUSINESS_END = 17
    
    if current_hour < BUSINESS_START or current_hour >= BUSINESS_END:
        # Outside business hours, skip sending
        frappe.logger().info("Skipping overdue reminders - outside business hours")
        return {
            "success": True,
            "message": "Skipped - outside business hours (8 AM - 5 PM)",
            "reminders_sent": 0
        }
    
    # Define SLA hours for each workflow state (12 hours for all stages)
    sla_hours = 12  # 12 hours from submission to each stage
    
    # Get all pending staff requisitions
    pending_requisitions = frappe.get_all(
        "Staff Requisition",
        filters={
            "workflow_state": ["in", ["Submitted to HR", "Submitted to Finance", "Submitted to CEO"]],
            "docstatus": ["!=", 2]
        },
        fields=["name", "workflow_state", "modified", "requestor"]
    )
    
    reminders_sent = 0
    
    for req in pending_requisitions:
        try:
            # Get the document
            doc = frappe.get_doc("Staff Requisition", req.name)
            
            # Calculate deadline (12 hours from modified time)
            from datetime import timedelta
            deadline = get_datetime(doc.modified) + timedelta(hours=sla_hours)
            current_time = now_datetime()
            
            # Check if overdue
            if current_time <= deadline:
                continue  # Not overdue yet
            
            # Calculate hours overdue
            time_diff = current_time - deadline
            hours_overdue = int(time_diff.total_seconds() / 3600)
            
            # Format overdue time display
            if hours_overdue < 24:
                overdue_display = f"{hours_overdue} hour(s)"
            else:
                days = hours_overdue // 24
                remaining_hours = hours_overdue % 24
                overdue_display = f"{days} day(s) and {remaining_hours} hour(s)"
            
            # Get current approver based on workflow state
            if doc.workflow_state == "Submitted to HR":
                approver_role = "HR Manager"
                approver_title = "HR Manager"
            elif doc.workflow_state == "Submitted to Finance":
                approver_role = "Finance"
                approver_title = "Finance Manager"
            elif doc.workflow_state == "Submitted to CEO":
                approver_role = "CEO"
                approver_title = "CEO"
            else:
                continue
            
            # Get approver emails
            approver_emails = get_users_with_role(approver_role)
            hr_emails = get_users_with_role('HR Manager')
            
            # Combine and remove duplicates
            all_recipients = list(set(approver_emails + hr_emails))
            
            if not all_recipients:
                frappe.log_error(
                    message=f"No approvers found for {doc.name} in state {doc.workflow_state}",
                    title="Approval Overdue - No Recipients"
                )
                continue
            
            # Get requestor details
            requestor = frappe.get_doc("Employee", doc.requestor)
            requestor_name = requestor.employee_name
            
            # Generate document URL
            doctype_url = get_url_to_form(doc.doctype, doc.name)
            
            # Send email to each recipient
            for recipient_email in all_recipients:
                recipient_name = get_user_full_name(recipient_email)
                
                email_message = """
                    <p><strong style="color: red;">APPROVAL OVERDUE REMINDER</strong></p>
                    
                    <p>Dear {},</p>
                    
                    <p>The following Staff Requisition is awaiting your approval and is now 
                    <strong style="color: red;">{} overdue</strong>:</p>
                    
                    <p><strong>Requisition Details:</strong><br>
                    Document: <a href="{}">{}</a><br>
                    Requestor: {}<br>
                    Status: {}<br>
                    Submitted On: {}<br>
                    SLA: {} hours<br>
                    Time Overdue: <strong style="color: red;">{}</strong></p>
                    
                    <p><strong>Action Required:</strong><br>
                    Please review and approve/reject this requisition as soon as possible.</p>
                    
                    <p>Click here to review: <a href="{}" style="background-color: #FF5722; color: white; 
                    padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Review Now</a></p>
                    
                    <p>Kind regards,<br>
                    System</p>
                """.format(
                    recipient_name,
                    overdue_display,
                    doctype_url,
                    doc.name,
                    requestor_name,
                    doc.workflow_state,
                    doc.modified.strftime('%Y-%m-%d %H:%M'),
                    sla_hours,
                    overdue_display,
                    doctype_url
                )
                
                # Send email notification
                frappe.sendmail(
                    recipients=[recipient_email],
                    subject=f"OVERDUE: Staff Requisition Approval Required - {doc.name}",
                    message=email_message,
                    priority=1
                )
                
                # Create ERP inbox notification
                create_notification_log(
                    recipient_email,
                    doc,
                    f"Staff Requisition {doc.name} is {overdue_display} overdue for approval",
                    approver_title
                )
            
            # Add comment to document
            doc.add_comment(
                "Comment",
                f"Overdue reminder sent to {approver_title} and HR ({overdue_display} overdue)"
            )
            
            reminders_sent += 1
            
        except Exception as e:
            frappe.log_error(
                message=f"Failed to send overdue reminder for {req.name}: {str(e)}",
                title=f"Approval Overdue Reminder Failed - {req.name}"
            )
    
    return {
        "success": True,
        "message": f"{reminders_sent} approval overdue reminders sent.",
        "reminders_sent": reminders_sent
    }


def create_notification_log(recipient_email, doc, message, approver_title):
    """
    Creates a notification in the ERP inbox (Notification Log).
    
    Args:
        recipient_email (str): Email of the recipient.
        doc (Document): Staff Requisition document.
        message (str): Notification message.
        approver_title (str): Title of the approver role.
    """
    try:
        notification = frappe.get_doc({
            "doctype": "Notification Log",
            "subject": f"Approval Overdue: {doc.name}",
            "email_content": message,
            "for_user": recipient_email,
            "type": "Alert",
            "document_type": doc.doctype,
            "document_name": doc.name,
            "from_user": frappe.session.user
        })
        notification.insert(ignore_permissions=True)
        
    except Exception as e:
        frappe.log_error(
            message=f"Failed to create notification log for {recipient_email}: {str(e)}",
            title="Notification Log Creation Failed"
        )


@frappe.whitelist()
def manual_send_overdue_reminders():
    """
    Manual trigger for sending overdue reminders (can be called from UI).
    
    Returns:
        dict: Summary of reminders sent.
    """
    return send_approval_overdue_reminders()


def check_and_alert_on_submission(doc, method):
    """
    Check if requisition is being submitted and set initial SLA tracking.
    This can be used to track when the approval process started.
    """
    if doc.workflow_state in ["Submitted to HR", "Submitted to Finance", "Submitted to CEO"]:
        if not doc.get("sla_start_time"):
            doc.db_set("sla_start_time", now_datetime(), update_modified=False)


doc_events = {
    "Staff Requisition": {
        "on_update": alert,
        "before_save": check_and_alert_on_submission
    }
}
