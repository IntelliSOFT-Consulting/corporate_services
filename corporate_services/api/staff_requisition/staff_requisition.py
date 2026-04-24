import frappe
from frappe.utils import get_fullname, get_url_to_form, now


@frappe.whitelist()
def send_clarification_email(docname, message):
    doc = frappe.get_doc("Staff Requisition", docname)

    if not doc.requestor:
        frappe.throw("Staff Requisition has no requestor assigned.")

    requestor      = frappe.get_doc("Employee", doc.requestor)
    recipient_email = requestor.company_email or requestor.personal_email

    if not recipient_email:
        frappe.throw(f"No email found for requestor {requestor.employee_name}.")

    requestor_user = frappe.db.get_value(
        "Employee", doc.requestor, "user_id"
    ) or recipient_email

    approver_name = get_fullname(frappe.session.user)
    doc_url       = get_url_to_form(doc.doctype, doc.name)

    doc.workflow_state     = "Needs Clarification"
    doc.status             = "NEEDS CLARIFICATION"
    doc.clarification_message = message
    doc.clarification_response = ""
    doc.flags.ignore_permissions = True
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    email_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1F4E79;padding:20px 30px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:18px;">
                Clarification Required
            </h2>
            <p style="color:#BDD7EE;margin:4px 0 0;font-size:13px;">
                Staff Requisition &mdash; {doc.name}
            </p>
        </div>
        <div style="background:#fff;padding:24px 30px;border:1px solid #e0e0e0;
                    border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 12px;">Hello <b>{requestor.employee_name}</b>,</p>
            <p style="margin:0 0 16px;">
                <b>{approver_name}</b> has reviewed your staff requisition and
                requires clarification before it can proceed.
            </p>
            <div style="background:#FFF8E1;border-left:4px solid #FFC107;
                        padding:14px 18px;border-radius:4px;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-weight:bold;color:#5D4037;">
                    Clarification Required:
                </p>
                <p style="margin:0;color:#333;">{message}</p>
            </div>
            <p style="margin:0 0 20px;">
                Please review the requisition, address the points raised,
                and resubmit when ready.
            </p>
            <a href="{doc_url}" style="color:#1F4E79; text-decoration:underline;">
                View &amp; Resubmit
            </a>
            <p style="margin:24px 0 0;color:#888;font-size:12px;">
                Regards &mdash; HR Management
            </p>
        </div>
    </div>
    """

    frappe.sendmail(
        recipients=[recipient_email],
        subject=f"Clarification Required - {doc.name}",
        message=email_body
    )

    frappe.get_doc({
        "doctype"       : "Notification Log",
        "subject"       : f"Clarification required on {doc.name}",
        "email_content" : (
            f"<b>{approver_name}</b> has requested clarification:<br>"
            f"{message}"
        ),
        "for_user"      : requestor_user,
        "type"          : "Alert",
        "document_type" : doc.doctype,
        "document_name" : doc.name,
        "from_user"     : frappe.session.user,
        "read"          : 0,
    }).insert(ignore_permissions=True)

    frappe.get_doc({
        "doctype"        : "ToDo",
        "status"         : "Open",
        "priority"       : "High",
        "owner"          : requestor_user,
        "allocated_to"   : requestor_user,
        "description"    : (
            f"<b>Clarification Required</b> on Staff Requisition "
            f"<a href='{doc_url}'>{doc.name}</a><br><br>"
            f"<b>Message from {approver_name}:</b><br>{message}"
        ),
        "reference_type" : doc.doctype,
        "reference_name" : doc.name,
        "date"           : frappe.utils.today(),
    }).insert(ignore_permissions=True)

    doc.add_comment(
        "Comment",
        f"Workflow moved to <b>Needs Clarification</b> by {approver_name}.<br>"
        f"<b>Reason:</b> {message}"
    )

    frappe.db.commit()

    return "ok"
