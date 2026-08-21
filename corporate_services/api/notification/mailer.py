import frappe
from corporate_services.api.notification.dispatch_log import filter_recipients
from corporate_services.api.helpers.print_formats import get_default_print_format


def pdf_attachment(doc, print_format=None):
    """Render `doc` to PDF and wrap it as a frappe.sendmail attachment dict."""
    pdf_content = frappe.get_print(
        doc.doctype, doc.name, print_format or get_default_print_format(doc.doctype), as_pdf=True
    )
    return [{"fname": f"{doc.name}.pdf", "fcontent": pdf_content}]


def build_email_body(greeting, intro, action_line, link_url, signer, cta_text="Click here to view it", extra=""):
    """Canonical HTML email body: greeting, intro, an optional extra block
    (pre-wrapped HTML, e.g. a remarks/flag paragraph), an action line with
    link, and a signed-off closing. This is the one shape every notification
    email should use going forward."""
    return """
        <p>{greeting},</p>
        <p>{intro}</p>
        {extra}
        <p>{action_line} <a href="{link}">{cta_text}</a>.</p>
        <br>
        <p>Kind regards,<br><strong>{signer}</strong></p>
    """.format(
        greeting=greeting,
        intro=intro,
        extra=extra,
        action_line=action_line,
        link=link_url,
        cta_text=cta_text,
        signer=signer,
    )


def send_email(doc, recipients, subject, message, *, header, cc=None, attachments=None, dedup=True):
    """Shared frappe.sendmail wrapper: drops blanks, dedups against the
    Notification Dispatch Log (unless dedup=False), no-ops if nothing is left."""
    recipients = filter_recipients(doc, recipients) if dedup else [r for r in recipients if r]
    if not recipients:
        return

    frappe.sendmail(
        recipients=recipients,
        cc=cc,
        subject=subject,
        message=message,
        attachments=attachments,
        header=(header, "text/html"),
    )


def notify_recipient(doc, recipient, subject, content, *, error_title="Notification Log Creation Failed"):
    """Create a Notification Log entry for `recipient`; logs and swallows failures."""
    if not recipient:
        return
    try:
        frappe.get_doc(
            {
                "doctype": "Notification Log",
                "subject": subject,
                "email_content": content,
                "for_user": recipient,
                "type": "Alert",
                "document_type": doc.doctype,
                "document_name": doc.name,
                "from_user": frappe.session.user,
            }
        ).insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(message=frappe.get_traceback(), title=error_title)


def notify(doc, recipients, subject, message, content=None, *, header, cc=None, attachments=None, dedup=True):
    """send_email() + a Notification Log per recipient. `content` defaults to
    `message` when the log entry should read the same as the email body."""
    recipients = filter_recipients(doc, recipients) if dedup else [r for r in recipients if r]
    if not recipients:
        return

    send_email(doc, recipients, subject, message, header=header, cc=cc, attachments=attachments, dedup=False)
    for recipient in recipients:
        notify_recipient(doc, recipient, subject, content if content is not None else message, error_title=f"{header} Notification Log Failed")
