frappe.pages["onboarding-reports"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Onboarding Reports",
		single_column: true,
	});

	OnboardingReports.init(page);
};

const OnboardingReports = {
	page: null,
	employee_filter: null,
	data: null,

	init(page) {
		this.page = page;
		this.page.set_primary_action("Refresh", () => this.load());

		this.employee_filter = this.page.add_field({
			label: "Employee",
			fieldname: "employee",
			fieldtype: "Link",
			options: "Employee",
			change: () => this.load(),
		});

		this.page.add_action_item("Clear Employee Filter", () => {
			this.employee_filter.set_value("");
			this.load();
		});

		$(this.page.body).html(this.get_layout());
		$(this.page.body).on("click", "[data-employee]", (event) => {
			const employee = event.currentTarget.getAttribute("data-employee");
			this.employee_filter.set_value(employee);
			this.load();
		});

		this.apply_route_options();
		this.load();
	},

	apply_route_options() {
		if (frappe.route_options && frappe.route_options.employee) {
			this.employee_filter.set_value(frappe.route_options.employee);
			frappe.route_options = null;
		}
	},

	load() {
		this.show_loading();

		frappe.call({
			method: "corporate_services.icl_corporate_services.page.onboarding_reports.onboarding_reports.get_dashboard_data",
			args: {
				employee: this.employee_filter.get_value() || undefined,
			},
			callback: (r) => {
				this.data = r.message || {};
				this.render();
			},
		});
	},

	get_layout() {
		return `
			<div id="onboarding-reports-root" class="container-fluid py-3 px-4">
				<div id="onboarding-reports-content"></div>
			</div>
		`;
	},

	show_loading() {
		this.get_content().html(`
			<div class="text-center text-muted py-5">
				<div class="spinner-border spinner-border-sm me-2" role="status"></div>
				Loading onboarding reports...
			</div>
		`);
	},

	render() {
		const data = this.data || {};
		const summary = data.summary || {};
		const employees = data.employees || [];

		if (!employees.length) {
			this.get_content().html(`
				<div class="alert alert-warning">
					No onboarding schedules found for the selected filter.
				</div>
			`);
			return;
		}

		this.get_content().html(`
			<div class="mb-3">
				<h5 class="mb-1">Onboarding Reports</h5>
				<div class="text-muted" style="font-size:13px;">
					Progress, cohort completion, department completion, and probation review status.
				</div>
			</div>

			<div class="row g-3 mb-4">
				${this.metric_card("Employees", summary.total_employees)}
				${this.metric_card("Average Completion", `${summary.average_completion_pct || 0}%`)}
				${this.metric_card("With Overdue Tasks", summary.employees_with_overdue_tasks || 0)}
				${this.metric_card("Completed Onboarding", summary.completed_onboarding || 0)}
			</div>

			<div class="card border mb-4">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
						<div>
							<div class="fw-semibold">Onboarding Progress Dashboard by Employee</div>
							<div class="text-muted" style="font-size:12px;">Completion percentage and overdue onboarding tasks.</div>
						</div>
					</div>
					${this.render_employee_table(employees)}
				</div>
			</div>

			<div class="row g-3 mb-4">
				<div class="col-lg-6">
					<div class="card border h-100">
						<div class="card-body">
							<div class="fw-semibold mb-1">Onboarding Completion by Cohort</div>
							<div class="text-muted mb-3" style="font-size:12px;">Grouped by monthly joiners.</div>
							${this.render_aggregate_table(data.cohorts || [], "cohort")}
						</div>
					</div>
				</div>
				<div class="col-lg-6">
					<div class="card border h-100">
						<div class="card-body">
							<div class="fw-semibold mb-1">Onboarding Completion by Department</div>
							<div class="text-muted mb-3" style="font-size:12px;">Department-level progress and overdue counts.</div>
							${this.render_aggregate_table(data.departments || [], "department")}
						</div>
					</div>
				</div>
			</div>

			<div class="card border">
				<div class="card-body">
					<div class="fw-semibold mb-1">Probation Review Completion Report</div>
					<div class="text-muted mb-3" style="font-size:12px;">Supervisor completion is from Onboarding Schedule. Employee completion is derived from an existing probation appraisal record.</div>
					${this.render_probation_table(data.probation_reviews || [])}
				</div>
			</div>
		`);
	},

	metric_card(label, value) {
		return `
			<div class="col-md-3">
				<div class="card border h-100 text-center p-3">
					<div class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;">${frappe.utils.escape_html(label)}</div>
					<div class="fw-semibold mt-2" style="font-size:28px;">${frappe.utils.escape_html(String(value))}</div>
				</div>
			</div>
		`;
	},

	render_employee_table(rows) {
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Department</th>
							<th>Joining Date</th>
							<th>Completion</th>
							<th>Overdue Tasks</th>
							<th>Probation</th>
							<th style="width:120px;">Action</th>
						</tr>
					</thead>
					<tbody>
						${rows
							.map(
								(row) => `
									<tr>
										<td>
											<div class="fw-semibold">${frappe.utils.escape_html(row.employee_name)}</div>
											<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(row.employee)}</div>
										</td>
										<td>${frappe.utils.escape_html(row.department || "")}</td>
										<td>${frappe.utils.escape_html(row.date_of_joining || "-")}</td>
										<td>
											<div class="progress" style="height:8px;">
												<div class="progress-bar bg-success" style="width:${row.completion_pct}%"></div>
											</div>
											<div class="mt-1" style="font-size:12px;">${row.completion_pct}% (${row.completed_tasks}/${row.total_tasks})</div>
										</td>
										<td>
											<div>${row.overdue_task_count}</div>
											<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html((row.overdue_tasks || []).slice(0, 2).join(", ") || "None")}</div>
										</td>
										<td>${this.status_badge(row.probation_supervisor_complete ? "Supervisor Complete" : (row.probation_due ? "Due" : "Not Due"), {
											"Supervisor Complete": "success",
											Due: "danger",
											"Not Due": "secondary",
										})}</td>
										<td>
											<button class="btn btn-sm btn-outline-primary" data-employee="${frappe.utils.escape_html(row.employee)}">
												View
											</button>
										</td>
									</tr>
								`
							)
							.join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	render_aggregate_table(rows, mode) {
		const label = mode === "cohort" ? "Cohort" : "Department";
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle mb-0">
					<thead>
						<tr>
							<th>${label}</th>
							<th>Employees</th>
							<th>Avg Completion</th>
							<th>Completed</th>
							<th>Overdue</th>
						</tr>
					</thead>
					<tbody>
						${rows
							.map(
								(row) => `
									<tr>
										<td>${frappe.utils.escape_html(row.label)}</td>
										<td>${row.employee_count}</td>
										<td>${row.average_completion_pct}%</td>
										<td>${row.completed_onboarding}</td>
										<td>${row.employees_with_overdue_tasks}</td>
									</tr>
								`
							)
							.join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	render_probation_table(rows) {
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Department</th>
							<th>Joining Date</th>
							<th>Probation Due</th>
							<th>Supervisor Completion</th>
							<th>Employee Completion</th>
							<th>Appraisal Record</th>
						</tr>
					</thead>
					<tbody>
						${rows
							.map(
								(row) => `
									<tr>
										<td>
											<div class="fw-semibold">${frappe.utils.escape_html(row.employee_name)}</div>
											<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(row.employee)}</div>
										</td>
										<td>${frappe.utils.escape_html(row.department || "")}</td>
										<td>${frappe.utils.escape_html(row.date_of_joining || "-")}</td>
										<td>${this.status_badge(row.probation_due ? "Due" : "Not Due", {
											Due: "warning",
											"Not Due": "secondary",
										})}</td>
										<td>${this.status_badge(row.supervisor_completion ? "Complete" : (row.probation_due ? "Pending" : "Not Due"), {
											Complete: "success",
											Pending: "danger",
											"Not Due": "secondary",
										})}</td>
										<td>${this.status_badge(row.employee_completion ? "Complete" : (row.probation_due ? "Pending" : "Not Due"), {
											Complete: "success",
											Pending: "danger",
											"Not Due": "secondary",
										})}</td>
										<td>${row.probation_document ? frappe.utils.escape_html(row.probation_document) : "-"}</td>
									</tr>
								`
							)
							.join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	status_badge(label, colors) {
		const color = colors[label] || "secondary";
		return `<span class="badge bg-${color}">${frappe.utils.escape_html(label)}</span>`;
	},

	get_content() {
		return $("#onboarding-reports-content");
	},
};
