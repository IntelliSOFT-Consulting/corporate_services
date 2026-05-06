import frappe


def get_finance_start_day():
    return int(frappe.db.get_single_value("Finance Settings", "start_date") or 29)


def get_finance_end_day():
    return int(frappe.db.get_single_value("Finance Settings", "end_date") or 28)
