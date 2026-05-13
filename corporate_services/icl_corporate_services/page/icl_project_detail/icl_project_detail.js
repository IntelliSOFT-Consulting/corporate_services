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
			<div class="card border mb-3">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-center mb-2">
						<h5 class="mb-0">${frappe.utils.escape_html(project.project_name || project.name || "")}</h5>
						<a href="#" id="open-project-form">${frappe.utils.escape_html(project.name || "")}</a>
					</div>
					<div class="row g-3">
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
				</div>
			</div>
			<div class="card border">
				<div class="card-body">
					<h6 class="mb-2">Notes</h6>
					<div>${project.notes ? frappe.utils.escape_html(project.notes) : '<span class="text-muted">No notes available.</span>'}</div>
				</div>
			</div>
		`);

		$("#icl-project-detail-root").off("click", "#open-project-form");
		$("#icl-project-detail-root").on("click", "#open-project-form", function (e) {
			e.preventDefault();
			frappe.set_route("Form", "Project", project.name);
		});

		this.renderTemplateSidebar(project.name);
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
}
