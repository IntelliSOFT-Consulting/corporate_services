frappe.ui.form.on("Travel Request", {
	refresh(frm) {
		if (!should_show_reconcile_button(frm)) return;

		frm.add_custom_button(__("Reconcile"), () => {
			frappe.new_doc("Travel Request Reconciliation", {
				travel_request: frm.doc.name,
			});
		});
	},
});

function should_show_reconcile_button(frm) {
	const d = frm.doc || {};

	if (!d.name || d.__islocal) return false;
	if (d.docstatus !== 1) return false;
	if (d.custom_reconciliation_reference) return false;
	if (d.custom_reconciliation_status === "Reconciled") return false;

	const workflowState = (d.workflow_state || "").toLowerCase();
	const status = (d.status || "").toLowerCase();

	const financeApprovedByWorkflow =
		workflowState.includes("finance") &&
		(workflowState.includes("approve") || workflowState.includes("approved"));

	const genericApproved =
		workflowState.includes("approved") || status === "approved";

	return financeApprovedByWorkflow || genericApproved;
}
