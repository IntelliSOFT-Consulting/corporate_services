# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from frappe.utils import flt


class GeneralRequisitionForm(Document):
	def validate(self):
		self.total = sum(flt(row.amount_kes) for row in self.table_pegz)
		self.total_in_local_currency = flt(self.total) * flt(self.exchange_rate)
