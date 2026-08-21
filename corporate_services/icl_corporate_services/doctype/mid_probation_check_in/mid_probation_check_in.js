// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mid-Probation Check-In", {
	refresh(frm) {
		if (frm.is_new() && !(frm.doc.checklist || []).length) {
			frappe.call({
				method:
					"corporate_services.icl_corporate_services.doctype.mid_probation_check_in.mid_probation_check_in.get_active_template_questions",
				callback(r) {
					const data = r.message || {};
					if (!data.questions || !data.questions.length) return;

					frm.doc.question_template = data.template_name;
					data.questions.forEach((q) => {
						const row = frm.add_child("checklist");
						row.check_area = q.check_area;
					});
					frm.refresh_field("checklist");
				},
			});
		}
	},
});
