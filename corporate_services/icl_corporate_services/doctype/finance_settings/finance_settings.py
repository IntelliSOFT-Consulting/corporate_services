# Copyright (c) 2026, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class FinanceSettings(Document):
    def validate(self):
        if self.timesheet_reminder and frappe.utils.cint(self.days_before_start_date) <= 0:
            frappe.throw(_("Days Before Start date must be greater than 0 when Timesheet Reminder is enabled."))
