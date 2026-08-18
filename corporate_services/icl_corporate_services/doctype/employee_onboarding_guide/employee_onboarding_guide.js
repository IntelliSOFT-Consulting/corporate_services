// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

const ONBOARDING_GUIDE_STAGE_FIELD_MAP = {
	Preboarding: "preboarding_milestones",
	"Day 1": "day_1_milestones",
	"Week 1": "week_1_milestones",
	"Month 1": "month_1_milestones",
	"Mid-probation": "mid_probation_milestones",
	"End of probation": "end_of_probation_milestones",
};

frappe.ui.form.on("Employee Onboarding Guide", {
	refresh(frm) {
		const has_any_rows = Object.values(ONBOARDING_GUIDE_STAGE_FIELD_MAP).some(
			(fieldname) => (frm.doc[fieldname] || []).length
		);

		if (frm.is_new() && !has_any_rows) {
			frappe.call({
				method:
					"corporate_services.icl_corporate_services.doctype.employee_onboarding_guide.employee_onboarding_guide.get_active_template_questions",
				callback(r) {
					const data = r.message || {};
					if (!data.stages) return;

					frm.doc.question_template = data.template_name;
					Object.entries(ONBOARDING_GUIDE_STAGE_FIELD_MAP).forEach(([stage, fieldname]) => {
						(data.stages[stage] || []).forEach((q) => {
							const row = frm.add_child(fieldname);
							row.milestone = q.milestone;
							row.owner = q.owner;
							row.timing = q.timing;
							row.status = "🔴 Not Started";
						});
						frm.refresh_field(fieldname);
					});
				},
			});
		}
	},
});
