import frappe
from frappe import _
from frappe.utils import get_url_to_form

from corporate_services.api.notification.project.common import notify
from corporate_services.api.project import get_project_manager_users

CATEGORY_LABELS = {
	"risks": "Risk",
	"assumptions": "Assumption",
	"issues": "Issue",
	"dependencies": "Dependency",
}


def notify_owner_assigned(project_name, category, assessment_name, row_label, owner):
	if not owner:
		return
	label = CATEGORY_LABELS.get(category, "Item")
	url = get_url_to_form("Project Risk Assessment", assessment_name)
	subject = _("You have been assigned as owner of a {0} on {1}").format(label, project_name)
	message = _(
		"You have been assigned as the owner of the following {0} on project {1}:<br><br>"
		"<strong>{2}</strong><br><br>"
		"View it <a href=\"{3}\">here</a>."
	).format(label, project_name, row_label or "-", url)
	notify([owner], subject, message, "Project Risk Assessment", assessment_name)


def notify_escalation(project_name, category, assessment_name, row_label):
	label = CATEGORY_LABELS.get(category, "Item")
	url = get_url_to_form("Project Risk Assessment", assessment_name)
	subject = _("{0} escalated on {1}").format(label, project_name)
	message = _(
		"A {0} has been escalated on project {1}:<br><br>"
		"<strong>{2}</strong><br><br>"
		"View it <a href=\"{3}\">here</a>."
	).format(label, project_name, row_label or "-", url)

	recipients = set(get_project_manager_users(project_name))
	recipients.update(frappe.get_all("Has Role", filters={"role": "SMT"}, pluck="parent"))
	notify(list(recipients), subject, message, "Project Risk Assessment", assessment_name)
