// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

const DEFAULT_COMMENTS = [
	{ question: "Highlights of Performance", prompt: "What are the employee's most notable achievements, strengths, or contributions this period?" },
	{ question: "Key Development Needs", prompt: "Which areas require improvement, upskilling, or closer attention?" },
	{ question: "Behavioral Observations", prompt: "Any comments on attitude, collaboration, adaptability, or professionalism?" },
	{ question: "Readiness for Additional Responsibility", prompt: "Is the employee ready to take on more responsibility, leadership, or stretch assignments?" },
	{ question: "Support or Resources Needed", prompt: "What support (tools, training, mentorship) would help the employee perform even better?" },
];

const DEFAULT_SCORE_BANDS = [
	{ min_percentage: 93, percentage_label: "93% - 100%", rating: "Exceptional", recommended_action: "Eligible for promotion and up to 15% salary increase or bonus consideration." },
	{ min_percentage: 84, percentage_label: "84% - 92%", rating: "Strong Performer", recommended_action: "Eligible for up to 10% salary increase or bonus; consider for promotion." },
	{ min_percentage: 75, percentage_label: "75% - 83%", rating: "Consistently Effective", recommended_action: "Maintain role; encourage continued growth and skill development." },
	{ min_percentage: 65, percentage_label: "65% - 74%", rating: "Meets Expectation", recommended_action: "Acceptable performance; recommend moderate support or training." },
	{ min_percentage: 56, percentage_label: "56% - 64%", rating: "Below Expectation", recommended_action: "Initiate a 3-month Performance Improvement Plan (PIP)." },
	{ min_percentage: 47, percentage_label: "47% - 55%", rating: "Poor", recommended_action: "Issue formal warning; monitor closely for short-term improvement." },
	{ min_percentage: 0, percentage_label: "0% - 46%", rating: "Unacceptable", recommended_action: "Consider separation, reassignment, or other disciplinary measures." },
];

frappe.ui.form.on("Performance Appraisal Template", {
	refresh: function (frm) {
		if (frm.is_new() && (!frm.doc.rating_scale || frm.doc.rating_scale.length === 0)) {
			prefill_rating_scale(frm);
		}
		if (frm.is_new() && (!frm.doc.score_bands || frm.doc.score_bands.length === 0)) {
			DEFAULT_SCORE_BANDS.forEach(function (band) {
				let row = frappe.model.add_child(frm.doc, "Performance Appraisal Score Band", "score_bands");
				Object.assign(row, band);
			});
			frm.refresh_field("score_bands");
		}
		if (frm.is_new() && (!frm.doc.supervisor_comments || frm.doc.supervisor_comments.length === 0)) {
			DEFAULT_COMMENTS.forEach(function (c) {
				let row = frappe.model.add_child(frm.doc, "Performance Appraisal Comment", "supervisor_comments");
				Object.assign(row, c);
			});
			frm.refresh_field("supervisor_comments");
		}
	},
});

function prefill_rating_scale(frm) {
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Performance Appraisal Rating scale",
			name: "Performance Appraisal Rating scale",
		},
		callback: function (r) {
			let bands = r.message && r.message.table_rating_scale;
			if (!bands || !bands.length) return;

			bands.forEach(function (band) {
				let row = frappe.model.add_child(frm.doc, "Rating scale", "rating_scale");
				row.score = band.score;
				row.description = band.description;
			});
			frm.refresh_field("rating_scale");
		},
	});
}
