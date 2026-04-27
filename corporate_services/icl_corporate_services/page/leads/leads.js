frappe.pages['leads'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Leads',
		single_column: true
	});

	// Toolbar: Refresh
	page.add_button(__('Refresh'), function() {
		load_leads();
	}, { icon: 'refresh' });

	// Toolbar: Status filter
	page.add_field({
		fieldtype: 'Select',
		fieldname: 'status_filter',
		label: __('Status'),
		options: '\nOpen\nReplied\nOpportunity\nConverted\nDo Not Contact\nJunk',
		change: function() { load_leads(); }
	});

	// Toolbar: Source filter
	page.add_field({
		fieldtype: 'Select',
		fieldname: 'source_filter',
		label: __('Source'),
		options: '\nCold Calling\nEmail\nExisting Customer\nPartner\nPublic Relations\nWeb Site\nCampaign\nWord Of Mouth\nOther',
		change: function() { load_leads(); }
	});

	// Minimal custom CSS
	$(`<style>
		.sort-th            { cursor: pointer; user-select: none; white-space: nowrap; }
		.sort-th:hover      { background-color: #e9ecef !important; }
		.sort-icon          { opacity: 0.4; font-size: 10px; margin-left: 3px; }
		.table-hover tbody tr { cursor: pointer; }
		.stat-top-blue      { border-top: 3px solid #0d6efd; }
		.stat-top-green     { border-top: 3px solid #198754; }
		.stat-top-amber     { border-top: 3px solid #ffc107; }
		.stat-top-teal      { border-top: 3px solid #0dcaf0; }
		.stat-value         { font-size: 2rem; font-weight: 700; line-height: 1; }
		.avatar-circle {
			width: 28px; height: 28px; border-radius: 50%;
			background: #0d6efd22; color: #0d6efd;
			font-size: 11px; font-weight: 700;
			display: inline-flex; align-items: center; justify-content: center;
		}
	</style>`).appendTo('head');

	// -- Page HTML ------------------------------------------------
	$(page.body).html(`
		<div class="container-fluid py-4">

			<!-- Stat Cards -->
			<div class="row g-3 mb-4">
				<div class="col-12 col-sm-6 col-xl-3">
					<div class="card h-100 shadow-sm stat-top-blue">
						<div class="card-body">
							<p class="text-muted text-uppercase fw-semibold small mb-1">Total Leads</p>
							<div class="stat-value text-dark" id="stat-total">-</div>
							<p class="text-muted small mb-0 mt-1">All records</p>
						</div>
					</div>
				</div>
				<div class="col-12 col-sm-6 col-xl-3">
					<div class="card h-100 shadow-sm stat-top-green">
						<div class="card-body">
							<p class="text-muted text-uppercase fw-semibold small mb-1">Open</p>
							<div class="stat-value text-dark" id="stat-open">-</div>
							<p class="text-muted small mb-0 mt-1">Active leads</p>
						</div>
					</div>
				</div>
				<div class="col-12 col-sm-6 col-xl-3">
					<div class="card h-100 shadow-sm stat-top-amber">
						<div class="card-body">
							<p class="text-muted text-uppercase fw-semibold small mb-1">Converted</p>
							<div class="stat-value text-dark" id="stat-converted">-</div>
							<p class="text-muted small mb-0 mt-1">Won leads</p>
						</div>
					</div>
				</div>
				<div class="col-12 col-sm-6 col-xl-3">
					<div class="card h-100 shadow-sm stat-top-teal">
						<div class="card-body">
							<p class="text-muted text-uppercase fw-semibold small mb-1">Opportunities</p>
							<div class="stat-value text-dark" id="stat-opportunity">-</div>
							<p class="text-muted small mb-0 mt-1">In pipeline</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Table Card -->
			<div class="card shadow-sm">
				<div class="card-header bg-light d-flex align-items-center justify-content-between flex-wrap gap-2 py-3">
					<div class="d-flex align-items-center gap-2">
						<h6 class="mb-0 fw-bold">Leads</h6>
						<span class="badge bg-secondary rounded-pill" id="leads-count">0</span>
					</div>
					<input
						type="text"
						id="leads-search"
						class="form-control form-control-sm"
						style="max-width: 240px;"
						placeholder="🔍 Search leads...">
				</div>
				<div class="card-body p-0" id="leads-table-container">
					<div class="text-center text-muted py-5">
						<div class="spinner-border spinner-border-sm me-2" role="status"></div>
						Loading leads...
					</div>
				</div>
			</div>

		</div>
	`);

	let all_data = [];

	// -- Status badge map -----------------------------------------
	const badge_map = {
		'Open':            'text-bg-primary',
		'Replied':         'text-bg-info',
		'Opportunity':     'text-bg-warning',
		'Converted':       'text-bg-success',
		'Do Not Contact':  'text-bg-dark',
		'Junk':            'text-bg-danger'
	};

	// -- Render Table ---------------------------------------------
	function render_table(data) {
		$('#leads-count').text(data.length);

		if (!data.length) {
			$('#leads-table-container').html(`
				<div class="text-center text-muted py-5">
					<div style="font-size:2.5rem;">📋</div>
					<p class="mt-2 mb-0">No leads found.</p>
				</div>
			`);
			return;
		}

		let rows = data.map(d => {
			let badge_cls = badge_map[d.status] || 'text-bg-secondary';
			let date = d.creation ? frappe.datetime.str_to_user(d.creation) : '-';
			let full_name = frappe.utils.escape_html(d.lead_name || '-');
			let initials = (d.lead_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

			return `
				<tr data-name="${d.name}">
					<td class="ps-3">
						<div class="d-flex align-items-center gap-2">
							<div class="avatar-circle">${initials}</div>
							<div>
								<div class="fw-semibold small">${full_name}</div>
								<div class="text-muted" style="font-size:11px;">${frappe.utils.escape_html(d.name)}</div>
							</div>
						</div>
					</td>
					<td>${frappe.utils.escape_html(d.company_name || '-')}</td>
					<td>
						${d.email_id
							? `<a href="mailto:${frappe.utils.escape_html(d.email_id)}" class="text-decoration-none small" onclick="event.stopPropagation()">${frappe.utils.escape_html(d.email_id)}</a>`
							: '<span class="text-muted">-</span>'}
					</td>
					<td>
						${d.mobile_no
							? `<a href="tel:${frappe.utils.escape_html(d.mobile_no)}" class="text-decoration-none small" onclick="event.stopPropagation()">${frappe.utils.escape_html(d.mobile_no)}</a>`
							: '<span class="text-muted">-</span>'}
					</td>
					<td><span class="badge rounded-pill ${badge_cls}">${frappe.utils.escape_html(d.status || '-')}</span></td>
					<td class="small">${frappe.utils.escape_html(d.source || '-')}</td>
					<td class="small">${frappe.utils.escape_html(d.lead_owner || '-')}</td>
					<td class="text-nowrap text-muted small">${date}</td>
				</tr>
			`;
		}).join('');

		$('#leads-table-container').html(`
			<div class="table-responsive">
				<table class="table table-hover table-sm align-middle mb-0 small">
					<thead class="table-light text-uppercase text-muted" style="font-size:11px; letter-spacing:0.04em;">
						<tr>
							<th class="sort-th ps-3">Lead <span class="sort-icon">↕</span></th>
							<th class="sort-th">Company <span class="sort-icon">↕</span></th>
							<th class="sort-th">Email <span class="sort-icon">↕</span></th>
							<th class="sort-th">Mobile <span class="sort-icon">↕</span></th>
							<th class="sort-th">Status <span class="sort-icon">↕</span></th>
							<th class="sort-th">Source <span class="sort-icon">↕</span></th>
							<th class="sort-th">Owner <span class="sort-icon">↕</span></th>
							<th class="sort-th">Created <span class="sort-icon">↕</span></th>
						</tr>
					</thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		`);

		// Row click → open Lead form
		$('#leads-table-container tbody tr').on('click', function() {
			frappe.set_route('Form', 'Lead', $(this).data('name'));
		});

		// Column sort
		const col_keys = [
			'lead_name','company_name','email_id','mobile_no',
			'status','source','lead_owner','creation'
		];

		$('#leads-table-container thead th.sort-th').on('click', function() {
			let key = col_keys[$(this).index()];
			let asc = $(this).data('sort') !== 'asc';
			$(this).data('sort', asc ? 'asc' : 'desc');

			let sorted = [...data].sort((a, b) => {
				let va = a[key] || '', vb = b[key] || '';
				return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
			});

			$('#leads-table-container .sort-icon').text('↕');
			$(this).find('.sort-icon').text(asc ? '↑' : '↓');
			render_table(sorted);
		});
	}

	// -- Update Stats ---------------------------------------------
	function update_stats(data) {
		$('#stat-total').text(data.length);
		$('#stat-open').text(data.filter(d => d.status === 'Open').length);
		$('#stat-converted').text(data.filter(d => d.status === 'Converted').length);
		$('#stat-opportunity').text(data.filter(d => d.status === 'Opportunity').length);
	}

	// -- Live Search ----------------------------------------------
	$(page.body).on('input', '#leads-search', function() {
		let q = $(this).val().toLowerCase();
		let filtered = all_data.filter(d =>
			(d.lead_name    || '').toLowerCase().includes(q) ||
			(d.company_name || '').toLowerCase().includes(q) ||
			(d.email_id     || '').toLowerCase().includes(q) ||
			(d.mobile_no    || '').toLowerCase().includes(q) ||
			(d.status       || '').toLowerCase().includes(q) ||
			(d.source       || '').toLowerCase().includes(q) ||
			(d.lead_owner   || '').toLowerCase().includes(q)
		);
		render_table(filtered);
	});

	// -- Fetch Data -----------------------------------------------
	function load_leads() {
		$('#leads-table-container').html(`
			<div class="text-center text-muted py-5">
				<div class="spinner-border spinner-border-sm me-2" role="status"></div>
				Loading leads...
			</div>
		`);

		let filters = {};
		let status = page.fields_dict.status_filter.get_value();
		let source = page.fields_dict.source_filter.get_value();
		if (status) filters['status'] = status;
		if (source) filters['source'] = source;

		frappe.call({
			method: 'frappe.client.get_list',
			args: {
				doctype: 'Lead',
				fields: [
					'name', 'lead_name', 'company_name', 'email_id',
					'mobile_no', 'status', 'source', 'lead_owner', 'creation'
				],
				filters: filters,
				limit: 500,
				order_by: 'creation desc'
			},
			callback: function(r) {
				if (r.exc) {
					$('#leads-table-container').html(`
						<div class="text-center text-danger py-5">
							<div style="font-size:2rem;">⚠️</div>
							<p class="mt-2 mb-0">Error loading data. Please try again.</p>
						</div>
					`);
					return;
				}

				all_data = r.message || [];
				update_stats(all_data);
				render_table(all_data);

				let q = $('#leads-search').val();
				if (q) $('#leads-search').trigger('input');
			}
		});
	}

	// Initial load
	load_leads();
};