import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import getdate, today


class AnonymousEmployeeGrievance(Document):
	def validate(self):
		if self.date_of_occurrence and getdate(self.date_of_occurrence) > getdate(today()):
			frappe.throw(_("Date of Occurrence cannot be a future date."))

	def before_insert(self):
		if not self.tracking_token:
			self.tracking_token = frappe.generate_hash(length=24)
