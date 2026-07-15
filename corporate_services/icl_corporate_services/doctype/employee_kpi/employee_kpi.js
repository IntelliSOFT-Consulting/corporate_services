// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

function prompt_clarification_required() {
	return new Promise((resolve) => {
		let resolved = false;
		const dialog = new frappe.ui.Dialog({
			title: __("Provide Clarification Required"),
			fields: [
				{
					fieldname: "clarification_required",
					label: __("Clarification Required"),
					fieldtype: "Small Text",
					reqd: 1,
				},
			],
			primary_action_label: __("Submit"),
			primary_action(values) {
				const remarks = (values.clarification_required || "").trim();
				if (!remarks) {
					frappe.msgprint(__("Clarification Required is mandatory."));
					return;
				}
				resolved = true;
				dialog.hide();
				resolve(remarks);
			},
		});

		dialog.onhide = () => {
			if (!resolved) {
				resolve("");
			}
		};

		if (frappe.dom && frappe.dom.unfreeze) {
			frappe.dom.unfreeze();
		}

		dialog.show();
		dialog.$wrapper.css("z-index", 1061);
		$(".modal-backdrop").last().css("z-index", 1060);
	});
}

frappe.ui.form.on("Employee KPI", {
	refresh(frm) {
		frm.add_custom_button(__("KPI Template Instructions"), () => {
			frappe.set_route("Form", "KPI Template Instructions");
		});
	},

	async before_workflow_action(frm) {
		const selectedAction = frm.selected_workflow_action;
		const action = (selectedAction || "").toLowerCase();

		if (!action.includes("clarification")) return;
		if (frm.__handling_clarification_prompt) return;

		frappe.validated = false;
		frm.__handling_clarification_prompt = true;

		try {
			const remarks = await prompt_clarification_required();
			if (!remarks) {
				return;
			}

			await frm.set_value("clarification_required", remarks);
			const response = await frappe.call({
				method: "frappe.model.workflow.apply_workflow",
				args: {
					doc: frm.doc,
					action: selectedAction,
				},
				freeze: true,
				freeze_message: __("Requesting clarification..."),
			});
			if (response.message) {
				frappe.model.sync(response.message);
			}
			await frm.refresh();
			frappe.show_alert({
				message: __("Clarification requested successfully."),
				indicator: "orange",
			});
		} finally {
			frm.__handling_clarification_prompt = false;
		}
	},
});
