# Copyright (c) 2024, IntelliSOFT Consulting and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt
from frappe.model.document import Document


class PaymentEntryBudgetLine(Document):
    def validate(self):
        if self.usage_context == "Opportunity Detail Line" and not self.section:
            frappe.throw("Section is required for opportunity template lines.")

        total = 0.0

        for row in self.get("budget_line_details") or []:
            qty = flt(row.get("unit_loe"))
            rate = flt(row.get("rate"))

            if qty and rate:
                row.cost = qty * rate
            else:
                row.cost = flt(row.get("cost"))

            total += flt(row.cost)

        self.total_cost = total


@frappe.whitelist()
def get_budget_line_template(name: str):
    doc = frappe.get_doc("Payment Entry Budget Line", name)

    rows = []
    for row in doc.get("budget_line_details") or []:
        rows.append(
            {
                "budget_line": row.get("budget_line"),
                "unit_loe_type": row.get("unit_loe_type"),
                "unit_loe": flt(row.get("unit_loe")),
                "rate": flt(row.get("rate")),
                "cost": flt(row.get("cost")),
            }
        )

    return {
        "name": doc.name,
        "description": doc.description,
        "company": doc.company,
        "currency": doc.currency,
        "project": doc.project,
        "opportunity": doc.opportunity,
        "total_cost": flt(doc.total_cost),
        "budget_line_details": rows,
    }
