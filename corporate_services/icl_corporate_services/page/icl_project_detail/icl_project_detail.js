frappe.pages["icl-project-detail"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Project Detail",
		single_column: false,
	});

	const app = new IclProjectDetailPage(page);
	app.init();
	wrapper.__iclProjectDetailApp = app;
};

frappe.pages["icl-project-detail"].on_page_show = function (wrapper) {
	if (wrapper.__iclProjectDetailApp) {
		wrapper.__iclProjectDetailApp.loadFromRoute();
	}
};

class IclProjectDetailPage {
	constructor(page) {
		this.page = page;
	}

	init() {
		this.page.set_primary_action("Back to Dashboard", () =>
			frappe.set_route("icl-project-management"),
		);
		$(this.page.body).html('<div id="icl-project-detail-root" class="p-3 text-muted">Loading...</div>');
		$(this.page.sidebar).html('<div id="icl-project-template-sidebar" class="p-2 text-muted">Loading templates...</div>');
		this.loadFromRoute();
	}

	loadFromRoute() {
		const route = frappe.get_route();
		const projectName = route[1];
		if (!projectName) {
			this.renderError("No project selected. Open a project from ICL Project Management.");
			return;
		}

		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_details",
			args: { project_name: projectName },
			callback: (r) => this.render(r.message || {}),
			error: () => this.renderError(`Could not load project "${projectName}".`),
		});
	}

	render(project) {
		this.page.set_title(`Project Detail: ${project.name || ""}`);
		$("#icl-project-detail-root").html(`
			<div class="card border">
				<div class="card-body pb-0">
					<div class="d-flex justify-content-between align-items-center">
						<h5 class="mb-0">${frappe.utils.escape_html(project.project_name || project.name || "")}</h5>
						<a href="#" id="open-project-form">${frappe.utils.escape_html(project.name || "")}</a>
					</div>
					<ul class="nav nav-tabs mt-3" role="tablist">
						<li class="nav-item">
							<button class="nav-link active" data-project-tab="details" type="button" role="tab">Project Details</button>
						</li>
						<li class="nav-item">
							<button class="nav-link" data-project-tab="folder" type="button" role="tab">Project Folder</button>
						</li>
						<li class="nav-item">
							<button class="nav-link" data-project-tab="gdrive" type="button" role="tab">Google Drive</button>
						</li>
						<li class="nav-item">
							<button class="nav-link" data-project-tab="timesheet-hours" type="button" role="tab">Timesheet Hours</button>
						</li>
					</ul>
				</div>
				<div class="tab-content">
					<div class="tab-pane show active p-3" id="icl-project-details-pane" role="tabpanel">
						<div class="row g-3 mb-3">
							${this.field("Status", project.status)}
							${this.field("Priority", project.priority)}
							${this.field("Progress", `${project.percent_complete || 0}%`)}
							${this.field("Department", project.department)}
							${this.field("Project Type", project.project_type)}
							${this.field("Company", project.company)}
							${this.field("Customer", project.customer)}
							${this.field("Expected Start", project.expected_start_date)}
							${this.field("Expected End", project.expected_end_date)}
							${this.field("Created", project.creation)}
							${this.field("Last Modified", project.modified)}
						</div>
						<div class="card border mb-3">
							<div class="card-body">
								<h6 class="mb-2">Notes</h6>
								<div>${project.notes ? frappe.utils.escape_html(project.notes) : '<span class="text-muted">No notes available.</span>'}</div>
							</div>
						</div>
					</div>
					<div class="tab-pane p-3 d-none" id="icl-project-folder-pane" role="tabpanel">
						<div id="icl-project-folder-content" class="text-muted">Loading project folders...</div>
					</div>
					<div class="tab-pane p-3 d-none" id="icl-project-gdrive-pane" role="tabpanel">
						<div id="icl-project-gdrive-content" class="text-muted">Loading Google Drive folders...</div>
					</div>
					<div class="tab-pane p-3 d-none" id="icl-project-timesheet-hours-pane" role="tabpanel">
						<div id="icl-project-timesheet-hours-content" class="text-muted">Loading project timesheet hours...</div>
					</div>
				</div>
			</div>
		`);

		$("#icl-project-detail-root").off("click", "#open-project-form");
		$("#icl-project-detail-root").on("click", "#open-project-form", function (e) {
			e.preventDefault();
			frappe.set_route("Form", "Project", project.name);
		});
		$("#icl-project-detail-root").off("click", "[data-project-tab]");
		$("#icl-project-detail-root").on("click", "[data-project-tab]", function () {
			const tab = this.getAttribute("data-project-tab");
			$("#icl-project-detail-root [data-project-tab]").removeClass("active");
			$(this).addClass("active");

			const panes = [
				"#icl-project-details-pane",
				"#icl-project-folder-pane",
				"#icl-project-gdrive-pane",
				"#icl-project-timesheet-hours-pane",
			];
			panes.forEach((pane) => $(pane).addClass("d-none").removeClass("show active"));

			if (tab === "folder") {
				$("#icl-project-folder-pane").removeClass("d-none").addClass("show active");
			} else if (tab === "gdrive") {
				$("#icl-project-gdrive-pane").removeClass("d-none").addClass("show active");
			} else if (tab === "timesheet-hours") {
				$("#icl-project-timesheet-hours-pane").removeClass("d-none").addClass("show active");
			} else {
				$("#icl-project-details-pane").removeClass("d-none").addClass("show active");
			}
		});
		$("#icl-project-detail-root").off("click", "[data-folder-name]");
		$("#icl-project-detail-root").on("click", "[data-folder-name]", function (e) {
			e.preventDefault();
			frappe.set_route("Form", "File", this.getAttribute("data-folder-name"));
		});
		$("#icl-project-detail-root").off("click", "#project-timesheet-hours-refresh");
		$("#icl-project-detail-root").on("click", "#project-timesheet-hours-refresh", () => {
			const selected = $("#project-timesheet-month").val() || "";
			const financeApprovedOnly = $("#project-timesheet-finance-approved-only").is(":checked") ? 1 : 0;
			this.renderTimesheetHoursTab(project.name, selected, financeApprovedOnly);
		});
		$("#icl-project-detail-root").off("change", "#project-timesheet-month");
		$("#icl-project-detail-root").on("change", "#project-timesheet-month", () => {
			const selected = $("#project-timesheet-month").val() || "";
			const financeApprovedOnly = $("#project-timesheet-finance-approved-only").is(":checked") ? 1 : 0;
			this.renderTimesheetHoursTab(project.name, selected, financeApprovedOnly);
		});
		$("#icl-project-detail-root").off("change", "#project-timesheet-finance-approved-only");
		$("#icl-project-detail-root").on("change", "#project-timesheet-finance-approved-only", () => {
			const selected = $("#project-timesheet-month").val() || "";
			const financeApprovedOnly = $("#project-timesheet-finance-approved-only").is(":checked") ? 1 : 0;
			this.renderTimesheetHoursTab(project.name, selected, financeApprovedOnly);
		});

		this.renderTemplateSidebar(project.name);
		this.renderProjectFolderTab(project.name);
		this.renderGoogleDriveTab(project.name);
		this.renderTimesheetHoursTab(project.name, "", 0);
	}

	field(label, value) {
		return `
			<div class="col-md-4">
				<div class="border rounded p-2 h-100">
					<div class="text-muted" style="font-size:12px;">${frappe.utils.escape_html(label)}</div>
					<div>${frappe.utils.escape_html(value || "-")}</div>
				</div>
			</div>
		`;
	}

	renderError(message) {
		$("#icl-project-detail-root").html(`
			<div class="alert alert-warning" role="alert">
				${frappe.utils.escape_html(message)}
			</div>
		`);
		$(this.page.sidebar).html("");
	}

	renderTemplateSidebar(projectName) {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_template_targets",
			args: { project_name: projectName },
			callback: (r) => {
				const rows = r.message || [];
				$(this.page.sidebar).html(`
					<div class="card border">
						<div class="card-body p-2">
							<h6 class="mb-2">Project Templates / Requirements</h6>
							<div class="text-muted mb-2" style="font-size:12px;">
								For project: <strong>${frappe.utils.escape_html(projectName)}</strong>
							</div>
							<div class="list-group list-group-flush">
								${rows
									.map((row) => {
										const badge =
											row.match_count > 1
												? `<span class="badge bg-warning text-dark ms-2">${row.match_count}</span>`
												: row.match_count === 1
													? '<span class="badge bg-success ms-2">1</span>'
													: '<span class="badge bg-secondary ms-2">0</span>';
										return `
											<button
												type="button"
												class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
												data-template-doctype="${frappe.utils.escape_html(row.doctype)}"
												data-template-field="${frappe.utils.escape_html(row.project_field || "")}"
												data-template-name="${frappe.utils.escape_html(row.first_name || "")}"
												data-project="${frappe.utils.escape_html(projectName)}"
											>
												<span>${frappe.utils.escape_html(row.label)}</span>
												${badge}
											</button>
										`;
									})
									.join("")}
							</div>
							<div class="text-muted mt-2" style="font-size:11px;">
								0 = no linked record, 1 = opens record, 2+ = opens filtered list.
							</div>
						</div>
					</div>
				`);

				$(this.page.sidebar).off("click", "[data-template-doctype]");
				$(this.page.sidebar).on("click", "[data-template-doctype]", function () {
					const doctype = this.getAttribute("data-template-doctype");
					const project = this.getAttribute("data-project");
					const fieldname = this.getAttribute("data-template-field");
					const docname = this.getAttribute("data-template-name");
					const count = Number((this.querySelector(".badge") || {}).textContent || "0");

					if (count === 1 && docname) {
						frappe.set_route("Form", doctype, docname);
						return;
					}

					if (count > 1 && fieldname) {
						frappe.route_options = { [fieldname]: project };
						frappe.set_route("List", doctype);
						return;
					}

					if (fieldname) {
						frappe.new_doc(doctype, { [fieldname]: project });
					} else {
						frappe.new_doc(doctype);
					}
				});
			},
			error: () => {
				$(this.page.sidebar).html(
					'<div class="alert alert-warning m-2">Could not load project templates.</div>',
				);
			},
			});
		}

	renderProjectFolderTab(projectName) {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_folder_tree",
			args: { project_name: projectName },
			callback: (r) => {
				const data = r.message || {};
				if (!data.root) {
					$("#icl-project-folder-content").html(
						'<div class="alert alert-warning mb-0">No project folder found for this project.</div>',
					);
					return;
				}
				const totalFolders = this.countFolders(data.children || []);
				$("#icl-project-folder-content").html(`
					<div class="card border mb-3">
						<div class="card-body p-3">
							<div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
								<div>
									<div class="text-muted" style="font-size:12px;">Root Folder</div>
									<a class="fw-semibold" href="#" data-folder-name="${frappe.utils.escape_html(data.root.name)}">${frappe.utils.escape_html(data.root.file_name)}</a>
								</div>
								<div class="text-muted" style="font-size:12px;">
									Subfolders: <strong>${frappe.utils.escape_html(String(totalFolders))}</strong>
								</div>
							</div>
						</div>
					</div>
					<div class="card border">
						<div class="card-body p-3">
							<h6 class="mb-3">Folder Structure</h6>
							${this.renderFolderTree(data.children || [])}
						</div>
					</div>
				`);
			},
			error: () => {
				$("#icl-project-folder-content").html(
					'<div class="alert alert-warning mb-0">Could not load project folders.</div>',
				);
			},
		});
	}

	renderGoogleDriveTab(projectName) {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_google_drive_folders",
			args: { project_name: projectName },
			callback: (r) => {
				const rows = r.message || [];
				if (!rows.length) {
					$("#icl-project-gdrive-content").html(
						'<div class="alert alert-info mb-0">No Google Drive folders have been logged for this project yet.</div>',
					);
					return;
				}

				$("#icl-project-gdrive-content").html(`
					<div class="card border">
						<div class="card-body p-0">
							<div class="table-responsive">
								<table class="table table-sm table-bordered mb-0 align-middle">
									<thead>
										<tr>
											<th>Folder</th>
											<th>Google Drive Link</th>
											<th>Created On</th>
											<th>Created By</th>
										</tr>
									</thead>
									<tbody>
										${rows
											.map(
												(row) => `
											<tr>
												<td>${frappe.utils.escape_html(row.folder_name || "-")}</td>
												<td><a href="${frappe.utils.escape_html(row.folder_link || "#")}" target="_blank" rel="noopener noreferrer">Open Folder</a></td>
												<td>${frappe.utils.escape_html(row.created_on || "-")}</td>
												<td>${frappe.utils.escape_html(row.created_by || "-")}</td>
											</tr>
										`,
											)
											.join("")}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				`);
			},
			error: () => {
				$("#icl-project-gdrive-content").html(
					'<div class="alert alert-warning mb-0">Could not load Google Drive folders for this project.</div>',
				);
			},
		});
	}

	renderTimesheetHoursTab(projectName, selectedMonth = "", financeApprovedOnly = 0) {
		financeApprovedOnly = Number(financeApprovedOnly) ? 1 : 0;
		$("#icl-project-timesheet-hours-content").html(`
			<div class="card border">
				<div class="card-body p-3">
					<div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
						<div class="d-flex align-items-end gap-2">
							<div id="project-timesheet-month-filter-wrap">
								<label class="form-label mb-1">Month</label>
								<select class="form-select form-select-sm" id="project-timesheet-month">
									<option value="">All Months</option>
								</select>
							</div>
							<button type="button" class="btn btn-sm btn-primary" id="project-timesheet-hours-refresh">Refresh</button>
						</div>
						<div class="d-flex align-items-center gap-3">
							<div class="form-check">
								<input class="form-check-input" type="checkbox" id="project-timesheet-finance-approved-only" ${financeApprovedOnly ? "checked" : ""}>
								<label class="form-check-label" for="project-timesheet-finance-approved-only">Finance Approved only</label>
							</div>
							<div class="text-muted small">Default: all non-draft timesheets</div>
						</div>
					</div>
					<div id="project-timesheet-hours-results" class="text-muted">Loading month summary...</div>
				</div>
			</div>
		`);

		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.icl_project_detail.icl_project_detail.get_project_timesheet_monthly_hours",
			args: {
				project_name: projectName,
				month: selectedMonth || null,
				finance_approved_only: financeApprovedOnly,
			},
			callback: (r) => {
				const data = r.message || {};
				const availableMonths = data.available_months || [];
				const totalHours = this.formatHours(data.total_hours || 0);
				const timesheetCount = data.timesheet_count || 0;
				const dailyRows = data.daily_hours || [];
				const employeeRows = data.employee_hours || [];
				const monthlyRows = data.monthly_hours || [];
				const activeMonth = data.month || "";

				$("#project-timesheet-month").html(`
					<option value="" ${activeMonth ? "" : "selected"}>All Months</option>
					${availableMonths
						.map(
							(m) =>
								`<option value="${frappe.utils.escape_html(m)}" ${m === activeMonth ? "selected" : ""}>${frappe.utils.escape_html(m)}</option>`,
						)
						.join("")}
				`);

				$("#project-timesheet-hours-results").html(`
					<div class="row g-2 mb-3">
						<div class="col-md-4">
							<div class="border rounded p-2 h-100">
								<div class="text-muted" style="font-size:12px;">Period</div>
								<div class="fw-semibold">${frappe.utils.escape_html(activeMonth || "All Months")}</div>
							</div>
						</div>
						<div class="col-md-4">
							<div class="border rounded p-2 h-100">
								<div class="text-muted" style="font-size:12px;">Total Hours Worked</div>
								<div class="fw-semibold">${frappe.utils.escape_html(totalHours)}</div>
							</div>
						</div>
						<div class="col-md-4">
							<div class="border rounded p-2 h-100">
								<div class="text-muted" style="font-size:12px;">Non-Draft Timesheets</div>
								<div class="fw-semibold">${frappe.utils.escape_html(String(timesheetCount))}</div>
							</div>
						</div>
					</div>
					<div class="card border mb-3">
						<div class="card-body p-0">
							<div class="p-2 border-bottom"><strong>Monthly Totals</strong></div>
							<div class="table-responsive">
								<table class="table table-sm table-bordered mb-0 align-middle">
									<thead>
										<tr>
											<th>Month</th>
											<th class="text-end">Hours</th>
										</tr>
									</thead>
									<tbody>
										${monthlyRows.length
											? monthlyRows
												.map(
													(row) => `
												<tr>
													<td>${frappe.utils.escape_html(row.month || "-")}</td>
													<td class="text-end">${frappe.utils.escape_html(this.formatHours(row.total_hours || 0))}</td>
												</tr>
											`,
												)
												.join("")
											: '<tr><td colspan="2" class="text-muted text-center">No submitted timesheet hours found for this project.</td></tr>'}
									</tbody>
								</table>
							</div>
						</div>
					</div>
					<div class="row g-3">
						<div class="col-lg-6">
							<div class="card border h-100">
								<div class="card-body p-0">
									<div class="p-2 border-bottom"><strong>Daily Hours</strong></div>
									<div class="table-responsive">
										<table class="table table-sm table-bordered mb-0 align-middle">
											<thead>
												<tr>
													<th>Date</th>
													<th class="text-end">Hours</th>
												</tr>
											</thead>
											<tbody>
												${dailyRows.length
													? dailyRows
														.map(
															(row) => `
														<tr>
															<td>${frappe.utils.escape_html(row.work_date || "-")}</td>
															<td class="text-end">${frappe.utils.escape_html(this.formatHours(row.total_hours || 0))}</td>
														</tr>
													`,
														)
														.join("")
													: '<tr><td colspan="2" class="text-muted text-center">No submitted timesheet hours for this month.</td></tr>'}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
						<div class="col-lg-6">
							<div class="card border h-100">
								<div class="card-body p-0">
									<div class="p-2 border-bottom"><strong>Employee Breakdown</strong></div>
									<div class="table-responsive">
										<table class="table table-sm table-bordered mb-0 align-middle">
											<thead>
												<tr>
													<th>Employee</th>
													<th class="text-end">Hours</th>
												</tr>
											</thead>
											<tbody>
												${employeeRows.length
													? employeeRows
														.map(
															(row) => `
														<tr>
															<td>${frappe.utils.escape_html(row.employee_name || row.employee || "-")}</td>
															<td class="text-end">${frappe.utils.escape_html(this.formatHours(row.total_hours || 0))}</td>
														</tr>
													`,
														)
														.join("")
													: '<tr><td colspan="2" class="text-muted text-center">No employee hours found for this month.</td></tr>'}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
					</div>
				`);
			},
			error: () => {
				$("#project-timesheet-hours-results").html(
					'<div class="alert alert-warning mb-0">Could not load monthly timesheet hours for this project.</div>',
				);
			},
		});
	}

	formatHours(value) {
		const num = Number(value || 0);
		return Number.isFinite(num) ? num.toFixed(2) : "0.00";
	}

	renderFolderTree(nodes) {
		if (!nodes.length) {
			return '<div class="text-muted">No subfolders found.</div>';
		}
		return `
			<ul style="padding-left: 16px; margin-bottom: 0; list-style: none;">
				${nodes
					.map(
						(node) => `
					<li style="margin-bottom: 8px;">
						<div class="d-flex align-items-center gap-2 p-2 border rounded" style="background:#fafbfc;">
							<span style="font-size:14px;">📁</span>
							<a href="#" data-folder-name="${frappe.utils.escape_html(node.name)}" class="fw-semibold">${frappe.utils.escape_html(node.file_name)}</a>
						</div>
						${this.renderFolderTree(node.children || [])}
					</li>
				`,
					)
					.join("")}
			</ul>
		`;
	}

	countFolders(nodes) {
		return nodes.reduce((acc, node) => acc + 1 + this.countFolders(node.children || []), 0);
	}
	}
