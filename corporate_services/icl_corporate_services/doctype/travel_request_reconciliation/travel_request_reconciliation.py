# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt


class TravelRequestReconciliation(Document):
	def validate(self):
		self._compute_totals()

	def on_update(self):
		_sync_travel_request_reconciliation_status(self.travel_request)

	def on_trash(self):
		_sync_travel_request_reconciliation_status(self.travel_request)

	def _compute_totals(self):
		total_spent = 0.0
		total_local_amount = 0.0

		for row in self.activity_participants_reconciliation or []:
			total_paid = flt(row.total_paid)
			fx_rate = flt(row.fx_rate)
			local_amount = total_paid * fx_rate if fx_rate else total_paid
			row.amount_in_local_currency = local_amount
			total_spent += total_paid
			total_local_amount += local_amount

		self.total_spent = total_spent
		self.total_local_amount = total_local_amount

		allocated_amount = flt(self.actual_allocated_amount) or flt(self.total_advance)
		self.total_balance = allocated_amount - total_spent


def _sync_travel_request_reconciliation_status(travel_request_name):
	if not travel_request_name:
		return

	submitted_reconciliation = frappe.db.get_value(
		"Travel Request Reconciliation",
		{"travel_request": travel_request_name, "docstatus": 1},
		["name", "date_of_reconciliation", "actual_allocated_amount", "total_advance", "total_spent", "total_balance"],
		as_dict=True,
	)

	values = {
		"custom_reconciliation_status": "Pending Reconciliation",
		"custom_reconciliation_reference": None,
		"custom_reconciliation_date": None,
		"custom_actual_allocated_amount_used": 0,
		"custom_reconciled_total_spent": 0,
		"custom_reconciled_total_balance": 0,
	}

	if submitted_reconciliation:
		values.update(
			{
				"custom_reconciliation_status": "Reconciled",
				"custom_reconciliation_reference": submitted_reconciliation.name,
				"custom_reconciliation_date": submitted_reconciliation.date_of_reconciliation,
				"custom_actual_allocated_amount_used": flt(submitted_reconciliation.actual_allocated_amount)
				or flt(submitted_reconciliation.total_advance),
				"custom_reconciled_total_spent": flt(submitted_reconciliation.total_spent),
				"custom_reconciled_total_balance": flt(submitted_reconciliation.total_balance),
			}
		)

	frappe.db.set_value("Travel Request", travel_request_name, values, update_modified=False)


def sync_travel_request_reconciliation_status(doc, method=None):
	_sync_travel_request_reconciliation_status(getattr(doc, "travel_request", None))
