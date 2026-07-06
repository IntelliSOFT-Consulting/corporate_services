import frappe
from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification


def notify(users, subject, message, doctype=None, docname=None):
	users = [u for u in dict.fromkeys(users) if u]
	if not users:
		return

	enqueue_create_notification(
		users,
		{
			"type": "Alert",
			"document_type": doctype,
			"document_name": docname,
			"subject": subject,
			"email_content": message,
		},
	)

	try:
		frappe.sendmail(recipients=users, subject=subject, message=message)
	except Exception:
		frappe.log_error(frappe.get_traceback(), "Project Notification Email Failed")
