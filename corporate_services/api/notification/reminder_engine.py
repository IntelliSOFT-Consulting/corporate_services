from datetime import timedelta

import frappe
from frappe import _
from frappe.utils import get_datetime, get_url_to_form, now_datetime

from corporate_services.api.notification.notification_contacts import get_supervisor_contact

LOG_DOCTYPE = "Reminder Log"
DISPATCH_LOG_DOCTYPE = "Notification Dispatch Log"


def _timesheet_submitter_contact(doc):
	employee = frappe.get_doc("Employee", doc.employee)
	return frappe._dict(
		user_id=employee.user_id,
		email=employee.company_email or employee.personal_email,
		name=employee.employee_name,
	)


def _timesheet_approver_contacts(doc):
	employee = frappe.get_doc("Employee", doc.employee)
	contact = get_supervisor_contact(employee)
	return [contact] if contact and contact.email else []


# Doctype-specific contact resolvers. To extend reminders to another doctype,
# register its submitter/approver resolvers here and add a matching Reminder
# Rule row on HR Config.
SUBMITTER_RESOLVERS = {
	"Timesheet Submission": _timesheet_submitter_contact,
}
APPROVER_RESOLVERS = {
	"Timesheet Submission": _timesheet_approver_contacts,
}


def _resolve_submitter(reference_doctype, doc):
	resolver = SUBMITTER_RESOLVERS.get(reference_doctype)
	return resolver(doc) if resolver else None


def _resolve_approvers(reference_doctype, doc):
	resolver = APPROVER_RESOLVERS.get(reference_doctype)
	return resolver(doc) if resolver else []


def get_active_rules():
	config = frappe.get_single("HR Config")
	return [row for row in (config.reminder_rules or []) if row.enabled]


def get_rule(reference_doctype, workflow_state):
	for row in get_active_rules():
		if row.reference_doctype == reference_doctype and row.pending_workflow_state == workflow_state:
			return row
	return None


def get_state_entered_at(doc, workflow_state):
	"""Best-effort timestamp for when `doc` entered `workflow_state`.

	Reuses Notification Dispatch Log: its rows are written the moment the
	workflow transition email fires, in the same request as the state
	change, so the earliest sent_on for this state is a closer proxy than
	doc.modified, which also moves on unrelated edits made while pending.
	"""
	entered_at = frappe.db.get_value(
		DISPATCH_LOG_DOCTYPE,
		{
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
			"workflow_state": workflow_state,
		},
		"min(sent_on)",
	)
	return get_datetime(entered_at) if entered_at else get_datetime(doc.modified)


def _already_sent(doc, workflow_state, event_type, recipient):
	return frappe.db.exists(
		LOG_DOCTYPE,
		{
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
			"workflow_state": workflow_state,
			"event_type": event_type,
			"recipient": recipient,
		},
	)


def _log_event(doc, workflow_state, event_type, recipient, triggered_by=None):
	frappe.get_doc(
		{
			"doctype": LOG_DOCTYPE,
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
			"workflow_state": workflow_state,
			"event_type": event_type,
			"recipient": recipient,
			"triggered_by": triggered_by,
			"sent_on": now_datetime(),
		}
	).insert(ignore_permissions=True)


def _send(doc, contact, subject, message):
	if not contact or not contact.email:
		return False
	frappe.sendmail(recipients=[contact.email], subject=subject, message=message)

	if contact.get("user_id") and frappe.db.exists("User", contact.user_id):
		try:
			frappe.get_doc(
				{
					"doctype": "Notification Log",
					"subject": subject,
					"email_content": message,
					"for_user": contact.user_id,
					"type": "Alert",
					"document_type": doc.doctype,
					"document_name": doc.name,
					"from_user": frappe.session.user,
				}
			).insert(ignore_permissions=True)
		except Exception:
			frappe.log_error(frappe.get_traceback(), "Reminder engine: Notification Log failed")

	return True


def check_overdue_documents():
	"""Scheduled entrypoint: notify submitters/approvers of pending documents
	that have breached their configured Reminder Rule SLA."""
	for rule in get_active_rules():
		if rule.reference_doctype not in APPROVER_RESOLVERS:
			continue

		pending_docs = frappe.get_all(
			rule.reference_doctype,
			filters={"workflow_state": rule.pending_workflow_state, "docstatus": ["!=", 2]},
			pluck="name",
		)
		for name in pending_docs:
			try:
				_process_overdue(rule, name)
			except Exception:
				frappe.log_error(
					frappe.get_traceback(),
					f"Reminder engine failed for {rule.reference_doctype} {name}",
				)


def _process_overdue(rule, name):
	doc = frappe.get_doc(rule.reference_doctype, name)
	if doc.workflow_state != rule.pending_workflow_state:
		return

	entered_at = get_state_entered_at(doc, rule.pending_workflow_state)
	if now_datetime() < entered_at + timedelta(hours=rule.sla_hours):
		return

	doctype_url = get_url_to_form(doc.doctype, doc.name)

	if rule.notify_submitter_on_breach:
		submitter = _resolve_submitter(rule.reference_doctype, doc)
		if submitter and submitter.email and not _already_sent(
			doc, doc.workflow_state, "Breach Notice", submitter.email
		):
			message = (
				f"Dear {submitter.name},<br><br>"
				f"Your {doc.doctype} ({doc.name}) has not yet been reviewed by your approver. "
				f'You can view it <a href="{doctype_url}">here</a> and nudge them for a review.<br><br>'
				"Kind regards,<br>System"
			)
			if _send(doc, submitter, _("Your {0} is awaiting review").format(doc.doctype), message):
				_log_event(doc, doc.workflow_state, "Breach Notice", submitter.email)

	if rule.auto_remind_approver:
		for approver in _resolve_approvers(rule.reference_doctype, doc):
			if approver.email and not _already_sent(
				doc, doc.workflow_state, "Auto Remind Approver", approver.email
			):
				message = (
					f"Dear {approver.name},<br><br>"
					f"A {doc.doctype} ({doc.name}) has been awaiting your review for over "
					f'{rule.sla_hours} hours. Please review it <a href="{doctype_url}">here</a>.<br><br>'
					"Kind regards,<br>System"
				)
				if _send(
					doc, approver, _("Reminder: {0} awaiting your review").format(doc.doctype), message
				):
					_log_event(doc, doc.workflow_state, "Auto Remind Approver", approver.email)


@frappe.whitelist()
def nudge_approver(reference_doctype, reference_name):
	doc = frappe.get_doc(reference_doctype, reference_name)
	doc.check_permission("read")

	rule = get_rule(reference_doctype, doc.workflow_state)
	if not rule or not rule.allow_submitter_nudge:
		frappe.throw(_("Nudging is not enabled for {0} in its current state.").format(reference_doctype))

	submitter = _resolve_submitter(reference_doctype, doc)
	if (not submitter or submitter.user_id != frappe.session.user) and not frappe.has_permission(
		reference_doctype, "write", doc, user=frappe.session.user
	):
		frappe.throw(_("Only the submitter can nudge the approver."), frappe.PermissionError)

	approvers = _resolve_approvers(reference_doctype, doc)
	if not approvers:
		frappe.throw(_("No approver could be resolved for this document."))

	cooldown_hours = rule.nudge_cooldown_hours or 0
	last_nudge = frappe.db.get_value(
		LOG_DOCTYPE,
		{
			"reference_doctype": reference_doctype,
			"reference_name": reference_name,
			"workflow_state": doc.workflow_state,
			"event_type": "Employee Nudge",
		},
		"max(sent_on)",
	)
	if last_nudge and cooldown_hours:
		next_allowed = get_datetime(last_nudge) + timedelta(hours=cooldown_hours)
		if now_datetime() < next_allowed:
			remaining = next_allowed - now_datetime()
			hours, remainder = divmod(int(remaining.total_seconds()), 3600)
			minutes = remainder // 60
			return {
				"success": False,
				"message": _("You can nudge again in {0}h {1}m.").format(hours, minutes),
			}

	doctype_url = get_url_to_form(doc.doctype, doc.name)
	submitter_name = submitter.name if submitter else frappe.session.user
	sent_to = []
	for approver in approvers:
		message = (
			f"Dear {approver.name},<br><br>"
			f"{submitter_name} is nudging you to review their {doc.doctype} ({doc.name}). "
			f'You can view it <a href="{doctype_url}">here</a>.<br><br>'
			f"Kind regards,<br>{submitter_name}"
		)
		if _send(doc, approver, _("Reminder: please review {0}").format(doc.name), message):
			_log_event(
				doc, doc.workflow_state, "Employee Nudge", approver.email, triggered_by=frappe.session.user
			)
			sent_to.append(approver.name)

	if not sent_to:
		frappe.throw(_("Could not reach the approver - no email on file."))

	return {"success": True, "message": _("Reminder sent to {0}.").format(", ".join(sent_to))}
