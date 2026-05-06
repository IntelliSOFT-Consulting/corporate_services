frappe.pages["travel-reconciliation-dashboard"].on_page_load = function (
	wrapper,
) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Travel Reconciliation Dashboard",
		single_column: true,
	});

	const app = new TravelReconciliationDashboard(page);
	app.init();
};

class TravelReconciliationDashboard {
	constructor(page) {
		this.page = page;
	}

	init() {
		this.page.set_primary_action("Refresh", () => this.load());
		$(this.page.body).html(this.layout());
		this.load();
	}

	layout() {
		return `
			<div class="container-fluid p-3" id="trd-root">
				<div id="trd-content" class="text-muted">Loading dashboard...</div>
			</div>
		`;
	}

	load() {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.travel_reconciliation_dashboard.travel_reconciliation_dashboard.get_dashboard_data",
			callback: (r) => this.render(r.message || {}),
		});
	}

	render(data) {
		const summary = data.summary || {};
		const unreconciled = data.unreconciled_rows || [];
		const statusBreakdown = data.status_breakdown || [];
		const monthly = data.monthly_trend || [];
		const totalBalanceText = format_currency(summary.total_balance || 0);

		$("#trd-content").html(`
			<div class="row g-3 mb-3">
				${this.metric("Total Requests", summary.total_requests || 0)}
				${this.metric("Reconciled", summary.reconciled || 0)}
				${this.metric("Pending", summary.pending || 0)}
				${this.metric("Total Balance", totalBalanceText)}
			</div>
			<div class="row g-3 mb-3">
				<div class="col-lg-6">
					<div class="card border">
						<div class="card-body">
							<h6>Status Breakdown</h6>
							<div id="trd-status-chart">
							</div>
						</div>
					</div>
				</div>
				<div class="col-lg-6">
				<div class="card border"><div class="card-body"><h6>Monthly Trend (Last 12)</h6><div id="trd-monthly-chart"></div></div></div></div>
			</div>
			<div class="card border">
				<div class="card-body">
					<h6>Unreconciled Travel Requests</h6>
					<div class="table-responsive">
						<table class="table table-sm table-bordered align-middle">
							<thead>
								<tr>
									<th>Travel Request</th><th>Employee</th><th>Project</th><th>Travel Date</th><th>Requested</th><th>Currency</th><th>Status</th>
								</tr>
							</thead>
							<tbody>
								${unreconciled
				.map(
					(row) => `
									<tr>
										<td><a href="#" data-doc="${frappe.utils.escape_html(row.name)}">${frappe.utils.escape_html(row.name)}</a></td>
										<td>${frappe.utils.escape_html(row.employee_name || row.employee || "")}</td>
										<td>${frappe.utils.escape_html(row.custom_project || "")}</td>
										<td>${frappe.utils.escape_html(row.custom_travel_date || "")}</td>
										<td>${frappe.utils.escape_html(String(row.custom_expected_support || 0))}</td>
										<td>${frappe.utils.escape_html(row.custom_currency || "")}</td>
										<td>${frappe.utils.escape_html(row.reconciliation_status || "")}</td>
									</tr>
								`,
				)
				.join("") ||
			'<tr><td colspan="7" class="text-center text-muted">No pending records.</td></tr>'
			}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		`);

		$("#trd-content").on("click", "a[data-doc]", function (e) {
			e.preventDefault();
			frappe.set_route("Form", "Travel Request", this.getAttribute("data-doc"));
		});

		this.renderStatusChart(statusBreakdown);
		this.renderMonthlyChart(monthly);
	}

	metric(label, value) {
		return `<div class="col-md-3"><div class="card border h-100"><div class="card-body"><div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(label)}</div><div style="font-size:28px;font-weight:600;">${frappe.utils.escape_html(String(value))}</div></div></div></div>`;
	}

	renderStatusChart(rows) {
		const labels = rows.map((r) => r.status);
		const values = rows.map((r) => r.count);
		if (!labels.length) return;

		new frappe.Chart("#trd-status-chart", {
			data: { labels, datasets: [{ values }] },
			type: "donut",
			height: 260,
		});
	}

	renderMonthlyChart(rows) {
		const labels = rows.map((r) => r.month);
		const reconciled = rows.map((r) => r.reconciled);
		const pending = rows.map((r) => r.pending);
		if (!labels.length) return;

		new frappe.Chart("#trd-monthly-chart", {
			data: {
				labels,
				datasets: [
					{ name: "Reconciled", values: reconciled },
					{ name: "Pending", values: pending },
				],
			},
			type: "bar",
			height: 260,
		});
	}
}
