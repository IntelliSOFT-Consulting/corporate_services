frappe.ui.form.on("Travel Request", {
	onload(frm) {
		applyTravelTypeVisibility(frm);
		if (frm.doc.travel_type === "Domestic" && frm.doc.custom_local_place_of_travel) {
			loadLocalTransportMatrix(frm);
		}
	},

	refresh(frm) {
		applyTravelTypeVisibility(frm);
		if (frm.doc.travel_type === "Domestic" && frm.doc.custom_local_place_of_travel) {
			loadLocalTransportMatrix(frm);
		}

		if (!should_show_reconcile_button(frm)) return;

		frm.add_custom_button(__("Reconcile"), () => {
			frappe.new_doc("Travel Request Reconciliation", {
				travel_request: frm.doc.name,
			});
		});
	},

	travel_type(frm) {
		applyTravelTypeVisibility(frm);
		if (frm.doc.travel_type !== "Domestic") {
			frm.set_value("custom_local_place_of_travel", null);
			frm.clear_table("custom_icl_proposed_transport_matrix");
			frm.refresh_field("custom_icl_proposed_transport_matrix");
		}
	},

	custom_local_place_of_travel(frm) {
		if (frm.doc.travel_type === "Domestic" && frm.doc.custom_local_place_of_travel) {
			loadLocalTransportMatrix(frm);
			return;
		}
		frm.clear_table("custom_icl_proposed_transport_matrix");
		frm.refresh_field("custom_icl_proposed_transport_matrix");
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

function applyTravelTypeVisibility(frm) {
	const isDomestic = frm.doc.travel_type === "Domestic";
	const isInternational = frm.doc.travel_type === "International";

	frm.set_df_property("custom_local_place_of_travel", "hidden", !isDomestic);
	frm.set_df_property("custom_icl_proposed_transport_matrix", "hidden", !isDomestic);
	frm.set_df_property("custom_place_of_travel_per_diem", "hidden", !isInternational);
	frm.set_df_property("custom_per_diem_rates", "hidden", !isInternational);
}

function loadLocalTransportMatrix(frm) {
	const place = frm.doc.custom_local_place_of_travel;
	if (!place) return;

	frappe.call({
		method: "corporate_services.api.travel_request.travel_request.get_local_per_diem_rates",
		args: { place },
		freeze: true,
		freeze_message: __("Loading local transport matrix..."),
		callback: (r) => {
			const rows = r.message || [];

			frm.clear_table("custom_icl_proposed_transport_matrix");
			rows.forEach((item) => {
				const row = frm.add_child("custom_icl_proposed_transport_matrix");
				row.from = item.from || "";
				row.destination = item.destination || "";
				row.province = item.province || "";
				row.travel_region = item.travel_region || "";
				row.transport_means_of_travel = item.transport_means_of_travel || "";
				row.fares = item.fares || 0;
				row.accommodation_min = item.accommodation_min || 0;
				row.accommodation_max = item.accommodation_max || 0;
				row.meals_incidentals_min = item.meals_incidentals_min || 0;
				row.meals__incidentals__max = item.meals__incidentals__max || 0;
			});
			frm.refresh_field("custom_icl_proposed_transport_matrix");
		},
		error: () => {
			frm.clear_table("custom_icl_proposed_transport_matrix");
			frm.refresh_field("custom_icl_proposed_transport_matrix");
		},
	});
}
