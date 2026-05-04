// Copyright (c) 2024, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Timesheet Submission", {
	onload(frm) {
		toggle_finance_tab(frm);
	},

	refresh(frm) {
		const can_view_finance =
			frappe.user.has_role("System Manager") || frappe.user.has_role("Finance");

		toggle_finance_tab(frm);
		add_insert_tasks_action(frm);

		if (can_view_finance) {
			compute_finance(frm);
		}
	},
});

function toggle_finance_tab(frm) {
	const can_view_finance =
		frappe.user.has_role("System Manager") || frappe.user.has_role("Finance");

	frm.set_df_property("finance_tab", "hidden", can_view_finance ? 0 : 1);

	if (!can_view_finance) {
		frm.set_df_property("finance_section", "hidden", 1);
		frm.set_df_property("finance_breakdown_section", "hidden", 1);
		frm.set_df_property("finance_breakdown_note", "hidden", 1);
	}
}

function add_insert_tasks_action(frm) {
	frm.set_df_property("insert_timesheet_tasks", "hidden", 1);
	frm.remove_custom_button(__("Insert Tasks"));

	const can_show =
		!frm.is_new() &&
		frm.doc.upload_type === "System Upload" &&
		frm.doc.employee &&
		frm.doc.month_year;

	if (!can_show) return;

	frm.add_custom_button(__("Insert Tasks"), function () {
		window.location.href = `/app/employee_timesheet_entry?submission=${encodeURIComponent(frm.doc.name)}`;
	});
	frm.change_custom_button_type(__("Insert Tasks"), null, "success");
}

function compute_finance(frm) {
	const ctc = frm.doc.employee_salary || 0;
	const total_hours = frm.doc.total_working_hours || 0;
	const per_hour = ctc && total_hours ? ctc / (22 * 8) : 0;

	frm.doc.total_billable_hours = total_hours;
	frm.refresh_field("total_billable_hours");

	if (per_hour) {
		frm.doc.salary_per_hour = per_hour;
		frm.refresh_field("salary_per_hour");
	}

	const rows = frm.doc.timesheet_per_project || [];
	if (!rows.length) return;

	let html =
		'<table class="table table-bordered table-sm">' +
		"<thead><tr><th>Timesheet</th><th>Project</th><th>Month</th><th>Hours</th><th>Pay</th><th>%</th></tr></thead><tbody>";

	let total_row_hours = 0;

	rows.forEach((row) => {
		const row_hours = flt(row.total_hours);
		const row_pay = total_hours ? (row_hours / total_hours) * ctc : 0;
		const row_percent = total_hours ? (row_hours / total_hours) * 100 : 0;
		const row_project_or_activity = row.project_name || row.timesheet_type || "";

		total_row_hours += row_hours;

		html += `<tr>
			<td>${row.timesheet || ""}</td>
			<td>${row_project_or_activity}</td>
			<td>${row.month || ""}</td>
			<td>${row_hours}</td>
			<td>${frappe.format(row_pay || 0, { fieldtype: "Currency" })}</td>
			<td>${row_percent.toFixed(2)}%</td>
		</tr>`;
	});

	html += `
		<tr>
			<td colspan="3"><strong>Total</strong></td>
			<td><strong>${total_row_hours}</strong></td>
			<td><strong>${frappe.format(ctc || 0, { fieldtype: "Currency" })}</strong></td>
			<td><strong>100.00%</strong></td>
		</tr>
	</tbody></table>`;
	frm.set_df_property("finance_breakdown_note", "options", html);
	frm.refresh_field("finance_breakdown_note");
}
