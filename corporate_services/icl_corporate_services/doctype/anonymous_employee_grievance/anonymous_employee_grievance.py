import frappe
from frappe.model.document import Document


class AnonymousEmployeeGrievance(Document):
	def before_insert(self):
		if not self.tracking_token:
			self.tracking_token = frappe.generate_hash(length=24)
