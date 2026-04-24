frappe.ui.form.on("Payment Entry", {
	refresh(frm) {
		apply_currency_formatters(frm);
	},
	custom_budget_line(frm) {
		load_budget_line_template(frm);
	},
	before_save(frm) {
		refresh_total_cost(frm);
	},
});

frappe.ui.form.on("Payment Entry Budget Line", {
	refresh(frm) {
		apply_currency_formatters(frm);
	},
	before_save(frm) {
		refresh_total_cost(frm);
	},
});

frappe.ui.form.on("Budget Line Template", {
	unit_loe(frm, cdt, cdn) {
		calculate_row_cost(frm, cdt, cdn);
	},
	rate(frm, cdt, cdn) {
		calculate_row_cost(frm, cdt, cdn);
	},
	cost(frm) {
		refresh_total_cost(frm);
	},
	custom_budget_line_details_add(frm) {
		refresh_total_cost(frm);
	},
	custom_budget_line_details_remove(frm) {
		refresh_total_cost(frm);
	},
	budget_line_details_add(frm) {
		refresh_total_cost(frm);
	},
	budget_line_details_remove(frm) {
		refresh_total_cost(frm);
	},
});

function calculate_row_cost(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	const qty = flt(row.unit_loe);
	const rate = flt(row.rate);
	const cost = qty * rate;

	frappe.model.set_value(cdt, cdn, "cost", cost).then(() => refresh_total_cost(frm));
}

function refresh_total_cost(frm) {
	let table_field = null;
	let total_field = null;

	if (frm.doc.doctype === "Payment Entry") {
		table_field = "custom_budget_line_details";
		total_field = "custom_total_cost";
	} else if (frm.doc.doctype === "Payment Entry Budget Line") {
		table_field = "budget_line_details";
		total_field = "total_cost";
	}

	if (!table_field || !total_field) return;

	const rows = frm.doc[table_field] || [];
	const total = rows.reduce((sum, row) => sum + flt(row.cost), 0);
	frm.set_value(total_field, total);
}

function apply_currency_formatters(frm) {
	let grid = null;
	let options = null;

	if (frm.doc.doctype === "Payment Entry" && frm.fields_dict.custom_budget_line_details) {
		grid = frm.fields_dict.custom_budget_line_details.grid;
		options = "paid_from_account_currency";
	} else if (frm.doc.doctype === "Payment Entry Budget Line" && frm.fields_dict.budget_line_details) {
		grid = frm.fields_dict.budget_line_details.grid;
		options = "currency";
	}

	if (!grid) return;
	grid.update_docfield_property("cost", "fieldtype", "Currency");
	grid.update_docfield_property("cost", "options", options);
	frm.refresh_field(grid.df.fieldname);
}

function load_budget_line_template(frm) {
	if (!frm.doc.custom_budget_line) {
		frm.clear_table("custom_budget_line_details");
		frm.refresh_field("custom_budget_line_details");
		frm.set_value("custom_total_cost", 0);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.payment_entry_budget_line.payment_entry_budget_line.get_budget_line_template",
		args: {
			name: frm.doc.custom_budget_line,
		},
		callback: (r) => {
			const data = r.message || {};
			const rows = data.budget_line_details || [];

			frm.clear_table("custom_budget_line_details");
			rows.forEach((row) => {
				const child = frm.add_child("custom_budget_line_details");
				child.budget_line = row.budget_line;
				child.unit_loe_type = row.unit_loe_type;
				child.unit_loe = flt(row.unit_loe);
				child.rate = flt(row.rate);
				child.cost = flt(row.cost);
			});
			frm.refresh_field("custom_budget_line_details");

			if (!frm.doc.project && data.project) frm.set_value("project", data.project);
			if (!frm.doc.custom_total_cost) frm.set_value("custom_total_cost", flt(data.total_cost));
			refresh_total_cost(frm);
		},
	});
}
