const existing = frappe.listview_settings["Travel Request"] || {};
const existingAddFields = existing.add_fields || [];

frappe.listview_settings["Travel Request"] = {
	...existing,
	add_fields: Array.from(new Set([...existingAddFields, "custom_reconciliation_status"])),
	get_indicator(doc) {
		const status = doc.custom_reconciliation_status || "Pending Reconciliation";
		if (status === "Reconciled") {
			return [__("Reconciled"), "green", "custom_reconciliation_status,=,Reconciled"];
		}
		return [__("Pending Reconciliation"), "orange", "custom_reconciliation_status,!=,Reconciled"];
	},
};
