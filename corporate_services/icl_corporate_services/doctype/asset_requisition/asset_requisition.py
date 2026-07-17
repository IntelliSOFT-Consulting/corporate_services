# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

from frappe.model.document import Document
from frappe.utils import flt


class AssetRequisition(Document):
	def validate(self):
		self.total = sum(flt(row.amount) for row in self.asset_requisition_table)
		self.total_in_local_currency = flt(self.total) * flt(self.exchange_rate)
