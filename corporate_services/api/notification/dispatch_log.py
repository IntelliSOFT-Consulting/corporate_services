import functools

import frappe

LOG_DOCTYPE = "Notification Dispatch Log"


def is_transition(doc):
	"""True when workflow_state actually changed in this save (incl. first set)."""
	return bool(doc.get("workflow_state")) and doc.has_value_changed("workflow_state")


def reset(doc):
	"""Clear the doc's dedup rows so a new state visit can notify again."""
	frappe.db.delete(
		LOG_DOCTYPE,
		{"reference_doctype": doc.doctype, "reference_name": doc.name},
	)


def on_transition(doc):
	"""Gate + reset in one call. Returns True (and clears prior rows) only on a
	real workflow_state transition; False otherwise so the caller can bail."""
	if not is_transition(doc):
		return False
	reset(doc)
	return True


def should_send(doc, recipient):
	"""False if `recipient` was already notified during this state visit."""
	if not recipient:
		return False
	return not frappe.db.exists(
		LOG_DOCTYPE,
		{
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
			"workflow_state": doc.workflow_state,
			"recipient": recipient,
		},
	)


def mark_sent(doc, recipient):
	"""Record that `recipient` was notified for the current state."""
	frappe.get_doc(
		{
			"doctype": LOG_DOCTYPE,
			"reference_doctype": doc.doctype,
			"reference_name": doc.name,
			"workflow_state": doc.workflow_state,
			"recipient": recipient,
			"sent_on": frappe.utils.now(),
		}
	).insert(ignore_permissions=True)


def filter_recipients(doc, recipients):
	"""Return only the recipients not yet notified during this state visit,
	marking each returned recipient as sent. Pass the result straight to
	frappe.sendmail; returns [] when everyone has already been notified."""
	unsent = []
	for r in recipients or []:
		if should_send(doc, r):
			mark_sent(doc, r)
			unsent.append(r)
	return unsent


def dedup(fn):
	"""Wrap an alert(doc, method) so it only runs on a real workflow transition,
	resetting the dedup log first. Inside the wrapped fn, still guard each
	recipient with should_send()/mark_sent()."""

	@functools.wraps(fn)
	def wrapper(doc, method=None):
		if not on_transition(doc):
			return
		return fn(doc, method)

	return wrapper
