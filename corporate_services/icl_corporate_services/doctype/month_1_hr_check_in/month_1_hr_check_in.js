// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("Month 1 HR Check-In", {
	refresh(frm) {
		if (frm.is_new() && !(frm.doc.first_month_conversation || []).length) {
			frappe.call({
				method:
					"corporate_services.icl_corporate_services.doctype.month_1_hr_check_in.month_1_hr_check_in.get_active_template_questions",
				callback(r) {
					const data = r.message || {};
					if (!data.questions || !data.questions.length) return;

					frm.doc.question_template = data.template_name;
					data.questions.forEach((q) => {
						const row = frm.add_child("first_month_conversation");
						row.area = q.area;
						row.conversation_prompt = q.conversation_prompt;
					});
					frm.refresh_field("first_month_conversation");
				},
			});
		}
	},
});
