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

			// If a template is attached, show Import Now button
			if (frm.doc && frm.doc.template_import) {
				frm.add_custom_button('Import Now', function () {
					frappe.msgprint({ title: 'Importing', message: 'Import in progress. This may take a moment...', indicator: 'blue' });
					frappe.call({
						method: 'corporate_services.icl_corporate_services.doctype.high_level_work_plan.high_level_work_plan.import_template',
						args: { docname: frm.doc.name },
						freeze: true,
						callback: function (r) {
							if (!r) return;
							if (r.exc) {
								frappe.msgprint({ title: 'Import Failed', message: (r.exc && r.exc.message) || 'Import failed.', indicator: 'red' });
								return;
							}
							let inserted = (r.message && r.message.inserted) || 0;
							const sample = (r.message && r.message.sample) || [];
							let msg = `${inserted} rows imported.`;
							if (sample.length) {
								msg += '\nSample: ' + sample.map(s => (s.line_item || '') + (s.key_deliverable ? ' - ' + s.key_deliverable : '')).join(' | ');
							}
							frappe.msgprint({ title: 'Import Completed', message: msg, indicator: 'green' });
							frm.reload_doc();
						}
					});
				});
			}

			// If a Google Drive link is present, show Fetch From Drive button
			if (frm.doc && frm.doc.google_drive_link_for_the_workplan) {
				frm.add_custom_button('Fetch From Drive', function () {
					frappe.msgprint({ title: 'Fetching', message: 'Fetching workplan from Google Drive. This may take a moment...', indicator: 'blue' });
					frappe.call({
						method: 'corporate_services.icl_corporate_services.doctype.high_level_work_plan.high_level_work_plan.fetch_workplan_from_drive',
						args: { docname: frm.doc.name },
						freeze: true,
						callback: function (r) {
							if (!r) return;
							if (r.exc) {
								frappe.msgprint({ title: 'Fetch Failed', message: (r.exc && r.exc.message) || 'Fetch failed.', indicator: 'red' });
								return;
							}
							let inserted = (r.message && r.message.inserted) || 0;
							const sample = (r.message && r.message.sample) || [];
							let msg = `${inserted} rows imported from Drive.`;
							if (sample.length) {
								msg += '\nSample: ' + sample.map(s => (s.line_item || '') + (s.key_deliverable ? ' - ' + s.key_deliverable : '')).join(' | ');
							}
							frappe.msgprint({ title: 'Fetch Completed', message: msg, indicator: 'green' });
							frm.reload_doc();
						}
					});
				});
			}
		}
	},
});
