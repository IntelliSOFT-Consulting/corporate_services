import frappe
from frappe import _
from frappe.utils import add_days, get_url_to_form, nowdate


EXCLUDED_OPPORTUNITY_STATUSES = ("Converted", "Lost Quotation", "Do Not Contact")


def _get_settings():
    return frappe.get_cached_doc("Opportunity Settings")


def _notifications_enabled():
    try:
        settings = _get_settings()
    except Exception:
        # If settings are not yet migrated, skip reminders safely.
        return False, 0
    enabled = int(settings.notify_on_almost_due_opportunities or 0) == 1
    days_before_due = int(settings.almost_due_notification_days_before or 0)
    return enabled, days_before_due


def _get_owner_email(owner_user_id: str):
    if not owner_user_id:
        return None
    return frappe.db.get_value("User", owner_user_id, "email")


def _build_message(opportunity):
    opportunity_url = get_url_to_form("Opportunity", opportunity.name)
    due_date = frappe.utils.formatdate(opportunity.expected_closing)

    return f"""
        <p>Dear {frappe.utils.escape_html(opportunity.opportunity_owner or 'User')},</p>
        <p>
            This is a reminder that opportunity <strong>{frappe.utils.escape_html(opportunity.name)}</strong>
            is due on <strong>{due_date}</strong>.
        </p>
        <p>
            Open the opportunity here:
            <a href="{opportunity_url}">{frappe.utils.escape_html(opportunity.name)}</a>
        </p>
        <p>Regards,<br>Opportunity Module</p>
    """


def _send_opportunity_due_reminder(opportunity):
    recipient = _get_owner_email(opportunity.opportunity_owner)
    if not recipient:
        return False

    subject = _("Opportunity Due Reminder: {0}").format(opportunity.name)
    frappe.sendmail(
        recipients=[recipient],
        subject=subject,
        message=_build_message(opportunity),
        header=("Opportunity Reminder", "text/html"),
    )
    return True


def _get_target_opportunities(days_before_due: int):
    target_date = add_days(nowdate(), days_before_due)
    return frappe.get_all(
        "Opportunity",
        fields=["name", "opportunity_owner", "expected_closing", "status"],
        filters={
            "expected_closing": target_date,
            "docstatus": ("!=", 2),
            "status": ("not in", list(EXCLUDED_OPPORTUNITY_STATUSES)),
        },
        limit_page_length=0,
    )


def send_almost_due_opportunity_reminders():
    enabled, days_before_due = _notifications_enabled()
    if not enabled or days_before_due <= 0:
        return {"enabled": enabled, "sent": 0, "skipped": 0}

    opportunities = _get_target_opportunities(days_before_due)
    sent = 0
    skipped = 0

    for opportunity in opportunities:
        if _send_opportunity_due_reminder(opportunity):
            sent += 1
        else:
            skipped += 1

    return {"enabled": enabled, "sent": sent, "skipped": skipped}


@frappe.whitelist()
def send_manual_due_reminder(opportunity_name: str):
    if not opportunity_name:
        frappe.throw(_("Opportunity name is required."))

    if not frappe.has_permission("Opportunity", "read", opportunity_name):
        frappe.throw(_("Not permitted to send reminder for this Opportunity."))

    opportunity = frappe.get_doc("Opportunity", opportunity_name)
    sent = _send_opportunity_due_reminder(opportunity)

    if not sent:
        frappe.throw(_("Could not send reminder because the Opportunity Owner has no email address."))

    return {"sent": 1, "opportunity": opportunity_name}
