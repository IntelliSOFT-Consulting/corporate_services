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

	const resources = [
		{
			label: "Project Charter",
			doctype: "Project Charter",
			description: "Define project goals, scope, ownership, and approvals.",
		},
		{
			label: "High Level Work Plan",
			doctype: "High Level Work Plan",
			description: "Track high-level activities and timeline milestones.",
		},
		{
			label: "Detailed Work Plan",
			doctype: "Detailed Work Plan",
			description: "Break down activities, owners, durations, and dependencies.",
		},
		{
			label: "Communication Plan",
			doctype: "Project Communications Plan",
			description: "Define stakeholder communication channels and cadence.",
		},
		{
			label: "Feedback Document",
			doctype: "Project Feedback Tracker",
			description: "Capture implementation feedback, issues, and actions.",
		},
		{
			label: "Risk Assessment",
			doctype: "Risk Assessment Matrix",
			description: "Document risks, likelihood, impact, and mitigations.",
		},
		{
			label: "Implementation Plan",
			doctype: "Project Implementation Plan",
			description: "Plan rollout approach, readiness, and execution steps.",
		},
		{
			label: "Lifecycle Checklist",
			doctype: "HIS PM Project LifeCycle",
			description: "Track lifecycle completion from Prepare to Maintenance.",
		},
	];

	$(page.body).html(renderPage(resources));

	$(page.body).on("click", "[data-action][data-doctype]", function () {
		const action = this.getAttribute("data-action");
		const doctype = this.getAttribute("data-doctype");
		if (action === "new") {
			frappe.new_doc(doctype);
			return;
		}
		frappe.set_route("List", doctype);
	});
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
				Use these templates and linked DocTypes to manage all HIS project lifecycle requirements.
			</div>
			<div class="prt-grid">
				${resources
					.map(
						(item) => `
					<div class="prt-card">
						<div class="prt-title">${frappe.utils.escape_html(item.label)}</div>
						<div class="prt-desc">${frappe.utils.escape_html(item.description)}</div>
						<div class="prt-actions">
							<button class="btn btn-sm btn-primary" data-action="new" data-doctype="${frappe.utils.escape_html(
								item.doctype,
							)}">New</button>
							<button class="btn btn-sm btn-default" data-action="list" data-doctype="${frappe.utils.escape_html(
								item.doctype,
							)}">View List</button>
						</div>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`;
}
