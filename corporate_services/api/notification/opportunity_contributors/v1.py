import frappe
from frappe import _
from frappe.utils import get_url_to_form


def _build_email_message(opportunity, contributor_row):
    opportunity_url = get_url_to_form("Opportunity", opportunity.name)
    display_name = contributor_row.full_name or contributor_row.user
    role_line = (
        f"<p>Your assigned role / contribution: <strong>{frappe.utils.escape_html(contributor_row.role)}</strong></p>"
        if contributor_row.role
        else ""
    )

    return f"""
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #0066cc;">Opportunity Contributor Assignment</h2>
        <p>Dear {frappe.utils.escape_html(display_name)},</p>
        <p>
            You have been added as a <strong>contributor</strong> to opportunity
            <strong>{frappe.utils.escape_html(opportunity.name)}</strong>.
        </p>
        {role_line}
        <p>
            You can view the opportunity
            <a href="{opportunity_url}" style="color: #0066cc; text-decoration: none;">here</a>.
        </p>
        <p style="margin-top: 20px;">Best regards,<br>Opportunity Module</p>
    </div>
    """


def _send_system_notification(opportunity, contributor_row):
    display_name = contributor_row.full_name or contributor_row.user
    role_suffix = f" ({contributor_row.role})" if contributor_row.role else ""

    frappe.get_doc({
        "doctype": "Notification Log",
        "subject": _("You have been added as a contributor to Opportunity {0}").format(opportunity.name),
        "email_content": _(
            "{0}{1} has been added as a contributor to Opportunity {2}."
        ).format(display_name, role_suffix, opportunity.name),
        "for_user": contributor_row.user,
        "type": "Alert",
        "document_type": "Opportunity",
        "document_name": opportunity.name,
        "from_user": frappe.session.user,
    }).insert(ignore_permissions=True)


def notify_contributors(doc, method):
    """on_update: send email + system notification to newly added contributors."""
    contributors = getattr(doc, "custom_opportunity_contributors", None)
    if not contributors:
        return

    any_sent = False

    for row in contributors:
        if row.notification_sent:
            continue
        if not row.user:
            continue

        recipient = row.email or frappe.db.get_value("User", row.user, "email")
        if not recipient:
            continue

        try:
            frappe.sendmail(
                recipients=[recipient],
                subject=_("You have been added as a contributor to Opportunity {0}").format(doc.name),
                message=_build_email_message(doc, row),
                header=("Opportunity Contributors", "text/html"),
            )
        except Exception:
            frappe.log_error(
                message=frappe.get_traceback(),
                title="Opportunity Contributor Email Error",
            )

        try:
            _send_system_notification(doc, row)
        except Exception:
            frappe.log_error(
                message=frappe.get_traceback(),
                title="Opportunity Contributor System Notification Error",
            )

        frappe.db.set_value(
            "Opportunity Contributor",
            row.name,
            "notification_sent",
            1,
            update_modified=False,
        )
        any_sent = True

    if any_sent:
        frappe.db.commit()
