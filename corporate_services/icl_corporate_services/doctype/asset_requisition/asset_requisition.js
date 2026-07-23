// Copyright (c) 2024, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

function calculate_totals(frm) {
	let total = 0;
	(frm.doc.asset_requisition_table || []).forEach((row) => {
		total += flt(row.amount);
	});
	frm.set_value("total", total);
	frm.set_value("total_in_local_currency", flt(total) * flt(frm.doc.exchange_rate));
}

frappe.ui.form.on("Asset Requisition", {
	exchange_rate(frm) {
		calculate_totals(frm);
	},
});

frappe.ui.form.on("Asset Requisition Table", {
	amount(frm) {
		calculate_totals(frm);
	},
	asset_requisition_table_add(frm) {
		calculate_totals(frm);
	},
	asset_requisition_table_remove(frm) {
		calculate_totals(frm);
	},
});
