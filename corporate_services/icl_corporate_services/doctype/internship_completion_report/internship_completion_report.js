frappe.ui.form.on("Internship Completion Report", {
	onload(frm) {
		set_default_report_date(frm);
		ensure_active_template_and_questions(frm);
	},
	question_template(frm) {
		if (!frm.doc.question_template) return;
		populate_questions_from_template(frm);
	},
	refresh(frm) {
		render_questionnaire_ui(frm);
	},
	onload_post_render(frm) {
		render_questionnaire_ui(frm);
	},
	validate(frm) {
		sync_questionnaire_ui_to_rows(frm);
		validate_internship_dates(frm);
	},
});

function set_default_report_date(frm) {
	if (!frm.is_new()) return;
	if (frm.doc.date_of_report) return;
	frm.set_value("date_of_report", frappe.datetime.get_today());
}

function ensure_active_template_and_questions(frm, forceRefresh = false) {
	if ((frm.doc.answers || []).length && !forceRefresh) return;

	if (frm.doc.question_template && !forceRefresh) {
		populate_questions_from_template(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.internship_completion_report.internship_completion_report.get_active_template_questions",
		callback: (r) => {
			const payload = r.message || {};
			if (!payload.template_name) {
				frappe.msgprint(__("No active Internship Completion Report Template found. Please contact HR/System Admin."));
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

function validate_internship_dates(frm) {
	if (!frm.doc.internship_start_date || !frm.doc.internship_end_date) return;
	if (frm.doc.internship_end_date < frm.doc.internship_start_date) {
		frappe.throw(__("Internship End Date cannot be earlier than Internship Start Date."));
	}
}

function populate_questions_from_template(frm) {
	if ((frm.doc.answers || []).length && !frm.is_new()) {
		render_questionnaire_ui(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.internship_completion_report.internship_completion_report.get_active_template_questions",
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
				row.section_title = q.section_title || "";
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

	const rows = frm.doc.answers || [];
	if (!rows.length) {
		field.$wrapper.html(
			'<div class="text-muted">No active completion questions are available right now.</div>',
		);
		return;
	}

	let previousSection = null;
	const cards = rows
		.map((row, idx) => {
			const requiredStar = row.is_required
				? '<span class="text-danger ms-1" style="font-weight:700;" title="Required">*</span>'
				: "";
			const inputId = `completion-response-${idx}`;
			const sectionHeader =
				row.section_title && row.section_title !== previousSection
					? `<h5 class="mt-3 mb-2">${frappe.utils.escape_html(row.section_title)}</h5>`
					: "";
			previousSection = row.section_title || previousSection;

			return `
				${sectionHeader}
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
						<div class="completion-question-response-control" id="${inputId}" data-row-idx="${idx}"></div>
					</div>
				</div>
			`;
		})
		.join("");

	field.$wrapper.html(`<div class="completion-questionnaire-ui">${cards}</div>`);

	field.$wrapper.find(".completion-question-response-control").each(function () {
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
		const saveValue = () => {
			const value = control.get_value ? control.get_value() : "";
			frappe.model.set_value(row.doctype, row.name, "response", value || "");
		};
		const deferredSave = () => setTimeout(saveValue, 0);
		control.$input && control.$input.on("input change keyup blur paste", deferredSave);
		control.$wrapper && control.$wrapper.on("input change keyup blur paste", deferredSave);
		control.$wrapper && control.$wrapper.find(".ql-editor").on("input keyup blur paste", deferredSave);
	});
}

function sync_questionnaire_ui_to_rows(frm) {
	(frm.doc.answers || []).forEach((row) => {
		row.response = row.response || "";
	});
	frm.refresh_field("answers");
}
