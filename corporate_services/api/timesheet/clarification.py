import frappe
from frappe.utils import get_fullname, get_url_to_form


@frappe.whitelist()
def send_clarification_email(docname, message):
    message = (message or "").strip()
    if not message:
        frappe.throw("A clarification message is required.")

    doc = frappe.get_doc("Timesheet Submission", docname)

    if not doc.employee:
        frappe.throw("Timesheet Submission has no employee assigned.")

    employee = frappe.get_doc("Employee", doc.employee)
    recipient_email = employee.company_email or employee.personal_email
    if not recipient_email:
        frappe.throw("No email found for employee {0}.".format(employee.employee_name))

    employee_user = employee.user_id or recipient_email
    reviewer_name = get_fullname(frappe.session.user)
    doc_url = get_url_to_form(doc.doctype, doc.name)

    # Ensure the submission is back in Draft (the workflow transition handles this, but
    if doc.workflow_state != "Draft":
        doc.workflow_state = "Draft"
        doc.status = "Open"
        doc.save(ignore_permissions=True)
        frappe.db.commit()

    email_body = """
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="padding:20px 30px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:18px;">Clarification Required</h2>
            <p style="color:#BDD7EE;margin:4px 0 0;font-size:13px;">
                Timesheet Submission - {name}
            </p>
        </div>
        <div style="background:#fff;padding:24px 30px;border:1px solid #e0e0e0;
                    border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 12px;">Hello <b>{employee_name}</b>,</p>
            <p style="margin:0 0 16px;">
                <b>{reviewer_name}</b> has reviewed your timesheet submission and
                requires clarification before it can be approved. It has been sent back
                to <b>Draft</b>.
            </p>
            <div style="background:#FFF8E1;border-left:4px solid #FFC107;
                        padding:14px 18px;border-radius:4px;margin-bottom:20px;">
                <p style="margin:0 0 6px;font-weight:bold;color:#5D4037;">Message from {reviewer_name}:</p>
                <p style="margin:0;color:#333;">{message}</p>
            </div>
            <p style="margin:0 0 20px;">
                Please review your submission, address the points raised, and resubmit when ready.
            </p>
            <a href="{url}" style="color:#1F4E79;text-decoration:underline;">View &amp; Resubmit</a>
            <p style="margin:24px 0 0;color:#888;font-size:12px;">Regards: {reviewer_name}</p>
        </div>
    </div>
    """.format(
        name=doc.name,
        employee_name=employee.employee_name,
        reviewer_name=reviewer_name,
        message=frappe.utils.escape_html(message).replace("\n", "<br>"),
        url=doc_url,
    )

    frappe.sendmail(
        recipients=[recipient_email],
        subject="Clarification Required - {0}".format(doc.name),
        message=email_body,
        header=("Timesheet Submission", "text/html"),
    )

    frappe.get_doc({
        "doctype": "Notification Log",
        "subject": "Clarification required on {0}".format(doc.name),
        "email_content": "<b>{0}</b> has requested clarification:<br>{1}".format(
            reviewer_name, frappe.utils.escape_html(message)
        ),
        "for_user": employee_user,
        "type": "Alert",
        "document_type": doc.doctype,
        "document_name": doc.name,
        "from_user": frappe.session.user,
        "read": 0,
    }).insert(ignore_permissions=True)

    doc.add_comment(
        "Comment",
        "Clarification requested by <b>{0}</b>; submission sent back to Draft.<br>"
        "<b>Message:</b> {1}".format(reviewer_name, frappe.utils.escape_html(message)),
    )

    return {"ok": True}
