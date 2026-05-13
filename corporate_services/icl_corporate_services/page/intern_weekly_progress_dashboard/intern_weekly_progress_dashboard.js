frappe.pages["intern-weekly-progress-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Intern Weekly Progress Dashboard",
		single_column: true,
	});

	const app = new InternWeeklyProgressDashboard(page);
	app.init();
};

class InternWeeklyProgressDashboard {
	constructor(page) {
		this.page = page;
		this.contractType = null;
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
							<div class="col-md-4">
								<label class="form-label mb-1">Contract Type Filter</label>
								<input id="weekly-progress-contract-type" class="form-control" placeholder="Uses HR Config default if blank" />
							</div>
							<div class="col-md-2">
								<button id="weekly-progress-apply-filter" class="btn btn-primary w-100">Apply</button>
							</div>
						</div>
					</div>
				</div>
				<div id="weekly-progress-dashboard-root" class="text-muted">Loading dashboard...</div>
			</div>
		`);

		$(this.page.body).on("click", "#weekly-progress-apply-filter", () => {
			this.contractType = $("#weekly-progress-contract-type").val() || null;
			this.load();
		});

		this.load();
	}

	load() {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.intern_weekly_progress_dashboard.intern_weekly_progress_dashboard.get_dashboard_data",
			args: { contract_type: this.contractType },
			callback: (r) => this.render(r.message || {}),
			error: () => {
				$("#weekly-progress-dashboard-root").html(
					'<div class="alert alert-warning">Could not load weekly progress dashboard.</div>',
				);
			},
		});
	}

	render(data) {
		this.lastData = data;
		const summary = data.summary || {};
		const submittedRows = data.submitted_rows || [];
		const missingRows = data.missing_rows || [];
		const weekStart = data.week_start || "";
		const weekEnd = data.week_end || "";
		const contractType = data.contract_type || "All Active Intern Contracts";

		$("#weekly-progress-contract-type").val(this.contractType || data.contract_type || "");

		$("#weekly-progress-dashboard-root").html(`
			<div class="alert alert-info mb-3">
				<strong>Week Window:</strong> ${frappe.utils.escape_html(weekStart)} to ${frappe.utils.escape_html(weekEnd)}<br>
				<strong>Contract Type:</strong> ${frappe.utils.escape_html(contractType)}
			</div>
			<div class="row g-3 mb-3">
				${this.metric("Active Interns", summary.total_active_interns || 0)}
				${this.metric("Submitted This Week", summary.submitted_count || 0)}
				${this.metric("Missing This Week", summary.missing_count || 0)}
			</div>
			<div class="card border mb-3">
				<div class="card-body">
					<h6 class="mb-3">Missing Weekly Reports</h6>
					${this.table(missingRows, true, "missing")}
				</div>
			</div>
			<div class="card border">
				<div class="card-body">
					<h6 class="mb-3">Submitted Weekly Reports</h6>
					${this.table(submittedRows, false, "submitted")}
				</div>
			</div>
		`);

		$("#weekly-progress-dashboard-root").off("click", "a[data-report]");
		$("#weekly-progress-dashboard-root").on("click", "a[data-report]", function (e) {
			e.preventDefault();
			frappe.set_route("Form", "Weekly Progress Report", this.getAttribute("data-report"));
		});

		$("#weekly-progress-dashboard-root").off("click", "button[data-table-nav]");
		$("#weekly-progress-dashboard-root").on("click", "button[data-table-nav]", (e) => {
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
							<th>Supervisor</th>
							<th>Contract Type</th>
							${isMissing ? "" : "<th>Report</th><th>Submitted On</th>"}
						</tr>
					</thead>
					<tbody>
						${pageRows
							.map(
								(row) => `
							<tr>
								<td>${frappe.utils.escape_html(row.employee_name || row.employee || "")}</td>
								<td>${frappe.utils.escape_html(row.department || "")}</td>
								<td>${frappe.utils.escape_html(row.supervisor || "")}</td>
								<td>${frappe.utils.escape_html(row.contract_type || "")}</td>
								${
									isMissing
										? ""
										: `<td><a href="#" data-report="${frappe.utils.escape_html(row.report_name || "")}">${frappe.utils.escape_html(row.report_name || "")}</a></td>
										   <td>${frappe.utils.escape_html(row.submitted_on || "")}</td>`
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
