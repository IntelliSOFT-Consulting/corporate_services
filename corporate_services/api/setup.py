import frappe

DOCTYPE_LINKS = []


def add_connections():
	for conn in DOCTYPE_LINKS:
		if frappe.db.exists("DocType Link", {"parent": conn["parent"], "link_doctype": conn["link_doctype"]}):
			continue
		frappe.get_doc({
			"doctype": "DocType Link",
			"parenttype": "DocType",
			"parentfield": "links",
			"custom": 1,
			**conn,
		}).insert(ignore_permissions=True)
		frappe.db.commit()
