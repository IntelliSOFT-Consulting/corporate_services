# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class DetailedWorkPlan(Document):
	pass


@frappe.whitelist()
def sync_drive_link_from_lifecycle(docname: str):
	"""Find a Drive file link on the HIS PM Project Lifecycle record for the same Project
	and copy it into this Detailed Work Plan's google_drive_link field.

	This method attempts a few likely doctype names for the HIS PM lifecycle record and
	looks for fields that contain drive/google/file in the name.
	"""
	if not docname:
		frappe.throw(_("Document name required"))

	doc = frappe.get_doc("Detailed Work Plan", docname)
	project = getattr(doc, "project", None)
	if not project:
		frappe.throw(_("Please select a Project on the Detailed Work Plan first."))

	# permission check
	if not frappe.has_permission("Project", ptype="read", doc=project):
		frappe.throw(_("You do not have permission to access this Project"), frappe.PermissionError)

	# Candidate doctype names derived from the route 'his-pm-project-lifecycle'
	candidates = [
		"HIS PM Project Lifecycle",
		"His PM Project Lifecycle",
		"HIS PM Project LifeCycle",
		"HIS PM Project Life Cycle",
		"Project Lifecycle",
		"Project Life Cycle",
		"PM Project Lifecycle",
	]

	lifecycle_doc = None
	lifecycle_doctype = None
	for cand in candidates:
		try:
			if frappe.db.exists(cand, project):
				lifecycle_doc = frappe.get_doc(cand, project)
				lifecycle_doctype = cand
				break
		except Exception:
			# ignore and continue trying other names
			continue

	# If not found by name, try to find any doctype record with route "his-pm-project-lifecycle"
	if not lifecycle_doc:
		try:
			# find DocType with route 'his-pm-project-lifecycle' (if installed)
			routes = frappe.get_all("DocType", filters={"module": "HIS PM"}, fields=["name"]) if frappe.db.exists("DocType") else []
		except Exception:
			routes = []

	# Inspect lifecycle_doc for fields that look like a Drive/file link
	found_link = None
	if lifecycle_doc:
		for k, v in lifecycle_doc.as_dict().items():
			if not v:
				continue
			key = k.lower()
			if any(sub in key for sub in ("drive", "google", "file", "document", "link", "url")):
				# prefer values that look like urls
				val = v
				if isinstance(val, str) and (val.startswith("http://") or val.startswith("https://")):
					found_link = val
					break
				else:
					# keep as fallback
					found_link = val
	
	if not found_link:
		return {"updated": False, "reason": "No lifecycle record or drive link found"}

	# update Detailed Work Plan
	doc.google_drive_link = found_link
	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"updated": True, "google_drive_link": found_link, "source_doctype": lifecycle_doctype}
