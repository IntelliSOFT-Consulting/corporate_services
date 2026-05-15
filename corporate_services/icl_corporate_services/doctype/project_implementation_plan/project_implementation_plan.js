// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Project Implementation Plan", {
	start_date(frm) {
		update_parent_duration(frm);
	},
	end_date(frm) {
		update_parent_duration(frm);
	},
});

frappe.ui.form.on("Project Implementation Plan Item", {
	start_date(frm, cdt, cdn) {
		update_row_duration(cdt, cdn);
	},
	end_date(frm, cdt, cdn) {
		update_row_duration(cdt, cdn);
	},
});

function update_parent_duration(frm) {
	if (!frm.doc.start_date || !frm.doc.end_date) return;
	const days = frappe.datetime.get_day_diff(frm.doc.end_date, frm.doc.start_date);
	frm.set_value("duration_days", days >= 0 ? days : 0);
}

function update_row_duration(cdt, cdn) {
	const row = locals[cdt][cdn];
	if (!row.start_date || !row.end_date) return;
	const days = frappe.datetime.get_day_diff(row.end_date, row.start_date);
	frappe.model.set_value(cdt, cdn, "duration_days", days >= 0 ? days : 0);
}
