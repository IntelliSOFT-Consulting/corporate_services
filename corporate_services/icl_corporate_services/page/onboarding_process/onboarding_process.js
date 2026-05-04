frappe.pages["onboarding-process"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Employee Onboarding",
		single_column: true,
	});

	EmployeeOnboarding.init(page);
};

const EmployeeOnboarding = {
	page: null,

	init(page) {
		this.page = page;
		this.page.set_primary_action("Refresh", () => this.load());

		$(this.page.body).html(`
			<div id="emp-onboarding-root" class="container-fluid py-3 px-4">
				<div id="emp-onboarding-content"></div>
			</div>
		`);

		this.load();
	},

	load() {
		this.content().html(`
			<div class="text-center text-muted py-5">
				<div class="spinner-border spinner-border-sm me-2" role="status"></div>
				Loading...
			</div>
		`);

		frappe.call({
			method: "corporate_services.icl_corporate_services.page.onboarding_process.onboarding_process.get_page_data",
			callback: (r) => this.render(r.message || {}),
		});
	},

	render(data) {
		const new_employees = data.new_employees || [];
		const surveys = data.surveys || [];
		const schedules = data.onboarding_schedules || [];
		const internships = data.internship_commencements || [];

		this.content().html(`
			<div class="d-flex justify-content-between align-items-center mb-4">
				<div>
					<h5 class="mb-1">Employee Onboarding Process</h5>
					<div class="text-muted" style="font-size:13px;">Overview of new hires, feedback surveys, onboarding schedules, and internship commencements.</div>
				</div>
				<a href="/app/onboarding-reports" class="btn btn-outline-primary btn-sm">
					View Full Onboarding Reports
				</a>
			</div>

			<div class="row g-3 mb-4">
				${this.metric("New Employees (3 months)", new_employees.length)}
				${this.metric("Onboarding Schedules", schedules.length)}
				${this.metric("Surveys Submitted", surveys.length)}
				${this.metric("Internship Commencements", internships.length)}
			</div>

			<div class="card border mb-4">
				<div class="card-body">
					<div class="fw-semibold mb-1">New Employees - Last 3 Months</div>
					<div class="text-muted mb-3" style="font-size:12px;">Employees who joined in the past 3 months.</div>
					${this.employees_table(new_employees)}
				</div>
			</div>

			<div class="card border mb-4">
				<div class="card-body">
					<div class="fw-semibold mb-1">New Hire Feedback Survey - 30 Day</div>
					<div class="text-muted mb-3" style="font-size:12px;">Submitted 30-day feedback survey records.</div>
					${this.surveys_table(surveys)}
				</div>
			</div>

			<div class="card border mb-4">
				<div class="card-body">
					<div class="fw-semibold mb-1">Onboarding Schedules</div>
					<div class="text-muted mb-3" style="font-size:12px;">Onboarding schedule progress for new hires.</div>
					${this.schedules_table(schedules)}
				</div>
			</div>

			<div class="card border mb-4">
				<div class="card-body">
					<div class="fw-semibold mb-1">Internship Commencement</div>
					<div class="text-muted mb-3" style="font-size:12px;">Interns and their commencement form status.</div>
					${this.internship_table(internships)}
				</div>
			</div>
		`);
	},

	metric(label, value) {
		return `
			<div class="col-md-3">
				<div class="card border text-center p-3">
					<div class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;">${frappe.utils.escape_html(label)}</div>
					<div class="fw-semibold mt-2" style="font-size:28px;">${frappe.utils.escape_html(String(value))}</div>
				</div>
			</div>
		`;
	},

	employees_table(rows) {
		if (!rows.length) return `<div class="text-muted">No new employees in the last 3 months.</div>`;
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Department</th>
							<th>Designation</th>
							<th>Joining Date</th>
							<th>Status</th>
							<th>Onboarding Schedule</th>
						</tr>
					</thead>
					<tbody>
						${rows.map((r) => `
							<tr>
								<td>
									<a href="/app/employee/${encodeURIComponent(r.employee)}" target="_blank">
										${frappe.utils.escape_html(r.employee_name)}
									</a>
									<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(r.employee)}</div>
								</td>
								<td>${frappe.utils.escape_html(r.department)}</td>
								<td>${frappe.utils.escape_html(r.designation)}</td>
								<td>${frappe.utils.escape_html(r.date_of_joining)}</td>
								<td><span class="badge bg-${r.status === "Active" ? "success" : "secondary"}">${frappe.utils.escape_html(r.status)}</span></td>
								<td>
									${r.onboarding_schedule
										? `<a href="/app/onboarding-schedule/${encodeURIComponent(r.onboarding_schedule)}" target="_blank">${frappe.utils.escape_html(r.onboarding_schedule)}</a>`
										: `<span class="text-muted">None</span>`}
								</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	surveys_table(rows) {
		if (!rows.length) return `<div class="text-muted">No survey submissions found.</div>`;
		const status_colors = { Completed: "success", Draft: "secondary", Submitted: "success" };
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Joining Date</th>
							<th>Status</th>
							<th>Survey Record</th>
						</tr>
					</thead>
					<tbody>
						${rows.map((r) => `
							<tr>
								<td>
									<div class="fw-semibold">${frappe.utils.escape_html(r.employee_name)}</div>
									<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(r.employee)}</div>
								</td>
								<td>${frappe.utils.escape_html(r.date_of_joining || "-")}</td>
								<td><span class="badge bg-${status_colors[r.status] || "secondary"}">${frappe.utils.escape_html(r.status || "-")}</span></td>
								<td>
									<a href="/app/new-hire-feedback-survey-30-day/${encodeURIComponent(r.name)}" target="_blank">
										${frappe.utils.escape_html(r.name)}
									</a>
								</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	schedules_table(rows) {
		if (!rows.length) return `<div class="text-muted">No onboarding schedules found.</div>`;
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Department</th>
							<th>Joining Date</th>
							<th>Survey Sent</th>
							<th>Probation Review</th>
							<th>Schedule</th>
						</tr>
					</thead>
					<tbody>
						${rows.map((r) => `
							<tr>
								<td>
									<div class="fw-semibold">${frappe.utils.escape_html(r.employee_name)}</div>
									<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(r.employee)}</div>
								</td>
								<td>${frappe.utils.escape_html(r.department)}</td>
								<td>${frappe.utils.escape_html(r.date_of_joining || "-")}</td>
								<td><span class="badge bg-${r.survey_sent ? "success" : "secondary"}">${r.survey_sent ? "Yes" : "No"}</span></td>
								<td><span class="badge bg-${r.probation_review ? "success" : "secondary"}">${r.probation_review ? "Done" : "Pending"}</span></td>
								<td>
									<a href="/app/onboarding-schedule/${encodeURIComponent(r.name)}" target="_blank">
										${frappe.utils.escape_html(r.name)}
									</a>
								</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	internship_table(rows) {
		if (!rows.length) return `<div class="text-muted">No internship commencements found.</div>`;
		return `
			<div class="table-responsive">
				<table class="table table-bordered table-sm align-middle">
					<thead>
						<tr>
							<th>Employee</th>
							<th>Department</th>
							<th>Joining Date</th>
							<th>Commencement Date</th>
							<th>Form Sent</th>
							<th>Schedule</th>
						</tr>
					</thead>
					<tbody>
						${rows.map((r) => `
							<tr>
								<td>
									<div class="fw-semibold">${frappe.utils.escape_html(r.employee_name)}</div>
									<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(r.employee)}</div>
								</td>
								<td>${frappe.utils.escape_html(r.department)}</td>
								<td>${frappe.utils.escape_html(r.date_of_joining || "-")}</td>
								<td>${frappe.utils.escape_html(r.internship_commencement ? String(r.internship_commencement) : "-")}</td>
								<td><span class="badge bg-${r.form_sent ? "success" : "warning"}">${r.form_sent ? "Sent" : "Pending"}</span></td>
								<td>
									<a href="/app/onboarding-schedule/${encodeURIComponent(r.onboarding_schedule)}" target="_blank">
										${frappe.utils.escape_html(r.onboarding_schedule)}
									</a>
								</td>
							</tr>
						`).join("")}
					</tbody>
				</table>
			</div>
		`;
	},

	content() {
		return $("#emp-onboarding-content");
	},
};
