// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

function is_rejected_requisition(frm) {
	const status = (frm.doc.status || "").toUpperCase();
	const workflow_state = (frm.doc.workflow_state || "").toLowerCase();
	return status === "REJECTED" || workflow_state.includes("rejected");
}

function prompt_rejection_reason() {
	return new Promise((resolve) => {
		let resolved = false;
		const dialog = new frappe.ui.Dialog({
			title: __("Provide Rejection Reason"),
			fields: [
				{
					fieldname: "rejection_reason",
					label: __("Rejection Reason"),
					fieldtype: "Small Text",
					reqd: 1,
				},
			],
			primary_action_label: __("Submit"),
			primary_action(values) {
				const reason = (values.rejection_reason || "").trim();
				if (!reason) {
					frappe.msgprint(__("Rejection Reason is required."));
					return;
				}
				resolved = true;
				dialog.hide();
				resolve(reason);
			},
		});

		dialog.onhide = () => {
			if (!resolved) {
				resolve("");
			}
		};

		// Workflow action can leave a freeze layer above modals. Clear it first.
		if (frappe.dom && frappe.dom.unfreeze) {
			frappe.dom.unfreeze();
		}

		dialog.show();
		dialog.$wrapper.css("z-index", 1061);
		$(".modal-backdrop").last().css("z-index", 1060);
	});
}

function toggle_read_only_on_rejection(frm) {
	if (!frm.__initial_read_only) {
		frm.__initial_read_only = {};
		(frm.meta.fields || []).forEach((df) => {
			if (df.fieldname) {
				frm.__initial_read_only[df.fieldname] = df.read_only ? 1 : 0;
			}
		});
	}

	const rejected = is_rejected_requisition(frm);

	(frm.meta.fields || []).forEach((df) => {
		if (!df.fieldname) return;

		const default_read_only = frm.__initial_read_only[df.fieldname] || 0;
		const read_only = rejected
			? (df.fieldname === "rejection_reason" ? 0 : 1)
			: default_read_only;

		frm.set_df_property(df.fieldname, "read_only", read_only);
	});

	if (!rejected) {
		frm.set_df_property("rejection_reason", "reqd", 0);
	}
}

frappe.ui.form.on("Staff Requisition", {
	refresh(frm) {
		toggle_read_only_on_rejection(frm);
	},

	status(frm) {
		toggle_read_only_on_rejection(frm);
	},

	workflow_state(frm) {
		toggle_read_only_on_rejection(frm);
	},

	async before_workflow_action(frm) {
		const selectedAction = frm.selected_workflow_action;
		const action = (selectedAction || "").toLowerCase();

		const is_submit_to_hr =
			action.includes("submit to hr") &&
			(frm.doc.workflow_state || "") === "Needs Clarification";
		if (is_submit_to_hr && !(frm.doc.clarification_response || "").trim()) {
			frappe.throw(__("Please provide Clarification Response before submitting to HR."));
		}

		if (!action.includes("reject")) return;
		if ((frm.doc.rejection_reason || "").trim()) return;
		if (frm.__handling_reject_prompt) return;

		// Pause default workflow action while we collect rejection reason.
		frappe.validated = false;
		frm.__handling_reject_prompt = true;

		try {
			const reason = await prompt_rejection_reason();
			if (!reason) {
				return;
			}

			await frm.set_value("rejection_reason", reason);
			const response = await frappe.call({
				method: "frappe.model.workflow.apply_workflow",
				args: {
					doc: frm.doc,
					action: selectedAction,
				},
				freeze: true,
				freeze_message: __("Rejecting requisition..."),
			});
			if (response.message) {
				frappe.model.sync(response.message);
			}
			await frm.refresh();
			frappe.show_alert({
				message: __("Requisition rejected successfully."),
				indicator: "red",
			});
		} finally {
			frm.__handling_reject_prompt = false;
		}
	},
});
