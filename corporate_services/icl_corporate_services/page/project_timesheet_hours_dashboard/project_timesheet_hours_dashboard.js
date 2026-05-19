frappe.pages["project-timesheet-hours-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Project Timesheet Hours Dashboard",
		single_column: true,
	});

	const app = new ProjectTimesheetHoursDashboard(page);
	app.init();
	wrapper.__projectTimesheetHoursDashboard = app;
};

frappe.pages["project-timesheet-hours-dashboard"].on_page_show = function (wrapper) {
	if (wrapper.__projectTimesheetHoursDashboard) {
		wrapper.__projectTimesheetHoursDashboard.loadFromRoute();
	}
};

class ProjectTimesheetHoursDashboard {
	constructor(page) {
		this.page = page;
		this.selectedProject = "";
		this.projectNameMap = {};
		this.charts = {
			monthly: null,
			projects: null,
			employees: null,
		};
	}

	init() {
		this.page.set_primary_action("Refresh", () => this.loadData());
		$(this.page.body).html(`
			<div class="container-fluid p-3">
				<div class="card border mb-3">
					<div class="card-body">
						<div class="row g-2 align-items-end">
							<div class="col-md-5">
								<label class="form-label mb-1">Project</label>
								<select id="pthd-project" class="form-select form-select-sm">
									<option value="">All Projects</option>
								</select>
							</div>
							<div class="col-md-3">
								<label class="form-label mb-1">Month</label>
								<select id="pthd-month" class="form-select form-select-sm">
									<option value="">All Months</option>
								</select>
							</div>
							<div class="col-md-2">
								<button id="pthd-apply" class="btn btn-primary w-100">Apply</button>
							</div>
							<div class="col-md-2">
								<div class="form-check mt-4">
									<input class="form-check-input" type="checkbox" id="pthd-finance-approved-only">
									<label class="form-check-label" for="pthd-finance-approved-only">
										Finance Approved only
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div id="pthd-root" class="text-muted">Loading project hours dashboard...</div>
			</div>
		`);
		$("#pthd-finance-approved-only").prop("checked", false);

		this.bindEvents();
		this.loadProjectOptions(() => this.loadFromRoute());
	}

	bindEvents() {
		$(this.page.body).off("click", "#pthd-apply");
		$(this.page.body).on("click", "#pthd-apply", () => this.loadData());

		$(this.page.body).off("change", "#pthd-month");
		$(this.page.body).on("change", "#pthd-month", () => this.loadData());
		$(this.page.body).off("change", "#pthd-finance-approved-only");
		$(this.page.body).on("change", "#pthd-finance-approved-only", () => this.loadData());

		$(this.page.body).off("change", "#pthd-project");
		$(this.page.body).on("change", "#pthd-project", () => {
			this.selectedProject = $("#pthd-project").val() || "";
		});
	}

	loadProjectOptions(onDone) {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_options",
			callback: (r) => {
				const rows = r.message || [];
				this.projectNameMap = {};
				const options = [
					'<option value="">All Projects</option>',
					...rows.map((row) => {
						this.projectNameMap[row.name] = row.project_name || row.name;
						const label = row.project_name ? `${row.project_name} (${row.name})` : row.name;
						return `<option value="${frappe.utils.escape_html(row.name)}">${frappe.utils.escape_html(label)}</option>`;
					}),
				].join("");
				$("#pthd-project").html(options);
				onDone && onDone();
			},
			error: () => {
				$("#pthd-project").html('<option value="">All Projects</option>');
				onDone && onDone();
			},
		});
	}

	loadFromRoute() {
		const route = frappe.get_route();
		const projectFromRoute = route[1] || "";
		// Force default mode on first load: all non-draft.
		$("#pthd-finance-approved-only").prop("checked", false);
		if (projectFromRoute) {
			this.selectedProject = projectFromRoute;
			$("#pthd-project").val(projectFromRoute);
		}
		this.loadData();
	}

	loadData() {
		const project = $("#pthd-project").val() || this.selectedProject || "";
		const selectedMonth = $("#pthd-month").val() || "";
		const financeApprovedOnly = $("#pthd-finance-approved-only").is(":checked") ? 1 : 0;
		this.selectedProject = project;

		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_timesheet_monthly_hours",
			args: {
				project_name: project || null,
				month: selectedMonth || null,
				finance_approved_only: financeApprovedOnly,
			},
			freeze: true,
			freeze_message: "Loading project hours...",
			callback: (r) => this.render(r.message || {}, project),
			error: () => {
				$("#pthd-root").html(
					'<div class="alert alert-warning">Could not load project timesheet hours.</div>',
				);
			},
		});
	}

	render(data, project) {
		const financeApprovedOnly = $("#pthd-finance-approved-only").is(":checked");
		const availableMonths = data.available_months || [];
		const activeMonth = data.month || "";
		const projectLabel = project ? (this.projectNameMap[project] || project) : "All Projects";
		const periodLabel = activeMonth ? this.formatMonthLabel(activeMonth) : "All Months";
		const monthOptions = [
			`<option value="" ${activeMonth ? "" : "selected"}>All Months</option>`,
			...availableMonths.map(
				(m) =>
					`<option value="${frappe.utils.escape_html(m)}" ${m === activeMonth ? "selected" : ""}>${frappe.utils.escape_html(m)}</option>`,
			),
		].join("");
		$("#pthd-month").html(monthOptions);

		const totalHours = this.formatHours(data.total_hours || 0);
		const timesheetCount = data.timesheet_count || 0;
		const dailyRows = data.daily_hours || [];
		const employeeRows = data.employee_hours || [];
		const monthlyRows = data.monthly_hours || [];
		const projectRows = data.project_hours || [];

		$("#pthd-root").html(`
			<div class="alert alert-info mb-3">
				<strong>Project:</strong> ${frappe.utils.escape_html(projectLabel)}
				<span class="ms-3"><strong>Period:</strong> ${frappe.utils.escape_html(periodLabel)}</span>
				<span class="ms-3"><strong>Mode:</strong> ${financeApprovedOnly ? "Finance Approved only" : "All non-draft"}</span>
			</div>
			<div class="row g-2 mb-3">
				${this.metric("Total Hours Worked", totalHours)}
				${this.metric("Non-Draft Timesheets", String(timesheetCount))}
				${this.metric("Months with Data", String(monthlyRows.length))}
			</div>
			<div class="row g-3 mb-3">
				<div class="col-lg-6">
					<div class="card border h-100">
						<div class="card-body">
							<div class="fw-semibold mb-2">Monthly Hours Trend</div>
							<div id="pthd-monthly-chart"></div>
						</div>
					</div>
				</div>
				<div class="col-lg-6">
					<div class="card border h-100">
						<div class="card-body">
							<div class="fw-semibold mb-2">Top Projects by Hours</div>
							<div id="pthd-projects-chart"></div>
						</div>
					</div>
				</div>

				<div class="col-lg-12 mt-4">
					<div class="card border h-100">
						<div class="card-body">
							<div class="fw-semibold mb-2">Top Employees by Hours</div>
							<div id="pthd-employees-chart"></div>
						</div>
					</div>
				</div>
			</div>
			<div class="card border mb-3">
				<div class="card-body p-0">
					<div class="p-2 border-bottom"><strong>Project Totals</strong></div>
					${this.simpleTable(projectRows, ["project_display", "total_hours"], ["Project", "Hours"], true)}
				</div>
			</div>
			<div class="card border mb-3">
				<div class="card-body p-0">
					<div class="p-2 border-bottom"><strong>Monthly Totals</strong></div>
					${this.simpleTable(monthlyRows, ["month", "total_hours"], ["Month", "Hours"], true)}
				</div>
			</div>
			
		`);

		this.renderCharts(monthlyRows, projectRows, employeeRows);
	}

	renderCharts(monthlyRows, projectRows, employeeRows) {
		this.destroyCharts();

		const monthSeries = [...monthlyRows]
			.reverse()
			.map((row) => ({ label: row.month, value: Number(row.total_hours || 0) }));
		const topProjects = [...projectRows]
			.slice(0, 10)
			.map((row) => ({ label: row.project_display || row.project || "-", value: Number(row.total_hours || 0) }));
		const topEmployees = [...employeeRows]
			.slice(0, 10)
			.map((row) => ({ label: row.employee_name || row.employee || "-", value: Number(row.total_hours || 0) }));

		if (monthSeries.length && document.getElementById("pthd-monthly-chart")) {
			this.charts.monthly = new frappe.Chart("#pthd-monthly-chart", {
				data: {
					labels: monthSeries.map((x) => x.label),
					datasets: [{ name: "Hours", values: monthSeries.map((x) => x.value) }],
				},
				type: "line",
				height: 260,
				colors: ["#0d6efd"],
			});
		} else {
			$("#pthd-monthly-chart").html('<div class="text-muted">No monthly data for chart.</div>');
		}

		if (topProjects.length && document.getElementById("pthd-projects-chart")) {
			this.charts.projects = new frappe.Chart("#pthd-projects-chart", {
				data: {
					labels: topProjects.map((x) => x.label),
					datasets: [{ name: "Hours", values: topProjects.map((x) => x.value) }],
				},
				type: "bar",
				height: 260,
				barOptions: { stacked: false },
				colors: ["#198754"],
			});
		} else {
			$("#pthd-projects-chart").html('<div class="text-muted">No project data for chart.</div>');
		}

		if (topEmployees.length && document.getElementById("pthd-employees-chart")) {
			this.charts.employees = new frappe.Chart("#pthd-employees-chart", {
				data: {
					labels: topEmployees.map((x) => x.label),
					datasets: [{ name: "Hours", values: topEmployees.map((x) => x.value) }],
				},
				type: "bar",
				height: 280,
				barOptions: { stacked: false },
				colors: ["#fd7e14"],
			});
		} else {
			$("#pthd-employees-chart").html('<div class="text-muted">No employee data for chart.</div>');
		}
	}

	destroyCharts() {
		Object.keys(this.charts).forEach((key) => {
			const chart = this.charts[key];
			if (chart && typeof chart.destroy === "function") {
				chart.destroy();
			}
			this.charts[key] = null;
		});
	}

	metric(label, value) {
		return `<div class="col-md-4"><div class="card border h-100"><div class="card-body"><div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(label)}</div><div style="font-size:24px;font-weight:600;">${frappe.utils.escape_html(String(value))}</div></div></div></div>`;
	}

	simpleTable(rows, fields, labels, rightAlignSecondCol = false) {
		if (!rows.length) {
			return '<div class="p-3 text-muted">No data found.</div>';
		}

		const header = `<tr><th>${frappe.utils.escape_html(labels[0])}</th><th class="${rightAlignSecondCol ? "text-end" : ""}">${frappe.utils.escape_html(labels[1])}</th></tr>`;
		const body = rows
			.map((row) => {
				const first = row[fields[0]] || "-";
				const second =
					fields[1] === "total_hours" ? this.formatHours(row[fields[1]] || 0) : row[fields[1]] || "-";
				return `<tr><td>${frappe.utils.escape_html(String(first))}</td><td class="${rightAlignSecondCol ? "text-end" : ""}">${frappe.utils.escape_html(String(second))}</td></tr>`;
			})
			.join("");

		return `
			<div class="table-responsive">
				<table class="table table-sm table-bordered mb-0 align-middle">
					<thead>${header}</thead>
					<tbody>${body}</tbody>
				</table>
			</div>
		`;
	}

	formatHours(value) {
		const num = Number(value || 0);
		return Number.isFinite(num) ? num.toFixed(2) : "0.00";
	}

	formatMonthLabel(value) {
		const m = /^(\d{4})-(\d{2})$/.exec(value || "");
		if (!m) return value || "";
		const months = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December",
		];
		const monthIndex = Number(m[2]) - 1;
		if (monthIndex < 0 || monthIndex > 11) return value;
		return `${months[monthIndex]} ${m[1]}`;
	}
}
