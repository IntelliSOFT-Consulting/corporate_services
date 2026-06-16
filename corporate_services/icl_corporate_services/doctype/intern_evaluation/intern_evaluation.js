// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

const DEFAULT_SELECT_OPTIONS = ["Excellent", "Good", "Average", "Needs improvement"];

frappe.ui.form.on("Intern Evaluation", {
	onload(frm) {
		ensure_active_template_and_questions(frm);
	},

	question_template(frm) {
		if (!frm.doc.question_template) return;
		populate_questions_from_template(frm);
	},

	refresh(frm) {
		render_characteristics_ui(frm);
	},

	onload_post_render(frm) {
		render_characteristics_ui(frm);
	},

	validate(frm) {
		sync_characteristics_ui_to_rows(frm);
		validate_required_ratings(frm);
	},
});

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
			"corporate_services.icl_corporate_services.doctype.intern_evaluation.intern_evaluation.get_active_template_questions",
		callback: (r) => {
			const payload = r.message || {};
			if (!payload.template_name) {
				frappe.msgprint(__("No active Intern Evaluation Template found. Please contact HR/System Admin."));
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
		render_characteristics_ui(frm);
		return;
	}

	frappe.call({
		method:
			"corporate_services.icl_corporate_services.doctype.intern_evaluation.intern_evaluation.get_active_template_questions",
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
				existing[row.question] = { rating: row.rating, comment: row.comment };
				existing[strip_number_prefix(row.question)] = { rating: row.rating, comment: row.comment };
			});

			frm.clear_table("answers");
			questions.forEach((q, idx) => {
				const numberedQuestion = `${idx + 1}. ${q.question_text}`;
				const row = frm.add_child("answers");
				const prev = existing[numberedQuestion] || existing[q.question_text] || {};
				row.question = numberedQuestion;
				row.help_text = q.help_text;
				row.is_required = q.is_required;
				row.response_fieldtype = q.response_fieldtype || "Select";
				row.response_options = q.response_options || "";
				row.rating = prev.rating || "";
				row.comment = prev.comment || "";
			});
			frm.refresh_field("answers");
			render_characteristics_ui(frm);
		},
	});
}

function strip_number_prefix(text) {
	return (text || "").replace(/^\s*\d+\.\s*/, "").trim();
}

function render_characteristics_ui(frm) {
	const field = frm.get_field("response_ui");
	if (!field || !field.$wrapper) return;
	const rows = frm.doc.answers || [];

	if (!rows.length) {
		field.$wrapper.html('<div class="text-muted">No active characteristics are available right now.</div>');
		return;
	}

	const cards = rows
		.map((row, idx) => {
			const requiredStar = row.is_required
				? '<span class="text-danger ms-1" style="font-weight:700;" title="Required">*</span>'
				: "";
			const options = getOptionsForRow(row);
			const ratingOptionsHtml = options.map((opt) => {
				const selected = row.rating === opt ? "selected" : "";
				return `<option value="${frappe.utils.escape_html(opt)}" ${selected}>${frappe.utils.escape_html(opt)}</option>`;
			}).join("");
			const isSelect = (row.response_fieldtype || "Select") === "Select";
			const ratingControlHtml = isSelect
				? `
					<label class="form-label">Rating</label>
					<select class="form-control intern-rating" data-row-idx="${idx}">
						<option value=""></option>
						${ratingOptionsHtml}
					</select>
				`
				: `
					<label class="form-label">Response</label>
					<input type="text" class="form-control intern-rating" data-row-idx="${idx}" value="${frappe.utils.escape_html(row.rating || "")}" />
				`;

			return `
				<div class="card border mb-3">
					<div class="card-body">
						<div class="d-flex align-items-center mb-2">
							<h6 class="mb-0">${frappe.utils.escape_html(row.question || `Characteristic ${idx + 1}`)}</h6>
							${requiredStar}
						</div>
						${
							row.help_text
								? `<div class="text-muted mb-2" style="font-size:12px;">${frappe.utils.escape_html(row.help_text)}</div>`
								: ""
						}
						<div class="row">
							<div class="col-md-4 mb-2">
								${ratingControlHtml}
							</div>
							<div class="col-md-8 mb-2">
								<label class="form-label">Comment</label>
								<textarea class="form-control intern-comment" rows="2" data-row-idx="${idx}" placeholder="Add a brief comment...">${frappe.utils.escape_html(row.comment || "")}</textarea>
							</div>
						</div>
					</div>
				</div>
			`;
		})
		.join("");

	field.$wrapper.html(`<div class="intern-characteristics-ui">${cards}</div>`);

	field.$wrapper.find(".intern-rating").on("change", function () {
		const idx = Number(this.getAttribute("data-row-idx"));
		const row = (frm.doc.answers || [])[idx];
		if (!row) return;
		frappe.model.set_value(row.doctype, row.name, "rating", this.value || "");
	});

	field.$wrapper.find(".intern-comment").on("input blur change", function () {
		const idx = Number(this.getAttribute("data-row-idx"));
		const row = (frm.doc.answers || [])[idx];
		if (!row) return;
		frappe.model.set_value(row.doctype, row.name, "comment", this.value || "");
	});
}

function sync_characteristics_ui_to_rows(frm) {
	(frm.doc.answers || []).forEach((row) => {
		row.rating = row.rating || "";
		row.comment = row.comment || "";
	});
	frm.refresh_field("answers");
}

function getOptionsForRow(row) {
	const raw = (row.response_options || "").trim();
	if (!raw) return DEFAULT_SELECT_OPTIONS;
	const parsed = raw
		.split("\n")
		.map((x) => x.trim())
		.filter(Boolean);
	return parsed.length ? parsed : DEFAULT_SELECT_OPTIONS;
}

function validate_required_ratings(frm) {
	const missing = (frm.doc.answers || [])
		.filter((row) => row.is_required && !row.rating)
		.map((row, idx) => `${idx + 1}. ${row.question || "Characteristic"}`);

	if (missing.length) {
		frappe.throw(
			__("Please rate all required characteristics before saving/submitting:<br>{0}", [
				missing.join("<br>"),
			]),
		);
	}
}
