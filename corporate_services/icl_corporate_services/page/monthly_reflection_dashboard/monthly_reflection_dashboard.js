frappe.pages["monthly-reflection-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Monthly Reflection Dashboard",
		single_column: true,
	});

	const app = new MonthlyReflectionDashboard(page);
	app.init();
};

class MonthlyReflectionDashboard {
	constructor(page) {
		this.page = page;
		this.year = new Date().getFullYear();
		this.reviewPeriod = null;
		this.lastData = null;
		this.pageSize = 10;
		this.tablePages = {
			missing: 1,
			submitted: 1,
		};
	}

	init() {
		this.page.set_primary_action("Refresh", () => this.load());
		this.page.add_menu_item("Open HR Config", () => frappe.set_route("Form", "HR Config", "HR Config"));
		$(this.page.body).html(`
			<div class="container-fluid p-3">
				<div class="card border mb-3">
					<div class="card-body">
						<div class="row g-2 align-items-end">
							<div class="col-md-3">
								<label class="form-label mb-1">Year</label>
								<select id="monthly-reflection-year" class="form-control"></select>
							</div>
							<div class="col-md-5">
								<label class="form-label mb-1">Review Period</label>
								<select id="monthly-reflection-period" class="form-control"></select>
							</div>
							<div class="col-md-2">
								<button id="monthly-reflection-apply-filter" class="btn btn-primary w-100">Apply</button>
							</div>
						</div>
					</div>
				</div>
				<div id="monthly-reflection-dashboard-root" class="text-muted">Loading dashboard...</div>
			</div>
		`);

		this.renderYearOptions();
		this.bindEvents();
		this.loadPeriodOptions(() => this.load());
	}

	bindEvents() {
		$(this.page.body).on("change", "#monthly-reflection-year", () => {
			this.year = Number($("#monthly-reflection-year").val()) || new Date().getFullYear();
			this.loadPeriodOptions();
		});

		$(this.page.body).on("click", "#monthly-reflection-apply-filter", () => {
			this.reviewPeriod = $("#monthly-reflection-period").val() || null;
			this.load();
		});
	}

	renderYearOptions() {
		const currentYear = new Date().getFullYear();
		const years = [currentYear - 1, currentYear, currentYear + 1];
		const options = years
			.map((year) => `<option value="${year}" ${year === this.year ? "selected" : ""}>${year}</option>`)
			.join("");
		$("#monthly-reflection-year").html(options);
	}

	loadPeriodOptions(onDone) {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.monthly_reflection_dashboard.monthly_reflection_dashboard.get_review_period_options",
			args: { year: this.year },
			callback: (r) => {
				const periods = r.message || [];
				const current = `${new Date().toLocaleString("en-US", { month: "long" })} ${this.year}`;
				if (!this.reviewPeriod || !periods.includes(this.reviewPeriod)) {
					this.reviewPeriod = periods.includes(current) ? current : periods[0] || null;
				}
				const options = periods
					.map(
						(period) =>
							`<option value="${frappe.utils.escape_html(period)}" ${period === this.reviewPeriod ? "selected" : ""}>${frappe.utils.escape_html(period)}</option>`,
					)
					.join("");
				$("#monthly-reflection-period").html(options);
				onDone && onDone();
			},
		});
	}

	load() {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.monthly_reflection_dashboard.monthly_reflection_dashboard.get_dashboard_data",
			args: { review_period: this.reviewPeriod },
			callback: (r) => this.render(r.message || {}),
			error: () => {
				$("#monthly-reflection-dashboard-root").html(
					'<div class="alert alert-warning">Could not load monthly reflection dashboard.</div>',
				);
			},
		});
	}

	render(data) {
		this.lastData = data;
		const summary = data.summary || {};
		const submittedRows = data.submitted_rows || [];
		const missingRows = data.missing_rows || [];
		const reviewPeriod = data.review_period || this.reviewPeriod || "";

		$("#monthly-reflection-dashboard-root").html(`
			<div class="alert alert-info mb-3">
				<strong>Review Period:</strong> ${frappe.utils.escape_html(reviewPeriod)}
			</div>
			<div class="row g-3 mb-3">
				${this.metric("Active Staff", summary.total_active_staff || 0)}
				${this.metric("Submitted", summary.submitted_count || 0)}
				${this.metric("Missing", summary.missing_count || 0)}
			</div>
			<div class="card border mb-3">
				<div class="card-body">
					<h6 class="mb-3">Missing Monthly Reflections</h6>
					${this.table(missingRows, true, "missing")}
				</div>
			</div>
			<div class="card border">
				<div class="card-body">
					<h6 class="mb-3">Submitted Monthly Reflections</h6>
					${this.table(submittedRows, false, "submitted")}
				</div>
			</div>
		`);

		$("#monthly-reflection-dashboard-root").off("click", "a[data-reflection]");
		$("#monthly-reflection-dashboard-root").on("click", "a[data-reflection]", function (e) {
			e.preventDefault();
			frappe.set_route("Form", "Monthly Reflection", this.getAttribute("data-reflection"));
		});

		$("#monthly-reflection-dashboard-root").off("click", "button[data-table-nav]");
		$("#monthly-reflection-dashboard-root").on("click", "button[data-table-nav]", (e) => {
			const button = e.currentTarget;
			const tableKey = button.getAttribute("data-table");
			const direction = button.getAttribute("data-table-nav");

			if (!tableKey || !direction) return;
			const rows = (this.lastData && this.lastData[`${tableKey}_rows`]) || [];
			const totalPages = Math.max(1, Math.ceil(rows.length / this.pageSize));
			const currentPage = this.tablePages[tableKey] || 1;
			const delta = direction === "prev" ? -1 : 1;
			this.tablePages[tableKey] = Math.min(totalPages, Math.max(1, currentPage + delta));
			this.render(this.lastData || {});
		});

		$("#monthly-reflection-dashboard-root").off("click", "button[data-notify-employee]");
		$("#monthly-reflection-dashboard-root").on("click", "button[data-notify-employee]", (e) => {
			const button = e.currentTarget;
			const employee = button.getAttribute("data-notify-employee");
			const reviewPeriod = button.getAttribute("data-review-period");
			if (!employee || !reviewPeriod) return;

			frappe.call({
				method:
					"corporate_services.api.notification.monthly_reflection.monthly_reflection.send_manual_monthly_reflection_dual_reminder",
				args: {
					employee,
					review_period: reviewPeriod,
				},
				freeze: true,
				freeze_message: "Sending reminder...",
				callback: (r) => {
					const msg = (r.message && r.message.message) || "Reminder sent.";
					frappe.show_alert({ message: msg, indicator: "green" });
				},
				error: () => {
					frappe.show_alert({
						message: "Failed to send reminder.",
						indicator: "red",
					});
				},
			});
		});
	}

	metric(label, value) {
		return `<div class="col-md-4"><div class="card border h-100"><div class="card-body"><div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(label)}</div><div style="font-size:28px;font-weight:600;">${frappe.utils.escape_html(String(value))}</div></div></div></div>`;
	}

	table(rows, isMissing, tableKey) {
		if (!rows.length) {
			this.tablePages[tableKey] = 1;
			return '<div class="text-muted">No records found.</div>';
		}

		const totalRows = rows.length;
		const totalPages = Math.max(1, Math.ceil(totalRows / this.pageSize));
		const currentPage = Math.min(this.tablePages[tableKey] || 1, totalPages);
		this.tablePages[tableKey] = currentPage;
		const startIndex = (currentPage - 1) * this.pageSize;
		const endIndex = Math.min(startIndex + this.pageSize, totalRows);
		const pageRows = rows.slice(startIndex, endIndex);

		return `
			<div class="table-responsive">
				<table class="table table-sm table-bordered align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Department</th>
							<th>Job Title</th>
							<th>Supervisor</th>
							${isMissing ? "<th>Action</th>" : "<th>Reflection</th><th>Submitted On</th><th>Workflow State</th>"}
						</tr>
					</thead>
					<tbody>
						${pageRows
							.map(
								(row) => `
							<tr>
								<td>${frappe.utils.escape_html(row.employee_name || row.employee || "")}</td>
								<td>${frappe.utils.escape_html(row.department || "")}</td>
								<td>${frappe.utils.escape_html(row.designation || "")}</td>
								<td>${frappe.utils.escape_html(row.supervisor || "")}</td>
								${
									isMissing
										? `<td>
											<button
												type="button"
												class="btn btn-sm btn-primary"
												data-notify-employee="${frappe.utils.escape_html(row.employee || "")}"
												data-review-period="${frappe.utils.escape_html(row.review_period || "")}"
											>
												Notify
											</button>
										</td>`
										: `<td><a href="#" data-reflection="${frappe.utils.escape_html(row.reflection_name || "")}">${frappe.utils.escape_html(row.reflection_name || "")}</a></td>
										   <td>${frappe.utils.escape_html(row.submitted_on || "")}</td>
										   <td>${frappe.utils.escape_html(row.workflow_state || "")}</td>`
								}
							</tr>
						`,
							)
							.join("")}
					</tbody>
				</table>
			</div>
			<div class="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
				<div class="text-muted small">Showing ${startIndex + 1}-${endIndex} of ${totalRows}</div>
				<div class="d-flex align-items-center gap-2">
					<button type="button" class="btn btn-sm btn-light" data-table="${frappe.utils.escape_html(tableKey)}" data-table-nav="prev" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
					<span class="small text-muted">Page ${currentPage} of ${totalPages}</span>
					<button type="button" class="btn btn-sm btn-light" data-table="${frappe.utils.escape_html(tableKey)}" data-table-nav="next" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
				</div>
			</div>
		`;
	}
}
