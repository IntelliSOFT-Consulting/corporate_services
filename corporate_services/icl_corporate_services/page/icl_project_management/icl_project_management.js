frappe.pages["icl-project-management"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "ICL Project Management",
		single_column: true,
	});

	const app = new IclProjectManagementDashboard(page);
	app.init();
};

class IclProjectManagementDashboard {
	constructor(page) {
		this.page = page;
	}

	init() {
		this.page.set_primary_action("Create New Project", () => {
			frappe.new_doc("Project");
		});
		this.page.add_menu_item("HIS Project Lifecycle Guide", () => {
			frappe.set_route("health-information-system-project-lifecycle");
		});
		this.page.add_menu_item("Project Requirements Templates", () => {
			frappe.set_route("project-requirements-templates");
		});
		$(this.page.body).html(this.layout());
		this.load();
	}

	layout() {
		return `
			<div class="container-fluid p-3">
				<div id="icl-project-management-content" class="text-muted">Loading project dashboard...</div>
			</div>
		`;
	}

	load() {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_management.icl_project_management.get_dashboard_data",
			callback: (r) => this.render(r.message || {}),
		});
	}

	render(data) {
		const summary = data.summary || {};
		const statusBreakdown = data.status_breakdown || [];
		const projects = data.projects || [];

		$("#icl-project-management-content").html(`
			<div class="alert alert-info mb-3" role="alert">
				Welcome to the ICL Project Management dashboard.
			</div>
			<div class="card border mb-3">
				<div class="card-body">
					<h6 class="mb-2">HIS Project Quick Guide</h6>
					<p class="text-muted mb-2">
						For every new Health Information System (HIS) project, follow the lifecycle stages:
						<strong>Prepare</strong> -> <strong>Plan</strong> -> <strong>Design</strong> ->
						<strong>Development</strong> -> <strong>Implementation</strong> -> <strong>Maintenance</strong>.
					</p>
					<ul class="mb-2">
						<li>Start by creating the project record and project charter.</li>
						<li>Capture all required lifecycle deliverables as the project progresses.</li>
						<li>Track completion using the <strong>HIS PM Project LifeCycle</strong> checklist.</li>
					</ul>
					<a href="#" id="open-his-lifecycle-guide">Open HIS Lifecycle Guide</a>
				</div>
			</div>
			<div class="row g-3 mb-3">
				${this.metric("Total Projects", summary.total_projects || 0)}
				${this.metric("Active Projects", summary.active_projects || 0)}
				${this.metric("Completed Projects", summary.completed_projects || 0)}
				${this.metric("Avg Progress", `${Math.round(summary.average_progress || 0)}%`)}
			</div>
			<div class="card border mb-3">
				<div class="card-body">
					<h6 class="mb-3">Projects by Status</h6>
					<div id="icl-project-status-chart"></div>
				</div>
			</div>
			<div class="card border">
				<div class="card-body">
					<h6 class="mb-3">All Projects</h6>
					<div class="table-responsive">
						<table class="table table-sm table-bordered align-middle">
							<thead>
								<tr>
									<th>Project</th>
									<th>Name</th>
									<th>Status</th>
									<th>Progress</th>
									<th>Priority</th>
									<th>Start Date</th>
									<th>End Date</th>
								</tr>
							</thead>
							<tbody>
								${projects
									.map(
										(row) => `
									<tr>
										<td><a href="#" data-project="${frappe.utils.escape_html(row.name)}">${frappe.utils.escape_html(row.name)}</a></td>
										<td>${frappe.utils.escape_html(row.project_name || "")}</td>
										<td>${frappe.utils.escape_html(row.status || "")}</td>
										<td>${frappe.utils.escape_html(String(row.percent_complete || 0))}%</td>
										<td>${frappe.utils.escape_html(row.priority || "")}</td>
										<td>${frappe.utils.escape_html(row.expected_start_date || "")}</td>
										<td>${frappe.utils.escape_html(row.expected_end_date || "")}</td>
									</tr>
								`,
									)
									.join("") ||
								'<tr><td colspan="7" class="text-center text-muted">No projects found.</td></tr>'
							}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		`);

		$("#icl-project-management-content").on("click", "a[data-project]", function (e) {
			e.preventDefault();
			frappe.set_route("icl-project-detail", this.getAttribute("data-project"));
		});
		$("#icl-project-management-content").on("click", "#open-his-lifecycle-guide", function (e) {
			e.preventDefault();
			frappe.set_route("health-information-system-project-lifecycle");
		});

		this.renderStatusChart(statusBreakdown);
	}

	metric(label, value) {
		return `<div class="col-md-3"><div class="card border h-100"><div class="card-body"><div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(label)}</div><div style="font-size:28px;font-weight:600;">${frappe.utils.escape_html(String(value))}</div></div></div></div>`;
	}

	renderStatusChart(rows) {
		const labels = rows.map((row) => row.status);
		const values = rows.map((row) => row.count);
		if (!labels.length) {
			$("#icl-project-status-chart").html(
				'<div class="text-muted">No project status data found.</div>',
			);
			return;
		}

		new frappe.Chart("#icl-project-status-chart", {
			data: { labels, datasets: [{ values }] },
			type: "donut",
			height: 280,
		});
	}
}
