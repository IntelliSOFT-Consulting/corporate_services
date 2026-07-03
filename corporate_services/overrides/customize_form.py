import frappe
from frappe.custom.doctype.customize_form.customize_form import CustomizeForm


class CorporateServicesCustomizeForm(CustomizeForm):
	def set_property_setters_for_actions_and_links(self, meta):
		for fieldname in ("links", "actions", "states"):
			for d in self.get(fieldname) or []:
				if d.name and d.get("custom"):
					db_modified = frappe.db.get_value(d.doctype, d.name, "modified")
					if db_modified:
						d.modified = db_modified
		super().set_property_setters_for_actions_and_links(meta)
