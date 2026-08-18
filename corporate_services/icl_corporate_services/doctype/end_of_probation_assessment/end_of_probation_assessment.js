// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("End of Probation Assessment", {
	refresh(frm) {
		if (frm.is_new() && !(frm.doc.ratings || []).length) {
			frappe.call({
				method:
					"corporate_services.icl_corporate_services.doctype.end_of_probation_assessment.end_of_probation_assessment.get_active_template_questions",
				callback(r) {
					const data = r.message || {};
					if (!data.questions || !data.questions.length) return;

					frm.doc.question_template = data.template_name;
					data.questions.forEach((q) => {
						const row = frm.add_child("ratings");
						row.assessment_area = q.assessment_area;
						row.guidance = q.guidance;
					});
					frm.refresh_field("ratings");
				},
			});
		}
	},
});
