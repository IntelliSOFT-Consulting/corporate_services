frappe.pages["project-requirements-templates"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Project Requirements Templates",
		single_column: true,
	});

	page.set_primary_action("Create New Project", () => frappe.new_doc("Project"));
	page.set_secondary_action("Open HIS Lifecycle Guide", () =>
		frappe.set_route("health-information-system-project-lifecycle"),
	);

	$(page.body).html('<div id="project-requirements-templates-root" class="p-3 text-muted">Loading...</div>');
	loadTemplateLibrary();

	$(page.body).on("click", "[data-action]", function () {
		const action = this.getAttribute("data-action");
		const doctype = this.getAttribute("data-doctype");
		const requirement = this.getAttribute("data-requirement");
		const currentFile = this.getAttribute("data-file-url");

		if (action === "new") {
			frappe.new_doc(doctype);
			return;
		}
		if (action === "download") {
			if (!currentFile) {
				frappe.show_alert({ message: __("No template uploaded yet"), indicator: "orange" });
				return;
			}
			window.open(currentFile, "_blank");
			return;
		}
		if (action === "upload") {
			openUploadDialog(requirement, () => loadTemplateLibrary());
			return;
		}
		frappe.set_route("List", doctype);
	});

	function loadTemplateLibrary() {
		frappe.call({
			method:
				"corporate_services.icl_corporate_services.page.project_requirements_templates.project_requirements_templates.get_template_library",
			callback: (r) => {
				const resources = r.message || [];
				$("#project-requirements-templates-root").html(renderPage(resources));
			},
			error: () => {
				$("#project-requirements-templates-root").html(
					'<div class="alert alert-warning">Could not load template library.</div>',
				);
			},
		});
	}
};

function renderPage(resources) {
	if (!document.getElementById("project-requirements-templates-style")) {
		const style = document.createElement("style");
		style.id = "project-requirements-templates-style";
		style.textContent = `
			.prt-wrap { padding: 12px; }
			.prt-intro { margin-bottom: 12px; }
			.prt-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
				gap: 12px;
			}
			.prt-card {
				border: 1px solid #dfe3ea;
				border-radius: 10px;
				background: #fff;
				padding: 12px;
			}
			.prt-title { font-weight: 700; margin-bottom: 6px; }
			.prt-desc { color: #6b7280; min-height: 40px; margin-bottom: 10px; }
			.prt-actions { display: flex; gap: 8px; }
		`;
		document.head.appendChild(style);
	}

	return `
		<div class="prt-wrap">
			<div class="prt-intro alert alert-info mb-3" role="alert">
				Upload one default Word template per requirement. Users can download, edit offline, and upload the completed file to the target project document.
			</div>
			<div class="prt-grid">
				${resources
					.map(
						(item) => `
					<div class="prt-card">
						<div class="prt-title">${frappe.utils.escape_html(item.requirement)}</div>
						<div class="prt-desc">${frappe.utils.escape_html(item.description)}</div>
						<div class="small text-muted mb-2">
							Target: ${frappe.utils.escape_html(item.doctype)}
						</div>
						<div class="small mb-2">
							${
								item.template_file
									? `<span class="text-success">Template uploaded</span>`
									: `<span class="text-warning">No template uploaded</span>`
							}
						</div>
						<div class="prt-actions">
							<button class="btn btn-sm btn-primary" data-action="new" data-doctype="${frappe.utils.escape_html(
								item.doctype,
							)}">New</button>
							<button class="btn btn-sm btn-default" data-action="list" data-doctype="${frappe.utils.escape_html(
								item.doctype,
							)}">View List</button>
							<button class="btn btn-sm btn-default" data-action="upload" data-requirement="${frappe.utils.escape_html(
								item.requirement,
							)}">Upload/Replace Template</button>
							<button class="btn btn-sm btn-default" data-action="download" data-file-url="${frappe.utils.escape_html(
								item.template_file || "",
							)}" data-doctype="${frappe.utils.escape_html(item.doctype)}">Download Template</button>
						</div>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`;
}

function openUploadDialog(requirement, onDone) {
	new frappe.ui.FileUploader({
		allow_multiple: false,
		restrictions: {
			allowed_file_types: [".doc", ".docx", ".pdf"],
		},
		on_success: (file) => {
			frappe.call({
				method:
					"corporate_services.icl_corporate_services.page.project_requirements_templates.project_requirements_templates.link_template_file",
				args: {
					requirement,
					file_url: file.file_url,
				},
				callback: () => {
					frappe.show_alert({ message: __("Template saved"), indicator: "green" });
					onDone();
				},
			});
		},
	});
}
