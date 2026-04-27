frappe.pages['job-applications'].on_page_load = function(wrapper) {

	const page = frappe.ui.make_app_page({
		parent      : wrapper,
		title       : 'Job Applications',
		single_column: false
	});

	frappe.dom.set_style(`
		/* Table */
		#app-table thead th.sortable         { cursor: pointer; white-space: nowrap; }
		#app-table thead th.sort-asc::after  { content: ' ↑'; opacity: .5; }
		#app-table thead th.sort-desc::after { content: ' ↓'; opacity: .5; }
		#app-table tbody tr                  { cursor: pointer; }
		#app-table td                        { vertical-align: middle; }
		.stage-badge  { font-size: .7rem; padding: .25em .5em; letter-spacing: .03em; }
		.star-rating  { color: #f0ad4e; letter-spacing: 1px; font-size: .85rem; }

		/* Sidebar */
		.jod-sidebar-search {
			width: 100%; padding: 5px 8px;
			border: 1px solid var(--border-color);
			border-radius: 4px; font-size: 12px;
			margin-bottom: 8px;
			background: var(--control-bg);
			color: var(--text-color);
			outline: none;
		}
		.jod-sidebar-search:focus { border-color: var(--primary); }

		.jod-sidebar-item {
			display: block; padding: 7px 10px;
			border-radius: 5px; margin-bottom: 3px;
			cursor: pointer; font-size: 12px;
			color: var(--text-color);
			transition: background .12s;
			border: 1px solid transparent;
			text-decoration: none !important;
		}
		.jod-sidebar-item:hover {
			background: var(--fg-hover-color);
			text-decoration: none;
		}
		.jod-sidebar-item.active {
			background: var(--primary-light, #e8f4fd);
			border-color: var(--primary);
			color: var(--primary);
			font-weight: 600;
		}
		.jod-sidebar-item .sidebar-job-title {
			display: block;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.jod-sidebar-item .sidebar-job-meta {
			display: block; font-size: 11px;
			color: var(--text-muted); margin-top: 1px;
		}
		.jod-sidebar-count {
			font-size: 10px; padding: .15em .45em;
			border-radius: 10px; float: right;
			margin-top: 1px;
		}
		.jod-sidebar-section-title {
			font-size: 10px; font-weight: 600;
			text-transform: uppercase; letter-spacing: .06em;
			color: var(--text-muted); padding: 4px 2px;
			margin-bottom: 4px;
		}
		.jod-sidebar-loading {
			font-size: 12px; color: var(--text-muted);
			padding: 8px 2px;
		}

		/* Frequency chart */
		#app-freq-chart .card-header  { padding: .5rem 1rem; }
		#app-freq-chart-body          { min-height: 80px; }
	`);

	$(page.main).html(`
		<div class="container-fluid p-4">

			<!-- Job info banner -->
			<div id="job-info-banner" class="card mb-3" style="display:none;">
				<div class="card-body py-3">
					<div class="row">
						<div class="col-md-8" id="app-heading">
							<h5 class="mb-1">Loading…</h5>
						</div>
						<div class="col-md-4 text-md-right" id="app-meta"></div>
					</div>
				</div>
			</div>

			<!-- Application Frequency Chart -->
			<div id="app-freq-chart" class="card mb-3" style="display:none;">
				<div class="card-header d-flex justify-content-between align-items-center">
					<span class="font-weight-bold" style="font-size:.8rem;">
						<i class="fa fa-line-chart mr-1 text-muted"></i>
						Application Frequency
					</span>
					<small class="text-muted" id="app-freq-chart-label"></small>
				</div>
				<div class="card-body p-2" id="app-freq-chart-body">
					<div class="text-center text-muted py-3">
						<div class="spinner-border spinner-border-sm" role="status"></div>
					</div>
				</div>
			</div>

			<!-- Search + stage filter -->
			<div class="d-flex justify-content-between align-items-center mb-2 flex-wrap"
			     style="gap:8px;">
				<span class="text-muted font-weight-bold"
				      style="font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;">
					Applicants
				</span>
				<div class="d-flex" style="gap:8px;">
					<select id="stage-filter" class="form-control form-control-sm"
					        style="width:200px;">
						<option value="">All Stages</option>
						<option>APPLICATION RECEIVED</option>
						<option>HR SCREENING</option>
						<option>SHORTLISTED</option>
						<option>INTERVIEW SCHEDULED</option>
						<option>INTERVIEWED</option>
						<option>REFERENCE CHECK</option>
						<option>FINALIST</option>
						<option>OFFER_PREP</option>
						<option>OFFER SENT</option>
						<option>OFFER ACCEPTED</option>
						<option>OFFER DECLINED</option>
						<option>REJECTED EARLY</option>
						<option>REJECTED LATE</option>
						<option>WITHDRAWN</option>
					</select>
					<input id="app-search" type="text"
						class="form-control form-control-sm"
						style="width:200px;"
						placeholder="Search applicants…" />
				</div>
			</div>

			<!-- Table -->
			<div class="card">
				<div class="card-body p-0">
					<div id="app-loading" class="text-center text-muted py-5">
						<div class="spinner-border spinner-border-sm mr-2"
						     role="status"></div>
						Loading applications…
					</div>
					<div id="app-table-wrapper" style="display:none;">
						<table class="table table-hover mb-0" id="app-table">
							<thead class="thead-light">
								<tr>
									<th class="text-center" style="width:36px;">#</th>
									<th class="sortable" data-col="applicant_name">Applicant</th>
									<th class="sortable" data-col="custom_application_stage">Stage</th>
									<th class="sortable" data-col="status">Status</th>
									<th class="sortable" data-col="designation">Designation</th>
									<th class="sortable" data-col="email_id">Email</th>
									<th class="sortable" data-col="phone_number">Mobile</th>
									<th class="sortable" data-col="applicant_rating">Rating</th>
									<th class="sortable" data-col="creation">Applied On</th>
								</tr>
							</thead>
							<tbody id="app-table-body"></tbody>
						</table>
					</div>
					<div id="app-empty" class="text-center text-muted py-5"
					     style="display:none;">
						<i class="fa fa-inbox fa-2x d-block mb-2"></i>
						No applications found for this job opening.
					</div>
					<div id="app-no-context" class="text-center text-muted py-5"
					     style="display:none;">
						<i class="fa fa-exclamation-circle fa-2x d-block mb-2"></i>
						No job selected. Please go back to the
						<a href="#" class="text-primary" id="back-link">
							Job Opening Dashboard
						</a>
						or pick a job from the sidebar.
					</div>
				</div>
			</div>
			<p class="text-muted small mt-2" id="app-count-info"></p>

		</div>
	`);

	// - Sidebar HTML
	$(page.sidebar).html(`
		<div style="padding: 12px 8px;">
			<div class="jod-sidebar-section-title">
				<i class="fa fa-briefcase mr-1"></i> Job Openings
			</div>
			<input type="text" id="sidebar-search"
				class="jod-sidebar-search"
				placeholder="Filter jobs…" />
			<div id="sidebar-jobs-list">
				<div class="jod-sidebar-loading">
					<div class="spinner-border spinner-border-sm mr-1"
					     role="status"></div>
					Loading…
				</div>
			</div>
		</div>
	`);

	// Toolbar
	page.add_button(__('← Dashboard'), function() {
		frappe.set_route('job-opening-dashboard');
	});
	page.add_button(__('Refresh'), function() {
		frappe.pages['job-applications'].on_page_show(wrapper);
	}, { icon: 'refresh' });

	$(document).on('click', '#back-link', function(e) {
		e.preventDefault();
		frappe.set_route('job-opening-dashboard');
	});

	const state = {
		all_apps    : [],
		all_jobs    : [],  
		job_counts  : {},  
		active_job  : null,
		sort_col    : 'creation',
		sort_order  : 'desc'
	};

	const search_fields = ['applicant_name','status','email_id',
	                       'phone_number','custom_application_stage','designation'];

	function load_sidebar_jobs() {
		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Job Opening',
				fields : ['name','job_title','status','department'],
				limit_page_length: 500,
				order_by: 'posted_on desc'
			},
			callback: function(r) {
				state.all_jobs = r.message || [];
				render_sidebar(state.all_jobs);
				state.all_jobs.forEach(function(job) {
					frappe.call({
						method : 'frappe.client.get_count',
						args   : {
							doctype : 'Job Applicant',
							filters : [['Job Applicant','job_title','=', job.name]]
						},
						callback: function(res) {
							state.job_counts[job.name] = res.message || 0;
							const $badge = $('#sidebar-count-'
								+ job.name.replace(/[^a-zA-Z0-9]/g,'_'));
							$badge.text(state.job_counts[job.name]);
							$badge.toggleClass('badge-primary', state.job_counts[job.name] > 0);
							$badge.toggleClass('badge-secondary', !state.job_counts[job.name]);
						}
					});
				});
			}
		});
	}

	function render_sidebar(jobs) {
		const $list = $('#sidebar-jobs-list').empty();

		if (!jobs.length) {
			$list.html('<div class="jod-sidebar-loading">No jobs found.</div>');
			return;
		}

		jobs.forEach(function(job) {
			const count     = state.job_counts[job.name];
			const count_id  = 'sidebar-count-' + job.name.replace(/[^a-zA-Z0-9]/g,'_');
			const is_active = job.name === state.active_job;
			const status_dot = job.status === 'Open'
				? '<span style="color:#28a745;">●</span> '
				: '<span style="color:#aaa;">●</span> ';

			$list.append(
				'<a class="jod-sidebar-item' + (is_active ? ' active' : '') + '"'
				+ '   data-job="' + frappe.utils.escape_html(job.name) + '"'
				+ '   data-title="' + frappe.utils.escape_html(job.job_title || '') + '">'
				+ '<span class="badge jod-sidebar-count '
				+   (count > 0 ? 'badge-primary' : 'badge-secondary') + '"'
				+   ' id="' + count_id + '">'
				+   (count !== undefined ? count : '…')
				+ '</span>'
				+ status_dot
				+ '<span class="sidebar-job-title">'
				+   frappe.utils.escape_html(job.job_title || job.name)
				+ '</span>'
				+ (job.department
					? '<span class="sidebar-job-meta">'
					  + frappe.utils.escape_html(job.department) + '</span>'
					: '')
				+ '</a>'
			);
		});
	}

	$(document).on('input', '#sidebar-search', function() {
		const q = $(this).val().toLowerCase().trim();
		const filtered = q
			? state.all_jobs.filter(j =>
				(j.job_title  || '').toLowerCase().includes(q) ||
				(j.department || '').toLowerCase().includes(q))
			: state.all_jobs;
		render_sidebar(filtered);
	});

	$(document).on('click', '.jod-sidebar-item', function() {
		const job_opening = $(this).data('job');
		const job_title   = $(this).data('title');
		if (!job_opening || job_opening === state.active_job) return;

		// Update hash + active state, then load
		const hash = 'job_opening=' + encodeURIComponent(job_opening)
		           + '&job_title='  + encodeURIComponent(job_title);
		window.history.replaceState(null, '', window.location.pathname + '#' + hash);

		state.active_job = job_opening;
		$('.jod-sidebar-item').removeClass('active');
		$(this).addClass('active');

		wrapper._load_applications(job_opening, job_title || job_opening);
	});

	function stars(rating) {
		if (!rating) return '<span class="text-muted">-</span>';
		const filled = Math.round(rating * 5);
		return '<span class="star-rating">'
			+ '★'.repeat(filled) + '☆'.repeat(5 - filled)
			+ '</span>';
	}

	function status_badge(status) {
		if (!status) return 'badge-secondary';
		switch (status.toLowerCase()) {
			case 'open':     return 'badge-primary';
			case 'accepted': return 'badge-success';
			case 'rejected': return 'badge-danger';
			case 'replied':  return 'badge-info';
			case 'hold':     return 'badge-warning';
			default:         return 'badge-secondary';
		}
	}

	function stage_badge(stage) {
		if (!stage) return '<span class="text-muted">-</span>';
		const positive = ['SHORTLISTED','FINALIST','OFFER ACCEPTED','OFFER SENT',
		                  'OFFER_PREP','INTERVIEWED','REFERENCE CHECK',
		                  'INTERVIEW SCHEDULED'];
		const negative = ['REJECTED EARLY','REJECTED LATE','OFFER DECLINED','WITHDRAWN'];
		const neutral  = ['APPLICATION RECEIVED','HR SCREENING'];
		let cls = 'badge-secondary';
		if (positive.includes(stage))      cls = 'badge-success';
		else if (negative.includes(stage)) cls = 'badge-danger';
		else if (neutral.includes(stage))  cls = 'badge-info';
		return '<span class="badge stage-badge ' + cls + '">'
			+ frappe.utils.escape_html(stage) + '</span>';
	}

	function render(apps) {
		const $tbody = $('#app-table-body').empty();

		if (!apps.length) {
			$('#app-table-wrapper').hide();
			$('#app-empty').show();
			$('#app-count-info').text('');
			return;
		}

		$('#app-empty').hide();
		$('#app-table-wrapper').show();

		apps.forEach(function(app, idx) {
			const date = app.creation
				? frappe.datetime.str_to_user(app.creation) : '-';

			$tbody.append(
				'<tr data-name="' + frappe.utils.escape_html(app.name) + '">'

				+ '<td class="text-center text-muted small">' + (idx + 1) + '</td>'

				+ '<td>'
				+   '<div class="font-weight-medium">'
				+     frappe.utils.escape_html(app.applicant_name || '-')
				+   '</div>'
				+   (app.custom_role
					? '<small class="text-muted">'
					  + frappe.utils.escape_html(app.custom_role) + '</small>'
					: '')
				+ '</td>'

				// Stage
				+ '<td>' + stage_badge(app.custom_application_stage) + '</td>'

				// Status
				+ '<td><span class="badge ' + status_badge(app.status) + '">'
				+   frappe.utils.escape_html(app.status || '-') + '</span></td>'

				// Designation
				+ '<td>' + frappe.utils.escape_html(app.designation || '-') + '</td>'

				// Email
				+ '<td>'
				+   (app.email_id
					? '<a href="mailto:' + frappe.utils.escape_html(app.email_id)
					  + '" class="text-muted">'
					  + frappe.utils.escape_html(app.email_id) + '</a>'
					: '-')
				+ '</td>'

				// Phone
				+ '<td>' + frappe.utils.escape_html(app.phone_number || '-') + '</td>'

				// Rating
				+ '<td>' + stars(app.applicant_rating) + '</td>'

				// Applied On
				+ '<td><small>' + date + '</small></td>'

				+ '</tr>'
			);
		});

		$('#app-count-info').text(
			'Showing ' + apps.length + ' of ' + state.all_apps.length
			+ ' applicant' + (state.all_apps.length !== 1 ? 's' : '')
		);
	}

	function apply_filters() {
		const q     = $('#app-search').val().toLowerCase().trim();
		const stage = $('#stage-filter').val();
		let filtered = state.all_apps;
		if (q)     filtered = filtered.filter(a => {
			return search_fields.some(k => (a[k] || '').toLowerCase().includes(q));
		});
		if (stage) filtered = filtered.filter(a =>
			a.custom_application_stage === stage);
		render(filtered);
	}

	$(document).on('input',  '#app-search',   apply_filters);
	$(document).on('change', '#stage-filter', apply_filters);

	$(document).on('click', '#app-table thead th.sortable', function() {
		const col = $(this).data('col');
		state.sort_order = (state.sort_col === col && state.sort_order === 'asc')
			? 'desc' : 'asc';
		state.sort_col = col;
		$('#app-table thead th').removeClass('sort-asc sort-desc');
		$(this).addClass('sort-' + state.sort_order);
		state.all_apps.sort(function(a, b) {
			const vA = (a[col] || '').toString().toLowerCase();
			const vB = (b[col] || '').toString().toLowerCase();
			return state.sort_order === 'asc'
				? (vA < vB ? -1 : vA > vB ? 1 : 0)
				: (vA > vB ? -1 : vA < vB ? 1 : 0);
		});
		apply_filters();
	});

	$(document).on('click', '#app-table tbody tr', function(e) {
		if ($(e.target).closest('a').length) return;
		frappe.set_route('Form', 'Job Applicant', $(this).data('name'));
	});

	function load_frequency_chart(job_opening, job_title) {
		const $body  = $('#app-freq-chart-body');
		const $card  = $('#app-freq-chart');
		const $label = $('#app-freq-chart-label');

		$card.show();
		$label.text('');
		$body.html(
			'<div class="text-center text-muted py-3">'
			+ '<div class="spinner-border spinner-border-sm" role="status"></div>'
			+ '</div>'
		);

		// Fetch the Dashboard Chart document to get config
		frappe.call({
			method: 'frappe.client.get',
			args  : { doctype: 'Dashboard Chart', name: 'Job Application Frequency' },
			callback: function(r) {
				if (!r.message) {
					$body.html('<div class="text-muted small p-3">Chart not found.</div>');
					return;
				}
				const chart_doc = r.message;

				// Inject a filter for the current job opening so the chart
				// shows frequency only for this job, not all applicants
				const filters = JSON.stringify([
					['Job Applicant', 'job_title', '=', job_opening]
				]);

				frappe.call({
					method: 'frappe.desk.doctype.dashboard_chart.dashboard_chart.get',
					args  : {
						chart_name : chart_doc.name,
						filters    : filters,
						refresh    : 1
					},
					callback: function(res) {
						if (!res.message || !res.message.labels || !res.message.labels.length) {
							$body.html(
								'<div class="text-muted small p-3 text-center">'
								+ 'No frequency data for this job opening yet.</div>'
							);
							return;
						}

						const data     = res.message;
						const labels   = data.labels   || [];
						const datasets = data.datasets || [];

						$label.text(chart_doc.time_interval + ' · ' + chart_doc.timespan);
						$body.empty();

						try {
							new frappe.Chart('#app-freq-chart-body', {
								title  : '',
								data   : { labels: labels, datasets: datasets },
								type   : 'line',
								height : 220,
								colors : ['#2490ef'],
								lineOptions : { regionFill: 1, hideDots: 0 },
								axisOptions : { xIsSeries: 1 }
							});
						} catch(e) {
							const values = (datasets[0] && datasets[0].values) || [];
							const max    = Math.max.apply(null, values) || 1;
							let html = '<div class="p-3">';
							labels.forEach(function(lbl, i) {
								const val = values[i] || 0;
								const pct = Math.round((val / max) * 100);
								html += '<div class="mb-2">'
									+ '<div class="d-flex justify-content-between mb-1">'
									+   '<small>' + frappe.utils.escape_html(lbl) + '</small>'
									+   '<small class="font-weight-bold">' + val + '</small>'
									+ '</div>'
									+ '<div class="progress" style="height:6px;">'
									+   '<div class="progress-bar" style="width:' + pct + '%"></div>'
									+ '</div></div>';
							});
							html += '</div>';
							$body.html(html);
						}
					},
					error: function() {
						$body.html('<div class="alert alert-danger m-3">Failed to load chart data.</div>');
					}
				});
			},
			error: function() {
				$body.html('<div class="alert alert-danger m-3">Failed to load chart.</div>');
			}
		});
	}

	wrapper._load_applications = function(job_opening, job_title) {
		state.active_job  = job_opening;
		state.all_apps    = [];

		$('#app-search').val('');
		$('#stage-filter').val('');
		$('#app-loading').show();
		$('#app-table-wrapper').hide();
		$('#app-empty').hide();
		$('#app-no-context').hide();
		$('#app-count-info').text('');
		$('#job-info-banner').hide();

		$('#app-heading').html(
			'<h5 class="mb-1">'
			+ '<i class="fa fa-users mr-2 text-muted"></i>'
			+ 'Applications for '
			+ '<a href="/app/job-opening/' + encodeURIComponent(job_opening)
			+ '" class="text-primary font-weight-bold">'
			+ frappe.utils.escape_html(job_title) + '</a>'
			+ '</h5>'
			+ '<small class="text-muted">Click a row to open the applicant record</small>'
		);

		$('.jod-sidebar-item').removeClass('active');
		$('.jod-sidebar-item[data-job="' + job_opening + '"]').addClass('active');

		load_frequency_chart(job_opening, job_title);

		frappe.call({
			method: 'frappe.client.get',
			args  : { doctype: 'Job Opening', name: job_opening },
			callback: function(r) {
				if (!r.message) return;
				const jo = r.message;
				$('#app-meta').html(
					'<span class="badge badge-'
					+ (jo.status === 'Open' ? 'success' : 'secondary') + ' mr-1">'
					+ frappe.utils.escape_html(jo.status || '') + '</span>'
					+ (jo.department
						? '<span class="badge badge-light border mr-1">'
						  + frappe.utils.escape_html(jo.department) + '</span>'
						: '')
					+ (jo.custom_work_mode
						? '<span class="badge badge-info mr-1">'
						  + frappe.utils.escape_html(jo.custom_work_mode) + '</span>'
						: '')
					+ (jo.location
						? '<span class="text-muted small">'
						  + '<i class="fa fa-map-marker mr-1"></i>'
						  + frappe.utils.escape_html(jo.location) + '</span>'
						: '')
				);
				$('#job-info-banner').show();
			}
		});

		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Job Applicant',
				fields: [
					'name','applicant_name','status','creation',
					'email_id','phone_number','job_title',
					'custom_application_stage','custom_role',
					'designation','applicant_rating'
				],
				filters : [['Job Applicant','job_title','=', job_opening]],
				limit_page_length: 500,
				order_by: 'creation desc'
			},
			callback: function(r) {
				$('#app-loading').hide();
				state.all_apps = r.message || [];
				state.all_apps.length
					? render(state.all_apps)
					: $('#app-empty').show();
			},
			error: function(err) {
				$('#app-loading').html(
					'<div class="alert alert-danger m-3">'
					+ 'Failed to load applications.</div>'
				);
				console.error('Job Applicant fetch error:', err);
			}
		});
	};

	load_sidebar_jobs();
};


frappe.pages['job-applications'].on_page_show = function(wrapper) {
	const opts = frappe.route_options || {};
	frappe.route_options = {};

	let job_opening = opts.job_opening || null;
	let job_title   = opts.job_title   || '';

	if (job_opening) {
		// Store in hash so refresh works
		const hash = 'job_opening=' + encodeURIComponent(job_opening)
		           + '&job_title='  + encodeURIComponent(job_title);
		window.history.replaceState(null, '', window.location.pathname + '#' + hash);
	} else {
		const hash = (window.location.hash || '').replace(/^#/, '');
		if (hash) {
			const params = {};
			hash.split('&').forEach(function(part) {
				const kv = part.split('=');
				if (kv.length === 2) {
					params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
				}
			});
			job_opening = params['job_opening'] || null;
			job_title   = params['job_title']   || '';
		}
	}

	const page = wrapper.page;

	if (!job_opening) {
		page.set_title('Job Applications');
		$('#app-loading').hide();
		$('#app-table-wrapper').hide();
		$('#app-empty').hide();
		$('#app-no-context').show();
		$('#job-info-banner').hide();
		$('#app-heading').html(
			'<h5 class="mb-0 text-muted">'
			+ 'Select a job from the sidebar to get started'
			+ '</h5>'
		);
		return;
	}

	page.set_title('Applications - ' + (job_title || job_opening));
	if (wrapper._load_applications) {
		wrapper._load_applications(job_opening, job_title || job_opening);
	}
};