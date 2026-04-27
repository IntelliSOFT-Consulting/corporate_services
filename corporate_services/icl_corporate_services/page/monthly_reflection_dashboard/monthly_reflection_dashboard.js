frappe.pages["monthly-reflection-dashboard"].on_page_load = function (wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Monthly Reflection Dashboard",
        single_column: true
    });

    // Inject Chart.js via script tag (more reliable than frappe.require)
    if (window.Chart) {
        MRDashboard.init(page);
    } else {
        var s    = document.createElement("script");
        s.src    = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
        s.onload = function () { MRDashboard.init(page); };
        s.onerror = function () {
            $(page.body).html(
                "<div class='alert alert-warning m-4'>Failed to load Chart.js</div>"
            );
        };
        document.head.appendChild(s);
    }
};

var MRDashboard = {

    chartInstance : null,
    reportRows    : [],
    allEmployees  : [],
    page          : null,

    // -- init -------------------------------------------------------------
    init: function (page) {
        this.page = page;
        $(page.body).html(this.getHTML());
        this.buildYearDropdown();

        var self = this;
        $(page.body).on("change", "#mr-year-filter",   function () { self.loadReport(); });
        $(page.body).on("change", "#mr-period-filter", function () { self.filterPeriod(); });
        $(page.body).on("click", ".mr-send-reminder", function () {
            self.sendReminder(this.getAttribute("data-employee"), this.getAttribute("data-period"));
        });
        $(page.body).on("click", "#mr-send-all-reminders", function () {
            self.sendAllReminders();
        });
    },

    // -- HTML template -----------------------------------------------------
    getHTML: function () {
        return `
        <div id="mr-dash" class="container-fluid py-3 px-4">

            <!-- Header -->
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                <div>
                    <h5 class="mb-0 fw-semibold">Monthly Reflection Tracker</h5>
                    <small class="text-muted">Submission status by review period</small>
                </div>
                <div class="d-flex gap-2 align-items-center flex-wrap">
                    <select id="mr-year-filter" class="form-select form-select-sm"
                            style="width:110px;">
                        <option>Loading...</option>
                    </select>
                    <select id="mr-period-filter" class="form-select form-select-sm"
                            style="width:170px;">
                        <option value="">All periods</option>
                    </select>
                </div>
            </div>

            <!-- Loader -->
            <div id="mr-loader" class="text-center text-muted py-5">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                Loading report data...
            </div>

            <!-- Main content -->
            <div id="mr-content" style="display:none;">

                <!-- Metric cards -->
                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <div class="card border h-100 text-center p-3">
                            <div class="text-muted"
                                 style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;">
                                Total Active Staff
                            </div>
                            <div id="mr-total" class="fw-semibold mt-2"
                                 style="font-size:32px;">-</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border h-100 text-center p-3">
                            <div class="text-muted"
                                 style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;">
                                Submitted
                            </div>
                            <div id="mr-submitted" class="fw-semibold mt-2"
                                 style="font-size:32px;color:#1D9E75;">-</div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border h-100 text-center p-3">
                            <div class="text-muted"
                                 style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;">
                                Missing
                            </div>
                            <div id="mr-missing" class="fw-semibold mt-2"
                                 style="font-size:32px;color:#E24B4A;">-</div>
                        </div>
                    </div>
                </div>

                <!-- Chart -->
                <div class="card border mb-3">
                    <div class="card-body">
                        <div class="text-muted fw-500 mb-3"
                             style="font-size:12px;text-transform:uppercase;letter-spacing:.4px;">
                            Submissions by period
                        </div>
                        <div style="position:relative;height:260px;">
                            <canvas id="mr-chart"></canvas>
                        </div>
                        <div class="d-flex gap-3 mt-3" style="font-size:12px;color:#888;">
                            <span>
                                <span class="d-inline-block rounded-1 me-1"
                                      style="width:10px;height:10px;background:#1D9E75;
                                             vertical-align:middle;"></span>
                                Submitted
                            </span>
                            <span>
                                <span class="d-inline-block rounded-1 me-1"
                                      style="width:10px;height:10px;background:#E24B4A;
                                             vertical-align:middle;"></span>
                                Missing
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Submission status -->
                <div class="card border">
                    <div class="card-body">
                        <div class="d-flex align-items-center
                                    justify-content-between mb-3 flex-wrap gap-2">
                            <div class="text-muted fw-500"
                                 style="font-size:12px;text-transform:uppercase;
                                        letter-spacing:.4px;">
                                Employee Submission Status
                            </div>
                            <span id="mr-period-label"
                                  class="badge rounded-pill px-3 py-2"
                                  style="background:#fdecea;color:#c0392b;
                                         font-size:12px;font-weight:500;">
                                Select a period above
                            </span>
                        </div>
                        <div class="mb-3">
                            <button id="mr-send-all-reminders" class="btn btn-sm btn-primary" style="display:none;">
                                Send Reminder To All Missing
                            </button>
                        </div>
                        <div id="mr-missing-table"
                             class="text-start text-muted py-3"
                             style="font-size:13px;">
                            Select a review period from the dropdown above.
                        </div>
                    </div>
                </div>

            </div>
        </div>`;
    },

    // -- Build year dropdown -----------------------------------------------
    buildYearDropdown: function () {
        var self        = this;
        var currentYear = new Date().getFullYear();
        var years       = [currentYear - 1, currentYear, currentYear + 1];
        var sel         = document.getElementById("mr-year-filter");

        sel.innerHTML = years.map(function (y) {
            return '<option value="' + y + '"' +
                (y === currentYear ? " selected" : "") + ">" + y + "</option>";
        }).join("");

        self.loadReport();
    },

    // -- Load Script Report ------------------------------------------------
    loadReport: function () {
        var self = this;
        var year = document.getElementById("mr-year-filter").value;

        document.getElementById("mr-loader").style.display  = "block";
        document.getElementById("mr-loader").innerHTML      =
            "<div class='spinner-border spinner-border-sm me-2'></div>Loading report data...";
        document.getElementById("mr-content").style.display = "none";

        frappe.call({
            method: "frappe.desk.query_report.run",
            args: {
                report_name: "Monthly Reflection Summary",
                filters    : { year: String(year) }
            },
            callback: function (r) {
                if (!r.message || !r.message.result || !r.message.result.length) {
                    document.getElementById("mr-loader").innerHTML =
                        "<div class='alert alert-warning mx-3'>No data found for " +
                        year + ".</div>";
                    return;
                }

                // rows come back as OBJECTS - use fieldnames directly
                self.reportRows = r.message.result.map(function (row) {
                    return {
                        month     : row.month,
                        submitted : row.submitted,
                        total     : row.total,
                        missing   : row.missing,
                        pct       : row.pct
                    };
                });

                // rebuild period dropdown
                var periodSel = document.getElementById("mr-period-filter");
                periodSel.innerHTML =
                    '<option value="">All periods</option>' +
                    self.reportRows.map(function (row) {
                        return '<option value="' + row.month + '">' +
                               row.month + "</option>";
                    }).join("");

                // fetch active employees
                frappe.call({
                    method: "frappe.client.get_list",
                    args: {
                        doctype          : "Employee",
                        filters          : { status: "Active" },
                        fields           : [
                            "name", "employee_name", "designation",
                            "department", "custom_reports_to_name"
                        ],
                        limit_page_length: 500,
                        order_by         : "employee_name asc"
                    },
                    callback: function (emp) {
                        self.allEmployees = emp.message || [];

                        document.getElementById("mr-loader").style.display  = "none";
                        document.getElementById("mr-content").style.display = "block";

                        self.renderChart();
                        self.filterPeriod();
                    }
                });
            }
        });
    },

    // -- Handle period dropdown change -------------------------------------
    filterPeriod: function () {
        var self   = this;
        var period = document.getElementById("mr-period-filter").value;

        if (period) {
            var row = null;
            for (var i = 0; i < self.reportRows.length; i++) {
                if (self.reportRows[i].month === period) {
                    row = self.reportRows[i];
                    break;
                }
            }
            if (!row) return;

            document.getElementById("mr-total").textContent     = row.total;
            document.getElementById("mr-submitted").textContent = row.submitted;
            document.getElementById("mr-missing").textContent   = row.missing;
            document.getElementById("mr-period-label").textContent = period;
            self.renderStatusTable(period);

        } else {
            var totalStaff     = self.reportRows.length ? self.reportRows[0].total : 0;
            var totalSubmitted = self.reportRows.reduce(function (s, r) {
                return s + r.submitted;
            }, 0);

            document.getElementById("mr-total").textContent     = totalStaff;
            document.getElementById("mr-submitted").textContent = totalSubmitted;
            document.getElementById("mr-missing").textContent   = "-";
            document.getElementById("mr-period-label").textContent = "Select a period above";
            document.getElementById("mr-missing-table").innerHTML =
                "<div class='text-center text-muted py-3' style='font-size:13px;'>" +
                "Select a review period to see missing employees.</div>";
        }
    },

    // -- Render stacked bar chart ------------------------------------------
    renderChart: function () {
        var self      = this;
        var labels    = self.reportRows.map(function (r) { return r.month; });
        var submitted = self.reportRows.map(function (r) { return r.submitted; });
        var missing   = self.reportRows.map(function (r) { return r.missing; });

        if (self.chartInstance) {
            self.chartInstance.destroy();
            self.chartInstance = null;
        }

        self.chartInstance = new Chart(
            document.getElementById("mr-chart"),
            {
                type: "bar",
                data: {
                    labels  : labels,
                    datasets: [
                        {
                            label          : "Submitted",
                            data           : submitted,
                            backgroundColor: "#1D9E75",
                            borderRadius   : 4,
                            stack          : "s"
                        },
                        {
                            label          : "Missing",
                            data           : missing,
                            backgroundColor: "#E24B4A",
                            borderRadius   : 4,
                            stack          : "s"
                        }
                    ]
                },
                options: {
                    responsive         : true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend : { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (ctx) {
                                    return "  " + ctx.dataset.label + ": " + ctx.parsed.y;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            grid   : { display: false },
                            ticks  : {
                                font       : { size: 11 },
                                autoSkip   : false,
                                maxRotation: 45
                            }
                        },
                        y: {
                            stacked    : true,
                            beginAtZero: true,
                            ticks      : { font: { size: 11 }, stepSize: 1 },
                            grid       : { color: "rgba(128,128,128,0.1)" }
                        }
                    }
                }
            }
        );
    },

    // -- Render submitted + missing employees table -----------------------
    renderStatusTable: function (period) {
        var self      = this;
        var container = document.getElementById("mr-missing-table");
        var bulkBtn   = document.getElementById("mr-send-all-reminders");

        container.innerHTML =
            "<div class='text-center text-muted py-3'>" +
            "<div class='spinner-border spinner-border-sm me-2'></div>Loading...</div>";

        frappe.call({
            method: "corporate_services.api.notification.monthly_reflection.monthly_reflection.get_monthly_reflection_period_status",
            args: {
                review_period: period
            },
            callback: function (r) {
                var rows = r.message || [];
                var missing = rows.filter(function (row) {
                    return !row.submitted;
                });
                bulkBtn.style.display = missing.length ? "inline-block" : "none";

                if (!rows.length) {
                    container.innerHTML =
                        "<div class='text-center py-3 text-muted'>No employees found.</div>";
                    return;
                }

                if (!missing.length) {
                    container.innerHTML =
                        "<div class='text-center py-3'>" +
                        "<span class='badge rounded-pill px-3 py-2' " +
                        "style='background:#e8f8f2;color:#1D9E75;" +
                        "font-size:13px;font-weight:500;'>" +
                        "&#10003; All employees have submitted for " +
                        period + "</span></div>";
                    return;
                }

                var html =
                    "<div class='mb-3'>" +
                    "<span class='badge rounded-pill px-3 py-2' " +
                    "style='background:#fdecea;color:#c0392b;" +
                    "font-size:12px;font-weight:500;'>" +
                    missing.length + " employee(s) pending</span></div>" +
                    "<div class='table-responsive'>" +
                    "<table class='table table-sm table-hover mb-0'>" +
                    "<thead class='table-light'><tr>" +
                    "<th style='width:40px;'>#</th>" +
                    "<th>Employee</th>" +
                    "<th>Status</th>" +
                    "<th>Department</th>" +
                    "<th>Job Title</th>" +
                    "<th>Supervisor</th>" +
                    "<th>Last Reminder</th>" +
                    "<th style='width:120px;'>Action</th>" +
                    "</tr></thead><tbody>";

                rows.forEach(function (e, i) {
                    var statusBadge = e.submitted
                        ? "<span class='badge bg-success'>Submitted</span>"
                        : "<span class='badge bg-danger'>" + (e.status || "Pending") + "</span>";
                    var reminderInfo = e.last_notification_type
                        ? (e.last_notification_type + (e.last_notification_sent_on ? " · " + e.last_notification_sent_on : ""))
                        : "-";
                    var actionHtml = e.can_remind
                        ? "<button class='btn btn-sm btn-primary mr-send-reminder' data-employee='" + e.employee + "' data-period='" + period + "'>Send Reminder</button>"
                        : "-";
                    var employeeLink = e.docname
                        ? "/app/monthly-reflection/" + e.docname
                        : "/app/employee/" + e.employee;

                    html +=
                        "<tr>" +
                        "<td class='text-muted'>" + (i + 1) + "</td>" +
                        "<td><a href='" + employeeLink +
                        "' target='_blank' class='text-decoration-none'>" +
                        (e.employee_name || e.employee) + "</a></td>" +
                        "<td>" + statusBadge + "</td>" +
                        "<td class='text-muted'>" + (e.department  || "-") + "</td>" +
                        "<td class='text-muted'>" + (e.designation || "-") + "</td>" +
                        "<td class='text-muted'>" + (e.supervisor  || "-") + "</td>" +
                        "<td class='text-muted' style='font-size:12px;'>" + reminderInfo + "</td>" +
                        "<td>" + actionHtml + "</td>" +
                        "</tr>";
                });

                html += "</tbody></table></div>";
                container.innerHTML = html;
            }
        });
    },

    sendReminder: function (employee, period) {
        frappe.call({
            method: "corporate_services.api.notification.monthly_reflection.monthly_reflection.send_manual_monthly_reflection_overdue_reminder",
            args: {
                employee: employee,
                review_period: period
            },
            freeze: true,
            freeze_message: "Sending reminder...",
            callback: function (r) {
                if (!r.exc) {
                    frappe.show_alert({
                        message: (r.message && r.message.message) || "Reminder sent.",
                        indicator: "green"
                    });
                    MRDashboard.renderStatusTable(period);
                }
            }
        });
    },

    sendAllReminders: function () {
        var period = document.getElementById("mr-period-filter").value;
        if (!period) return;

        var buttons = Array.from(document.querySelectorAll(".mr-send-reminder"));
        if (!buttons.length) {
            frappe.show_alert({ message: "No pending reminders.", indicator: "orange" });
            return;
        }

        frappe.confirm(
            "Send reminders to all employees missing Monthly Reflection for " + period + "?",
            function () {
                (async function () {
                    for (const btn of buttons) {
                        await frappe.call({
                            method: "corporate_services.api.notification.monthly_reflection.monthly_reflection.send_manual_monthly_reflection_overdue_reminder",
                            args: {
                                employee: btn.getAttribute("data-employee"),
                                review_period: period
                            }
                        });
                    }

                    frappe.show_alert({ message: "Manual reminders sent.", indicator: "green" });
                    MRDashboard.renderStatusTable(period);
                })();
            }
        );
    }
};
