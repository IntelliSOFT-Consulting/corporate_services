// Copyright (c) 2024, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

function calculate_totals(frm) {
	let total = 0;
	(frm.doc.table_pegz || []).forEach((row) => {
		total += flt(row.amount_kes);
	});
	frm.set_value("total", total);
	frm.set_value("total_in_local_currency", flt(total) * flt(frm.doc.exchange_rate));
}

frappe.ui.form.on("General Requisition Form", {
	exchange_rate(frm) {
		calculate_totals(frm);
	},
});

frappe.ui.form.on("General requisition description form", {
	amount_kes(frm) {
		calculate_totals(frm);
	},
	table_pegz_add(frm) {
		calculate_totals(frm);
	},
	table_pegz_remove(frm) {
		calculate_totals(frm);
	},
});
