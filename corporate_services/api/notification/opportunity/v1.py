import frappe
from frappe import _
from frappe.utils import add_days, get_url_to_form, nowdate


EXCLUDED_OPPORTUNITY_STATUSES = ("Converted", "Lost Quotation", "Do Not Contact")
ALLOWED_BID_STATUS_NORMALIZED = {"inprogress"}
REMINDER_ACTIVITY_PREFIX = "Opportunity Due Reminder sent"


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


def _get_active_owner_email(opportunity_name: str):
    """Return email of the currently Active owner from the child table, or None."""
    row = frappe.db.get_value(
        "Opportunity Owner",
        {"parent": opportunity_name, "parenttype": "Opportunity", "status": "Active"},
        ["user", "email"],
        as_dict=True,
        order_by="idx desc",
    )
    if not row:
        return None
    return row.email or frappe.db.get_value("User", row.user, "email")


def _get_active_owner_display_name(opportunity_name: str) -> str:
    row = frappe.db.get_value(
        "Opportunity Owner",
        {"parent": opportunity_name, "parenttype": "Opportunity", "status": "Active"},
        ["full_name", "user"],
        as_dict=True,
        order_by="idx desc",
    )
    if row:
        return row.full_name or row.user
    return "User"


def _build_message(opportunity):
    opportunity_url = get_url_to_form("Opportunity", opportunity.name)
    due_date = frappe.utils.formatdate(opportunity.expected_closing)
    display_name = _get_active_owner_display_name(opportunity.name)

    return f"""
        <p>Dear {frappe.utils.escape_html(display_name)},</p>
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


def _normalize_status(value: str) -> str:
    return "".join(ch for ch in (value or "").strip().lower() if ch.isalnum())


def _can_send_reminder(opportunity) -> bool:
    bid_status = opportunity.get("custom_bid_status") or ""
    return _normalize_status(bid_status) in ALLOWED_BID_STATUS_NORMALIZED


def _log_due_reminder_activity(opportunity_name: str, recipient: str, trigger: str):
    timestamp = frappe.utils.format_datetime(frappe.utils.now())
    content = "{0} to {1} via {2} trigger on {3}.".format(
        REMINDER_ACTIVITY_PREFIX,
        frappe.utils.escape_html(recipient),
        frappe.utils.escape_html(trigger.title()),
        frappe.utils.escape_html(timestamp),
    )
    frappe.get_doc(
        {
            "doctype": "Comment",
            "comment_type": "Info",
            "reference_doctype": "Opportunity",
            "reference_name": opportunity_name,
            "content": content,
        }
    ).insert(ignore_permissions=True)


def _send_opportunity_due_reminder(opportunity, trigger: str = "automatic"):
    if not _can_send_reminder(opportunity):
        return False

    recipient = _get_active_owner_email(opportunity.name) or _get_owner_email(
        opportunity.get("opportunity_owner")
    )
    if not recipient:
        return False

    subject = _("Opportunity Due Reminder: {0}").format(opportunity.name)
    frappe.sendmail(
        recipients=[recipient],
        subject=subject,
        message=_build_message(opportunity),
        header=("Opportunity Reminder", "text/html"),
    )
    _log_due_reminder_activity(opportunity.name, recipient, trigger)
    return True


def _get_target_opportunities(days_before_due: int):
    target_date = add_days(nowdate(), days_before_due)
    return frappe.get_all(
        "Opportunity",
        fields=["name", "opportunity_owner", "expected_closing", "status", "custom_bid_status"],
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
    if not _can_send_reminder(opportunity):
        frappe.throw(_("No reminder sent because bid status must be In-progress."))

    sent = _send_opportunity_due_reminder(opportunity, trigger="manual")

    if not sent:
        frappe.throw(_("Could not send reminder because the Opportunity Owner has no email address."))

    return {"sent": 1, "opportunity": opportunity_name}
