// Copyright (c) 2026, IntelliSOFT Consulting and contributors
// For license information, please see license.txt

frappe.ui.form.on("High Level Work Plan", {
	refresh(frm) {
		if (frm.doc && frm.doc.entry_type === 'Template Import') {
			frm.add_custom_button("Download Template", async function () {
				if (!frm.doc || !frm.doc.project_name) {
					frappe.msgprint({
						title: "Project Required",
						message: "Project Name is required to download the template.",
						indicator: "orange",
					});
					return;
				}

				// Find a Project Toolkit Document Template that targets this doctype
				try {
					const resp = await frappe.call({
						method: 'frappe.client.get_list',
						args: {
							doctype: 'Project Toolkit Document Templates',
							filters: [
								['target_doctype', '=', 'High Level Work Plan'],
								['attach_doctype', '=', 1],
								['is_active', '=', 1],
							],
							fields: ['name', 'attachment'],
							limit_page_length: 1,
						},
						async: false,
					});

					const tpl = (resp?.message ?? [])[0] ?? null;
					if (tpl && tpl.attachment) {
						const url = tpl.attachment.startsWith('/') ? tpl.attachment : '/files/' + tpl.attachment;
						window.open(url, '_blank', 'noreferrer');
						// todo - Download the file instead of opening in a new tab.
						// Add a link to the google drive file for this template.
						return;
					}
				} catch (e) {
					// continue to api fallback
				}

				// Backend API fallback
				try {
					const apiUrl = '/api/project/project_work_plan/high_level?project_name=' + encodeURIComponent(frm.doc.project_name);
					const r = await fetch(apiUrl, { credentials: 'same-origin' });
					if (!r.ok) throw new Error('Template not available from API');

					const contentType = r.headers.get('content-type') || '';
					if (contentType.includes('application/json')) {
						const j = await r.json();
						if (j?.file_url) {
							window.open(j.file_url, '_blank', 'noreferrer');
							return;
						}
						if (j?.file) {
							const blob = new Blob([j.file], { type: 'application/octet-stream' });
							const url = window.URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = j.filename || 'high_level_work_plan_template';
							document.body.appendChild(a);
							a.click();
							a.remove();
							window.URL.revokeObjectURL(url);
							return;
						}
					} else {
						const blob = await r.blob();
						const url = window.URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = 'high_level_work_plan_template';
						document.body.appendChild(a);
						a.click();
						a.remove();
						window.URL.revokeObjectURL(url);
						return;
					}

					frappe.msgprint({ title: 'Download Failed', message: 'Template could not be downloaded.', indicator: 'red' });
				} catch (e) {
					frappe.msgprint({ title: 'Download Failed', message: e?.message || 'Could not download template.', indicator: 'red' });
				}
			});
		}
	},
});
