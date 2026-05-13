frappe.pages["hr-reporting-guide"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "HR Reporting Guide",
		single_column: true,
	});

	page.set_primary_action("Open Weekly Report Template", () =>
		frappe.set_route("List", "Weekly Report Template"),
	);
	page.set_secondary_action("Open Weekly Progress Reports", () =>
		frappe.set_route("List", "Weekly Progress Report"),
	);

	$(page.body).html(`
		<div class="container-fluid p-3">
			<div class="card border mb-3">
				<div class="card-body">
					<h5 class="mb-2">Weekly Progress Reporting Guide</h5>
					<p class="text-muted mb-2">
						Use this guide to manage intern/employee weekly reporting and supervisor review.
					</p>
					<ol class="mb-0">
						<li>Fill in the report individually every week, reflecting accomplishments, challenges, learnings, goals, and assistance needed.</li>
						<li>Share the completed progress report directly with your supervisor by close of business (COB) every Friday for review and feedback, keeping HR in copy.</li>
					</ol>
				</div>
			</div>
			<div class="card border mb-3">
				<div class="card-body">
					<h6 class="mb-2">HR Template Management</h6>
					<ul class="mb-0">
						<li>Create and maintain questions in <strong>Weekly Report Template</strong>.</li>
						<li>Mark required questions using the <strong>Required</strong> checkbox.</li>
						<li>Use <strong>Display Order</strong> to control question sequence.</li>
						<li>Set <strong>Is Active</strong> to disable questions without deleting history.</li>
					</ul>
				</div>
			</div>
			<div class="card border">
				<div class="card-body">
					<h6 class="mb-2">Weekly Report Flow</h6>
					<ol class="mb-0">
						<li>User creates a <strong>Weekly Progress Report</strong>.</li>
						<li>User selects a <strong>Question Template</strong> to auto-load questions.</li>
						<li>User fills responses and submits report.</li>
						<li>Supervisor reviews and records feedback.</li>
					</ol>
				</div>
			</div>
		</div>
	`);
};
