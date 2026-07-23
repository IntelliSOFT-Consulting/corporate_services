import frappe
from frappe import _
from frappe.utils import get_url_to_form
from corporate_services.api.notification.notification_contacts import get_corporate_services_head_email


@frappe.whitelist(allow_guest=True)
def get_grievance_types():
	return frappe.get_all("Grievance Type", fields=["name"], order_by="name", ignore_permissions=True)


@frappe.whitelist(allow_guest=True)
def submit_anonymous_grievance(
	grievance_type: str,
	description: str,
	cause_of_grievance: str | None = None,
	date_of_occurrence: str | None = None,
	severity: str | None = None,
	grievance_against_party: str | None = None,
	grievance_against: str | None = None,
	associated_document_type: str | None = None,
	associated_document: str | None = None,
	witnesses: str | None = None,
):
	doc = frappe.new_doc("Anonymous Employee Grievance")
	doc.grievance_type = grievance_type
	doc.description = description
	doc.cause_of_grievance = cause_of_grievance
	doc.date_of_occurrence = date_of_occurrence
	doc.severity = severity
	doc.grievance_against_party = grievance_against_party
	doc.grievance_against = grievance_against
	doc.associated_document_type = associated_document_type
	doc.associated_document = associated_document
	doc.witnesses = witnesses
	doc.source_channel = "Public Guest Form"
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	return {"tracking_code": doc.tracking_token}


def _get_by_tracking_code(tracking_code: str):
	name = frappe.db.get_value("Anonymous Employee Grievance", {"tracking_token": tracking_code})
	if not name:
		frappe.throw(_("No grievance found for that tracking code"), frappe.DoesNotExistError)
	return frappe.get_doc("Anonymous Employee Grievance", name)


@frappe.whitelist(allow_guest=True)
def get_anonymous_grievance_status(tracking_code: str):
	doc = _get_by_tracking_code(tracking_code)
	return {
		"workflow_state": doc.workflow_state,
		"correspondence": [
			{"sender": row.sender, "message": row.message, "sent_on": row.sent_on}
			for row in doc.correspondence
		],
	}


@frappe.whitelist(allow_guest=True)
def reply_to_anonymous_grievance(tracking_code: str, message: str):
	doc = _get_by_tracking_code(tracking_code)
	doc.append("correspondence", {"sender": "Reporter", "message": message})
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	recipients = get_corporate_services_head_email()
	if recipients:
		frappe.sendmail(
			recipients=recipients,
			subject=_("New Response on Anonymous Grievance {0}").format(doc.name),
			message="""
				Dear Head of Corporate Services,<br><br>
				The reporter has responded on an anonymous grievance. You can view it <a href="{}">here</a>.<br><br>
				Kind regards,<br>
				Grievance Management System
			""".format(get_url_to_form(doc.doctype, doc.name)),
		)

	return {"ok": True}


def alert(doc, method=None):
	recipients = get_corporate_services_head_email()
	if not recipients:
		return
	frappe.sendmail(
		recipients=recipients,
		subject=_("New Anonymous Employee Grievance Submitted"),
		message="""
			Dear Head of Corporate Services,<br><br>
			A new anonymous grievance has been submitted ({}). You can view it <a href="{}">here</a>.<br><br>
			Kind regards,<br>
			Grievance Management Module
		""".format(doc.name, get_url_to_form(doc.doctype, doc.name)),
	)
