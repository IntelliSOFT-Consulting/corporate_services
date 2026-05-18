// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

frappe.ui.form.on("Monthly Reflection", {
	setup(frm) {
		set_review_period_options(frm);
	},

	onload(frm) {
		set_review_period_options(frm);
		ensure_active_template_and_questions(frm);
	},

	question_template(frm) {
		if (!frm.doc.question_template) return;
		populate_questions_from_template(frm);
	},

	refresh(frm) {
		set_review_period_options(frm);
		render_questionnaire_ui(frm);
	},

	onload_post_render(frm) {
		render_questionnaire_ui(frm);
	},

	validate(frm) {
		sync_questionnaire_ui_to_rows(frm);
	},
});

function set_review_period_options(frm) {
	const current_date = frappe.datetime.str_to_obj(frappe.datetime.nowdate());
	const current_year = current_date.getFullYear();
	const options = [""];

	for (let year = current_year + 2; year >= current_year - 2; year--) {
		for (let month_index = MONTH_NAMES.length - 1; month_index >= 0; month_index--) {
			options.push(`${MONTH_NAMES[month_index]} ${year}`);
		}
	}

	if (frm.doc.review_period && !options.includes(frm.doc.review_period)) {
		options.unshift(frm.doc.review_period);
	}

	frm.set_df_property("review_period", "options", options.join("\n"));
}

function ensure_active_template_and_questions(frm, forceRefresh = false) {
	if ((frm.doc.answers || []).length && !forceRefresh) {
		return;
	}

	if (frm.doc.question_template && !forceRefresh) {
		populate_questions_from_template(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.monthly_reflection.monthly_reflection.get_active_template_questions",
		callback: (r) => {
			const payload = r.message || {};
			if (!payload.template_name) {
				frappe.msgprint(__("No active Monthly Reflection Template found. Please contact HR/System Admin."));
				return;
			}

			if (frm.doc.question_template !== payload.template_name) {
				frm.set_value("question_template", payload.template_name);
				return;
			}
			populate_questions_from_template(frm);
		},
	});
}

function populate_questions_from_template(frm) {
	if ((frm.doc.answers || []).length && !frm.is_new()) {
		render_questionnaire_ui(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.monthly_reflection.monthly_reflection.get_active_template_questions",
		args: {
			template_name: frm.doc.question_template || null,
		},
		callback: (r) => {
			const payload = r.message || {};
			const questions = payload.questions || [];
			if (payload.template_name && frm.doc.question_template !== payload.template_name) {
				frm.set_value("question_template", payload.template_name);
			}

			const existing = {};
			(frm.doc.answers || []).forEach((row) => {
				existing[row.question] = row.response;
				existing[strip_number_prefix(row.question)] = row.response;
			});

			frm.clear_table("answers");
			questions.forEach((q, idx) => {
				const numberedQuestion = `${idx + 1}. ${q.question_text}`;
				const row = frm.add_child("answers");
				row.question = numberedQuestion;
				row.help_text = q.help_text;
				row.is_required = q.is_required;
				row.response_fieldtype = q.response_fieldtype || "Text Editor";
				row.response = existing[numberedQuestion] || existing[q.question_text] || "";
			});
			frm.refresh_field("answers");
			render_questionnaire_ui(frm);
		},
	});
}

function strip_number_prefix(text) {
	return (text || "").replace(/^\s*\d+\.\s*/, "").trim();
}

function render_questionnaire_ui(frm) {
	const field = frm.get_field("response_ui");
	if (!field || !field.$wrapper) return;
	frm._monthly_response_controls = [];

	const rows = frm.doc.answers || [];
	if (!rows.length) {
		field.$wrapper.html(
			'<div class="text-muted">No active monthly reflection questions are available right now.</div>',
		);
		return;
	}

	const cards = rows
		.map((row, idx) => {
			const requiredStar = row.is_required
				? '<span class="text-danger ms-1" style="font-weight:700;" title="Required">*</span>'
				: "";
			const inputId = `monthly-response-${idx}`;
			return `
				<div class="card border mb-3">
					<div class="card-body">
						<div class="d-flex align-items-center mb-2">
							<h6 class="mb-0">${frappe.utils.escape_html(row.question || `Question ${idx + 1}`)}</h6>
							${requiredStar}
						</div>
						${
							row.help_text
								? `<div class="text-muted mb-2" style="font-size:12px;">${frappe.utils.escape_html(row.help_text)}</div>`
								: ""
						}
						<div class="monthly-question-response-control" id="${inputId}" data-row-idx="${idx}"></div>
					</div>
				</div>
			`;
		})
		.join("");

	field.$wrapper.html(`<div class="monthly-questionnaire-ui">${cards}</div>`);
	field.$wrapper.find(".monthly-question-response-control").each(function () {
		const idx = Number(this.getAttribute("data-row-idx"));
		const row = (frm.doc.answers || [])[idx];
		if (!row) return;
		const fieldtype = row.response_fieldtype || "Text Editor";
		const control = frappe.ui.form.make_control({
			parent: $(this),
			df: {
				fieldtype,
				label: "",
				options: fieldtype === "Text Editor" ? "Minimal" : null,
				placeholder: "Type your response here...",
			},
			render_input: true,
			only_input: true,
		});
		control.set_value(row.response || "");
		frm._monthly_response_controls.push({ idx, control });
		const saveValue = () => {
			const value = control.get_value ? control.get_value() : "";
			frappe.model.set_value(row.doctype, row.name, "response", value || "");
		};
		control.$input && control.$input.on("input change", saveValue);
		control.$wrapper && control.$wrapper.on("input change", saveValue);
	});
}

function sync_questionnaire_ui_to_rows(frm) {
	const controls = frm._monthly_response_controls || [];
	controls.forEach(({ idx, control }) => {
		const row = (frm.doc.answers || [])[idx];
		if (!row || !control) return;
		const value = control.get_value ? control.get_value() : "";
		row.response = value || "";
	});
	frm.refresh_field("answers");
}
