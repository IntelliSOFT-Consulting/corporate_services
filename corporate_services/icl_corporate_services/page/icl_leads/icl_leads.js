frappe.pages["icl-leads"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "ICL Leads",
    single_column: false,
  });

  // ── Add refresh button to page toolbar ──────────────────────────────────
  page.add_button(__("Refresh"), () => loadDashboard(), { icon: "refresh" });

  // ── Inject skeleton HTML ─────────────────────────────────────────────────
  $(page.main).html(`
    <div class="container-fluid p-4" id="icl-leads-dashboard">

      <!-- ── Summary Cards ─────────────────────────────────────────────── -->
      <div class="row mb-4" id="icl-stat-cards">

        <div class="col-xl col-md-4 col-sm-6 mb-3">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body d-flex align-items-center">
              <div class="me-3">
                <span class="avatar avatar-medium bg-blue-light rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                    viewBox="0 0 24 24" stroke="var(--blue)" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 10-8 0 4 4 0 008 0zm6 0a3 3 0 100-6 3 3 0 000 6z"/>
                  </svg>
                </span>
              </div>
              <div>
                <div class="text-muted small mb-1">Total Leads</div>
                <div class="h4 mb-0 font-weight-bold text-dark" id="stat-total-leads">
                  <span class="skeleton-box" style="width:50px;height:28px;display:inline-block;border-radius:4px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl col-md-4 col-sm-6 mb-3">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body d-flex align-items-center">
              <div class="me-3">
                <span class="avatar avatar-medium bg-purple-light rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                    viewBox="0 0 24 24" stroke="var(--purple)" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M3 7h18M3 12h18M3 17h18"/>
                  </svg>
                </span>
              </div>
              <div>
                <div class="text-muted small mb-1">Total Opportunities Linked</div>
                <div class="h4 mb-0 font-weight-bold text-dark" id="stat-total-opportunities">
                  <span class="skeleton-box" style="width:50px;height:28px;display:inline-block;border-radius:4px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl col-md-4 col-sm-6 mb-3">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body d-flex align-items-center">
              <div class="me-3">
                <span class="avatar avatar-medium bg-green-light rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                    viewBox="0 0 24 24" stroke="var(--green)" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
              </div>
              <div>
                <div class="text-muted small mb-1">Active Leads</div>
                <div class="h4 mb-0 font-weight-bold text-dark" id="stat-active-leads">
                  <span class="skeleton-box" style="width:50px;height:28px;display:inline-block;border-radius:4px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl col-md-4 col-sm-6 mb-3">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body d-flex align-items-center">
              <div class="me-3">
                <span class="avatar avatar-medium bg-yellow-light rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                    viewBox="0 0 24 24" stroke="var(--yellow-600)" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </span>
              </div>
              <div>
                <div class="text-muted small mb-1">Leads with Active Opportunities</div>
                <div class="h4 mb-0 font-weight-bold text-dark" id="stat-leads-active-opps">
                  <span class="skeleton-box" style="width:50px;height:28px;display:inline-block;border-radius:4px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl col-md-4 col-sm-6 mb-3">
          <div class="card h-100 shadow-sm border-0">
            <div class="card-body d-flex align-items-center">
              <div class="me-3">
                <span class="avatar avatar-medium bg-red-light rounded">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                    viewBox="0 0 24 24" stroke="var(--red)" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 17v-6m4 6V7m4 10v-3"/>
                  </svg>
                </span>
              </div>
              <div>
                <div class="text-muted small mb-1">Active Opportunities (Linked)</div>
                <div class="h4 mb-0 font-weight-bold text-dark" id="stat-active-linked-opps">
                  <span class="skeleton-box" style="width:50px;height:28px;display:inline-block;border-radius:4px;"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /.row#icl-stat-cards -->

      <div class="row g-3">
        <!-- ── Main Content: Charts + Table ────────────────────────────── -->
        <div class="col-12">
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <div class="card shadow-sm border-0">
                <div class="card-header bg-white border-bottom">
                  <h6 class="mb-0 font-weight-bold">Top Clients by Leads</h6>
                </div>
                <div class="card-body" id="icl-client-leads-chart"></div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card shadow-sm border-0">
                <div class="card-header bg-white border-bottom">
                  <h6 class="mb-0 font-weight-bold">Top Clients by Linked Opportunities</h6>
                </div>
                <div class="card-body" id="icl-client-opps-chart"></div>
              </div>
            </div>
          </div>

          <!-- ── Leads Table ───────────────────────────────────────────── -->
          <div class="card shadow-sm border-0">
            <div class="card-header d-flex justify-content-between align-items-center bg-white border-bottom">
              <h6 class="mb-0 font-weight-bold">All Leads</h6>
              <div class="d-flex align-items-center gap-2">
                <input
                  id="icl-lead-search"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Search leads…"
                  style="width:220px;"
                />
              </div>
            </div>
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0" id="icl-leads-table">
                  <thead class="thead-light">
                    <tr>
                      <th class="text-muted small font-weight-semibold">#</th>
                      <th class="text-muted small font-weight-semibold">Lead Name</th>
                      <th class="text-muted small font-weight-semibold">Company</th>
                      <th class="text-muted small font-weight-semibold">Status</th>
                      <th class="text-muted small font-weight-semibold">Source</th>
                      <th class="text-muted small font-weight-semibold">Mobile</th>
                      <th class="text-muted small font-weight-semibold">Email</th>
                      <th class="text-muted small font-weight-semibold">Linked Opportunities</th>
                      <th class="text-muted small font-weight-semibold">Owner</th>
                      <th class="text-muted small font-weight-semibold">Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="icl-leads-tbody">
                    <tr>
                      <td colspan="11" class="text-center py-5 text-muted">
                        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                        Loading leads…
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <!-- Pagination footer -->
            <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center" id="icl-pagination-bar" style="display:none!important;">
              <span class="text-muted small" id="icl-page-info"></span>
              <div class="btn-group btn-group-sm" id="icl-page-buttons"></div>
            </div>
          </div><!-- /.card -->
        </div>
      </div>

    </div><!-- /.container-fluid -->
  `);

  // ── Use default Frappe aside (same placement style as Opportunity module)
  $(page.sidebar).empty().append(`
    <div class="card shadow-sm border-0 icl-sticky-card">
      <div class="card-header bg-white border-bottom">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0 font-weight-bold">Leads Sidebar</h6>
          <button class="btn btn-xs btn-default" id="icl-sidebar-clear" style="display:none;">Clear</button>
        </div>
        <input
          id="icl-sidebar-search"
          type="text"
          class="form-control form-control-sm"
          placeholder="Find lead…"
        />
      </div>
      <div class="card-body p-0">
        <div id="icl-sidebar-list" class="icl-sidebar-list">
          <div class="text-center py-4 text-muted">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            Loading leads…
          </div>
        </div>
      </div>
    </div>
  `);

  // ── Inline styles (skeleton loader + badge tweaks) ───────────────────────
  if (!document.getElementById("icl-leads-style")) {
    const style = document.createElement("style");
    style.id = "icl-leads-style";
    style.textContent = `
      @keyframes icl-shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
      .skeleton-box {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 400px 100%;
        animation: icl-shimmer 1.4s ease infinite;
        border-radius: 4px;
        vertical-align: middle;
      }
      .bg-blue-light   { background: rgba(74,144,226,.12)!important; }
      .bg-purple-light { background: rgba(108,78,185,.12)!important; }
      .bg-green-light  { background: rgba(41,168,117,.12)!important; }
      .bg-yellow-light { background: rgba(245,178,51,.12)!important; }
      .bg-red-light    { background: rgba(226,74,74,.12)!important;  }
      .avatar.avatar-medium { width:40px; height:40px; display:flex; align-items:center; justify-content:center; }
      #icl-leads-table td, #icl-leads-table th { vertical-align: middle; white-space: nowrap; font-size: 13px; }
      #icl-leads-table tbody tr:hover { cursor: pointer; }
      .icl-badge { font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 500; }
      .icl-badge.open        { background:#e8f4fd; color:#1a73e8; }
      .icl-badge.replied     { background:#e6f4ea; color:#188038; }
      .icl-badge.opportunity { background:#fce8e6; color:#c5221f; }
      .icl-badge.interested  { background:#fef7e0; color:#b06000; }
      .icl-badge.converted   { background:#e8f0fe; color:#3c4043; }
      .icl-badge.default     { background:#f1f3f4; color:#5f6368; }
      /* Opportunity status badges in the table */
      .icl-badge.opp-badge            { margin-right:4px; margin-bottom:2px; display:inline-block; }
      .icl-badge.opp-badge.open       { background:#e8f4fd; color:#1a73e8; }
      .icl-badge.opp-badge.quotation  { background:#fff8e1; color:#f57f17; }
      .icl-badge.opp-badge.converted  { background:#e8f5e9; color:#2e7d32; }
      .icl-badge.opp-badge.closed     { background:#fce4ec; color:#c62828; }
      .icl-badge.opp-badge.lost       { background:#f3e5f5; color:#6a1b9a; }
      .icl-sticky-card { position: sticky; top: 16px; }
      .icl-sidebar-list { max-height: 72vh; overflow-y: auto; }
      .icl-sidebar-item {
        border-bottom: 1px solid #f1f3f4;
        padding: 10px 12px;
        cursor: pointer;
      }
      .icl-sidebar-item:hover { background: #f8f9fa; }
      .icl-sidebar-item.active { background: #e8f0fe; border-left: 3px solid #1a73e8; }
      .icl-sidebar-title { font-weight: 600; font-size: 13px; line-height: 1.2; color: #202124; }
      .icl-sidebar-sub { font-size: 12px; color: #5f6368; margin-top: 2px; }
      .icl-mini-pill {
        display: inline-block;
        border-radius: 999px;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 600;
        background: #eef2ff;
        color: #334155;
      }
      .icl-chart-empty {
        color: #6b7280;
        font-size: 12px;
        padding: 10px 0;
      }
      .icl-bar-row { margin-bottom: 10px; }
      .icl-bar-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        margin-bottom: 4px;
        gap: 10px;
      }
      .icl-bar-label {
        color: #1f2937;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .icl-bar-val { color: #6b7280; font-weight: 600; }
      .icl-bar-track {
        height: 8px;
        border-radius: 999px;
        background: #eef2f7;
        overflow: hidden;
      }
      .icl-bar-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
      }
      @media (max-width: 991px) {
        .icl-sticky-card { position: static; }
        .icl-sidebar-list { max-height: 340px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Data layer ───────────────────────────────────────────────────────────
  let allLeads = [];
  let leadOppMapCache = {};
  let selectedLead = null;
  let tableSearchQuery = "";
  let currentPage = 1;
  const PAGE_SIZE = 20;

  // Statuses considered "active" for Leads
  const ACTIVE_STATUSES = ["Open", "Replied", "Interested"];
  // Opportunity statuses considered "active"
  const ACTIVE_OPP_STATUSES = ["Open", "Quotation", "Converted"];

  async function loadDashboard() {
    try {
      // ── 1. Fetch all CRM Leads ─────────────────────────────────────────
      const leadRes = await frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "Lead",
          fields: [
            "name", "lead_name", "company_name", "status",
            "source", "mobile_no", "email_id", "lead_owner",
            "creation",
          ],
          limit: 0,
          order_by: "creation desc",
        },
      });
      allLeads = leadRes.message || [];

      // ── 2. Fetch linked opportunities ──────────────────────────────────
      //    Opportunity uses `party_name` (Lead name) when `opportunity_from`
      //    is "Lead". We filter on that to get only lead-linked opportunities.
      let oppLinks = [];
      try {
        const oppRes = await frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Opportunity",
            fields: ["name", "status", "party_name", "opportunity_amount"],
            filters: [["Opportunity", "opportunity_from", "=", "Lead"]],
            limit: 0,
          },
        });
        oppLinks = oppRes.message || [];
      } catch (e) {
        console.warn("ICL Leads: could not fetch Opportunities -", e.message || e);
      }

      // Build a map: lead name → [{ opp, status, amount }]
      const leadOppMap = {};
      oppLinks.forEach(({ party_name, name, status, opportunity_amount }) => {
        if (!party_name) return;
        if (!leadOppMap[party_name]) leadOppMap[party_name] = [];
        leadOppMap[party_name].push({ opp: name, status: status || "", amount: opportunity_amount || 0 });
      });
      leadOppMapCache = leadOppMap;

      // ── 3. Compute stats ───────────────────────────────────────────────
      const totalLeads = allLeads.length;

      // All unique opportunities linked to any lead
      const totalOpportunities = oppLinks.length;

      const activeLeads = allLeads.filter((l) =>
        ACTIVE_STATUSES.includes(l.status)
      ).length;

      // Leads that have at least one active linked opportunity
      const leadsWithActiveOpps = allLeads.filter((l) => {
        const opps = leadOppMap[l.name] || [];
        return opps.some((o) => ACTIVE_OPP_STATUSES.includes(o.status));
      }).length;

      // Unique active opportunities linked to any lead
      const activeLinkedOpps = oppLinks.filter((o) =>
        ACTIVE_OPP_STATUSES.includes(o.status)
      ).length;

      // ── 4. Render stat cards ───────────────────────────────────────────
      const fmt = (n) => Number(n).toLocaleString();
      $("#stat-total-leads").text(fmt(totalLeads));
      $("#stat-total-opportunities").text(fmt(totalOpportunities));
      $("#stat-active-leads").text(fmt(activeLeads));
      $("#stat-leads-active-opps").text(fmt(leadsWithActiveOpps));
      $("#stat-active-linked-opps").text(fmt(activeLinkedOpps));

      // ── 5. Render sidebar, charts and table ───────────────────────────
      renderSidebar(allLeads, leadOppMap);
      applyTableFilter();

      // ── 6. Live search/events ──────────────────────────────────────────
      $("#icl-lead-search")
        .off("input")
        .on("input", function () {
          tableSearchQuery = ($(this).val() || "").toLowerCase().trim();
          currentPage = 1;
          applyTableFilter();
        });

      $("#icl-sidebar-search")
        .off("input")
        .on("input", function () {
          renderSidebar(allLeads, leadOppMap);
        });

      $("#icl-sidebar-clear")
        .off("click")
        .on("click", function () {
          selectedLead = null;
          $("#icl-sidebar-clear").hide();
          applyTableFilter();
          renderSidebar(allLeads, leadOppMap);
        });
    } catch (err) {
      frappe.msgprint({
        title: __("Error loading ICL Leads"),
        message: err.message || String(err),
        indicator: "red",
      });
    }
  }

  function applyTableFilter() {
    let filtered = tableSearchQuery
      ? allLeads.filter(
          (l) =>
            (l.lead_name || "").toLowerCase().includes(tableSearchQuery) ||
            (l.company_name || "").toLowerCase().includes(tableSearchQuery) ||
            (l.email_id || "").toLowerCase().includes(tableSearchQuery) ||
            (l.status || "").toLowerCase().includes(tableSearchQuery)
        )
      : allLeads;

    if (selectedLead) {
      filtered = filtered.filter((l) => l.name === selectedLead);
    }

    renderTable(filtered, leadOppMapCache);
    renderClientCharts(filtered, leadOppMapCache);
  }

  function renderSidebar(leads, leadOppMap) {
    const list = $("#icl-sidebar-list");
    list.empty();

    const q = ($("#icl-sidebar-search").val() || "").toLowerCase().trim();
    const filtered = q
      ? leads.filter(
          (l) =>
            (l.lead_name || "").toLowerCase().includes(q) ||
            (l.company_name || "").toLowerCase().includes(q) ||
            (l.status || "").toLowerCase().includes(q)
        )
      : leads;

    if (!filtered.length) {
      list.html(`<div class="text-center py-4 text-muted">No leads found.</div>`);
      return;
    }

    filtered.slice(0, 200).forEach((lead) => {
      const status = frappe.utils.escape_html(lead.status || "No Status");
      const oppCount = (leadOppMap[lead.name] || []).length;
      const active = selectedLead === lead.name ? " active" : "";

      list.append(`
        <div class="icl-sidebar-item${active}" data-name="${frappe.utils.escape_html(lead.name)}">
          <div class="d-flex justify-content-between align-items-start">
            <div class="icl-sidebar-title">${frappe.utils.escape_html(lead.lead_name || lead.name)}</div>
            <span class="icl-mini-pill">${oppCount}</span>
          </div>
          <div class="icl-sidebar-sub">${frappe.utils.escape_html(lead.company_name || "No company")}</div>
          <div class="mt-1"><span class="icl-badge default">${status}</span></div>
        </div>
      `);
    });

    list.find(".icl-sidebar-item").on("click", function () {
      selectedLead = $(this).data("name");
      $("#icl-sidebar-clear").show();
      currentPage = 1;
      applyTableFilter();
      renderSidebar(allLeads, leadOppMapCache);
    });
  }

  function renderClientCharts(leads, leadOppMap) {
    const clientLeadCount = {};
    const clientOppCount = {};

    leads.forEach((lead) => {
      const client = (lead.company_name || "Unspecified Client").trim() || "Unspecified Client";
      clientLeadCount[client] = (clientLeadCount[client] || 0) + 1;
      clientOppCount[client] = (clientOppCount[client] || 0) + (leadOppMap[lead.name] || []).length;
    });

    renderBarChart("#icl-client-leads-chart", clientLeadCount);
    renderBarChart("#icl-client-opps-chart", clientOppCount);
  }

  function renderBarChart(selector, dataObj) {
    const target = $(selector);
    target.empty();

    const items = Object.entries(dataObj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (!items.length) {
      target.html(`<div class="icl-chart-empty">No data to display for current filter.</div>`);
      return;
    }

    const maxVal = Math.max(...items.map((x) => x[1]), 1);
    items.forEach(([label, value]) => {
      const width = Math.round((value / maxVal) * 100);
      target.append(`
        <div class="icl-bar-row">
          <div class="icl-bar-meta">
            <span class="icl-bar-label" title="${frappe.utils.escape_html(label)}">${frappe.utils.escape_html(label)}</span>
            <span class="icl-bar-val">${Number(value).toLocaleString()}</span>
          </div>
          <div class="icl-bar-track">
            <div class="icl-bar-fill" style="width:${width}%"></div>
          </div>
        </div>
      `);
    });
  }

  function renderTable(leads, leadOppMap) {
    const tbody = $("#icl-leads-tbody");
    tbody.empty();

    if (!leads.length) {
      tbody.html(`
        <tr>
          <td colspan="11" class="text-center py-5 text-muted">
            <i class="fa fa-inbox fa-2x mb-2 d-block"></i>No leads found.
          </td>
        </tr>`);
      $("#icl-pagination-bar").hide();
      return;
    }

    // Paginate
    const totalPages = Math.ceil(leads.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageLeads = leads.slice(start, start + PAGE_SIZE);

    pageLeads.forEach((lead, idx) => {
      const opps = leadOppMap[lead.name] || [];
      const oppBadges = opps.length
        ? opps
            .map((o) => {
              const oppStatusKey = (o.status || "").toLowerCase().replace(/\s+/g, "-");
              return `<span class="icl-badge opp-badge ${oppStatusKey}" title="${frappe.utils.escape_html(o.opp)}">${frappe.utils.escape_html(o.opp)}</span> `;
            })
            .join("")
        : `<span class="text-muted">-</span>`;

      const statusKey = (lead.status || "").toLowerCase().replace(/\s+/g, "-");
      const statusBadge = `<span class="icl-badge ${statusKey} default">${frappe.utils.escape_html(lead.status || "-")}</span>`;

      const created = lead.creation
        ? frappe.datetime.str_to_user(lead.creation)
        : "-";

      tbody.append(`
        <tr data-name="${frappe.utils.escape_html(lead.name)}">
          <td class="text-muted">${start + idx + 1}</td>
          <td class="font-weight-semibold">${frappe.utils.escape_html(lead.lead_name || "-")}</td>
          <td>${frappe.utils.escape_html(lead.company_name || "-")}</td>
          <td>${statusBadge}</td>
          <td>${frappe.utils.escape_html(lead.source || "-")}</td>
          <td>${frappe.utils.escape_html(lead.mobile_no || "-")}</td>
          <td>${frappe.utils.escape_html(lead.email_id || "-")}</td>
          <td>${oppBadges}</td>
          <td>${frappe.utils.escape_html(lead.lead_owner || "-")}</td>
          <td class="text-muted">${created}</td>
          <td>
            <a href="/leads/${frappe.utils.escape_html(lead.name)}"
               class="btn btn-xs btn-default" title="Open Lead">
              <i class="fa fa-external-link"></i>
            </a>
          </td>
        </tr>`);
    });

    // Row click → open lead
    tbody.find("tr[data-name]").on("click", function (e) {
      if ($(e.target).closest("a").length) return;
      const name = $(this).data("name");
      frappe.set_route("leads/" + name);
    });

    // Pagination controls
    renderPagination(leads, leadOppMap, totalPages);
  }

  function renderPagination(leads, leadOppMap, totalPages) {
    const bar = $("#icl-pagination-bar");
    const info = $("#icl-page-info");
    const btns = $("#icl-page-buttons");

    if (totalPages <= 1) {
      bar.hide();
      return;
    }

    bar.show().css("display", "flex");
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, leads.length);
    info.text(`Showing ${start}–${end} of ${leads.length}`);

    btns.empty();

    // Prev
    btns.append(
      `<button class="btn btn-default btn-sm icl-page-btn" data-page="${currentPage - 1}"
         ${currentPage === 1 ? "disabled" : ""}>‹ Prev</button>`
    );

    // Page numbers (window of 5)
    const window_start = Math.max(1, currentPage - 2);
    const window_end = Math.min(totalPages, currentPage + 2);
    for (let p = window_start; p <= window_end; p++) {
      btns.append(
        `<button class="btn btn-sm ${p === currentPage ? "btn-primary" : "btn-default"} icl-page-btn"
           data-page="${p}">${p}</button>`
      );
    }

    // Next
    btns.append(
      `<button class="btn btn-default btn-sm icl-page-btn" data-page="${currentPage + 1}"
         ${currentPage === totalPages ? "disabled" : ""}>Next ›</button>`
    );

    btns.find(".icl-page-btn").on("click", function () {
      const p = parseInt($(this).data("page"));
      if (!p || p < 1 || p > totalPages) return;
      currentPage = p;
      renderTable(leads, leadOppMap);
      $("html, body").animate({ scrollTop: $("#icl-leads-table").offset().top - 80 }, 200);
    });
  }

  // ── Kick off ─────────────────────────────────────────────────────────────
  loadDashboard();
};
