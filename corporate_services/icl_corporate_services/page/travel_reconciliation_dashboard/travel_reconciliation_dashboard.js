frappe.pages["travel-reconciliation-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Travel Reconciliation Dashboard",
		single_column: true,
	});

	frappe.require(
		"/assets/corporate_services/js/travel_reconciliation_dashboard.js",
		() => {
			if (window.initTravelReconciliationDashboard) {
				window.initTravelReconciliationDashboard(page);
			} else {
				console.error("Travel Reconciliation dashboard components loaded but init function is missing");
			}
		},
	);
};
