// Copyright (c) 2026, ICL Corporate Services and contributors
// For license information, please see license.txt

// Generate "Month YYYY" options for the last 24 months and next 3 months
function generateMonthYearOptions() {
	const MONTHS = [
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
	];
	const options = [""];
	const now = new Date();
	for (let i = 24; i >= -3; i--) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		options.push(`${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
	}
	return options;
}

frappe.query_reports["Timesheet Submission Report"] = {
	"filters": [
		{
			"fieldname": "month_year",
			"label": __("Month-Year"),
			"fieldtype": "Select",
			"options": generateMonthYearOptions(),
			"width": 160
		},
		{
			"fieldname": "employee",
			"label": __("Employee"),
			"fieldtype": "Link",
			"options": "Employee",
			"width": 120,
			"get_query": function () {
				return { "filters": { "status": "Active" } };
			}
		},
		{
			"fieldname": "department",
			"label": __("Department"),
			"fieldtype": "Link",
			"options": "Department",
			"width": 120
		},
		{
			"fieldname": "designation",
			"label": __("Designation"),
			"fieldtype": "Link",
			"options": "Designation",
			"width": 120
		},
		{
			"fieldname": "status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options": ["", "Open", "Approved", "Rejected", "Cancelled"],
			"default": "",
			"width": 120
		},
		{
			"fieldname": "workflow_state",
			"label": __("Workflow State"),
			"fieldtype": "Select",
			"options": [
				"",
				"Submitted to Supervisor",
				"Approved by Supervisor",
				"Rejected By Supervisor",
				"Submitted to HR",
				"Approved By HR",
				"Rejected By HR",
				"Submitted to Finance",
				"Approved by Finance",
				"Rejected by Finance"
			],
			"width": 160
		},
		{
			"fieldname": "timesheet_imported",
			"label": __("Imported Only"),
			"fieldtype": "Check",
			"width": 100
		}
	],

	"formatter": function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		// Colour-code Status column
		if (column.fieldname === "status" && data && data.status) {
			const STATUS_STYLE = {
				"Approved":      "color:#16a34a; font-weight:600;",
				"Rejected":      "color:#dc2626; font-weight:600;",
				"Cancelled":     "color:#64748b; font-weight:600;",
				"Open":          "color:#f59e0b; font-weight:600;",
				"Not Submitted": "color:#dc2626; font-weight:700; font-style:italic;"
			};
			const style = STATUS_STYLE[data.status];
			if (style) {
				value = `<span style="${style}">${data.status}</span>`;
			}
		}

		// Colour-code Workflow State column
		if (column.fieldname === "workflow_state" && data && data.workflow_state) {
			const WF_STYLE = {
				"Approved by Finance":    "color:#16a34a; font-weight:600;",
				"Approved By HR":         "color:#16a34a; font-weight:600;",
				"Approved by Supervisor": "color:#16a34a; font-weight:600;",
				"Rejected By Supervisor": "color:#dc2626; font-weight:600;",
				"Rejected By HR":         "color:#dc2626; font-weight:600;",
				"Rejected by Finance":    "color:#dc2626; font-weight:600;",
				"Submitted to Supervisor":"color:#f59e0b; font-weight:600;",
				"Submitted to HR":        "color:#f59e0b; font-weight:600;",
				"Submitted to Finance":   "color:#f59e0b; font-weight:600;"
			};
			const style = WF_STYLE[data.workflow_state];
			if (style) {
				value = `<span style="${style}">${data.workflow_state}</span>`;
			}
		}

		// Highlight unusually high hours
		if (column.fieldname === "total_working_hours" && data && data.total_working_hours > 200) {
			value = `<span style="color:#2563eb; font-weight:600;">${value}</span>`;
		}

		return value;
	},

	"onload": function (report) {
		report.page.add_inner_button(__("Notify Non-Submitters"), function () {
			const month_year = report.get_filter_value("month_year");

			if (!month_year) {
				frappe.msgprint({
					title: __("Select a Month"),
					message: __("Please select a Month-Year filter before sending notifications."),
					indicator: "orange"
				});
				return;
			}

			const data = report.data || [];
			const non_submitters = data.filter(r => r.status === "Not Submitted");

			if (!non_submitters.length) {
				frappe.msgprint({
					title: __("No Non-Submitters"),
					message: __("All employees in scope have submitted their timesheets for {0}.", [month_year]),
					indicator: "green"
				});
				return;
			}

			const employee_list = non_submitters.map(r => r.employee);
			const preview = non_submitters.slice(0, 5).map(r => r.employee_name).join(", ");
			const extra = non_submitters.length > 5
				? ` <em>…and ${non_submitters.length - 5} more</em>`
				: "";

			frappe.confirm(
				__(`Send a timesheet reminder to <strong>${non_submitters.length}</strong> employee(s)?<br>
					<small style="color:#6c757d;">${preview}${extra}</small>`),
				function () {
					frappe.call({
						method: "corporate_services.api.timesheet.notify_non_submitters.notify_non_submitters",
						args: {
							month_year: month_year,
							employee_list: JSON.stringify(employee_list)
						},
						freeze: true,
						freeze_message: __("Sending reminders…"),
						callback: function (r) {
							frappe.msgprint({
								title: __("Reminders Sent"),
								message: r.message,
								indicator: "green"
							});
						}
					});
				}
			);
		});
	}
};
