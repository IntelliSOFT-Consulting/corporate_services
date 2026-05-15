frappe.pages["health-information-system-project-lifecycle"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Health Information System Project Lifecycle",
		single_column: true,
	});

	page.set_primary_action("Create New Project", () => frappe.new_doc("Project"));
	page.set_secondary_action("New Lifecycle Checklist", () =>
		frappe.new_doc("HIS PM Project LifeCycle"),
	);
	page.add_menu_item("View Lifecycle Records", () =>
		frappe.set_route("List", "HIS PM Project LifeCycle"),
	);
	page.add_menu_item("Manage Lifecycle Config", () =>
		frappe.set_route("Form", "HIS Project Lifecycle Config", "HIS Project Lifecycle Config"),
	);

	$(page.body).html('<div id="his-pm-lifecycle-root" class="p-3 text-muted">Loading...</div>');
	loadLifecyclePage();
};

function loadLifecyclePage() {
	frappe.call({
		method:
			"corporate_services.icl_corporate_services.page.health_information_system_project_lifecycle.health_information_system_project_lifecycle.get_lifecycle_config",
		callback: (r) => {
			const payload = r.message || {};
			$("#his-pm-lifecycle-root").html(renderLifecyclePage(payload));
		},
		error: () => {
			$("#his-pm-lifecycle-root").html(
				'<div class="alert alert-warning">Could not load lifecycle configuration.</div>',
			);
		},
	});
}

function renderLifecyclePage(payload) {
	const stages = payload.stages || [];
	const introTitle = payload.intro_title || "Project Start-to-End Guide";
	const introDescription = payload.intro_description || "";

	if (!document.getElementById("his-pm-lifecycle-style")) {
		const style = document.createElement("style");
		style.id = "his-pm-lifecycle-style";
		style.textContent = `
			.his-lifecycle-wrap { padding: 12px; }
			.his-lifecycle-intro {
				background: #f7fbff; border: 1px solid #d9ebfb; border-radius: 8px;
				padding: 12px 14px; margin-bottom: 14px;
			}
			.his-lifecycle-grid {
				display: grid; gap: 12px;
				grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
			}
			.his-stage-card {
				border: 1px solid #dfe3ea; border-radius: 10px; background: #fff; overflow: hidden;
			}
			.his-stage-head {
				background: #f6f8fb; padding: 10px 12px; border-bottom: 1px solid #e5e9f0;
				display: flex; justify-content: space-between; align-items: center;
			}
			.his-stage-title { font-weight: 700; color: #1f2937; margin: 0; }
			.his-step-chip {
				background: #ecf2ff; color: #2348a0; border: 1px solid #cddcff;
				font-size: 11px; padding: 2px 8px; border-radius: 20px; margin-left: 6px;
			}
			.his-stage-body { padding: 12px; }
			.his-stage-group-title {
				font-size: 12px; text-transform: uppercase; letter-spacing: .03em;
				color: #6b7280; margin: 0 0 6px;
			}
			.his-stage-list { margin: 0 0 10px 16px; padding: 0; }
			.his-stage-list li { margin-bottom: 4px; color: #111827; }
		`;
		document.head.appendChild(style);
	}

	if (!stages.length) {
		return `
			<div class="his-lifecycle-wrap">
				<div class="his-lifecycle-intro">
					<div><strong>${frappe.utils.escape_html(introTitle)}</strong></div>
					<div class="text-muted">${frappe.utils.escape_html(introDescription)}</div>
				</div>
				<div class="alert alert-info mb-0">No lifecycle stages configured yet. Create records in HIS Project Lifecycle Config.</div>
			</div>
		`;
	}

	return `
		<div class="his-lifecycle-wrap">
			<div class="his-lifecycle-intro">
				<div><strong>${frappe.utils.escape_html(introTitle)}</strong></div>
				<div class="text-muted">${frappe.utils.escape_html(introDescription)}</div>
			</div>
			<div class="his-lifecycle-grid">
				${stages
					.map(
						(stage) => `
					<div class="his-stage-card">
						<div class="his-stage-head">
							<h6 class="his-stage-title">${frappe.utils.escape_html(stage.stage_name || "")}</h6>
							<div>${(stage.steps || [])
								.map(
									(step) =>
										`<span class="his-step-chip">${frappe.utils.escape_html(step)}</span>`,
								)
								.join("")}</div>
						</div>
						<div class="his-stage-body">
							<div class="his-stage-group-title">Requirements</div>
							<ul class="his-stage-list">
								${(stage.requirements || [])
									.map((item) => `<li>${frappe.utils.escape_html(item)}</li>`)
									.join("")}
							</ul>
							<div class="his-stage-group-title">Deliverables / Templates</div>
							<ul class="his-stage-list">
								${(stage.deliverables || [])
									.map((item) => `<li>${frappe.utils.escape_html(item)}</li>`)
									.join("")}
							</ul>
						</div>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`;
}
