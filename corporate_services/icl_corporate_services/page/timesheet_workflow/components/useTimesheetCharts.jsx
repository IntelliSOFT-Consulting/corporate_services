import { useEffect } from "react";

function useTimesheetCharts({ submissions, showSubmissionTrend, showEmployeeChart, showEmployeeMonthlyChart, formatMonth }) {
  useEffect(() => {
    if (typeof window.Chart === "undefined") return undefined;

    const Chart = window.Chart;
    const chartIds = ["hoursChart", "statusChart", "trendChart", "employeeChart", "employeeMonthlyChart"];
    chartIds.forEach((id) => {
      const chart = Chart.getChart(id);
      if (chart) chart.destroy();
    });

    if (!submissions.length) return undefined;

    const hoursCtx = document.getElementById("hoursChart");
    if (hoursCtx) {
      const monthlyData = {};
      submissions.forEach((ts) => {
        const month = ts.month_year || "Unknown";
        monthlyData[month] = (monthlyData[month] || 0) + parseFloat(ts.total_working_hours || 0);
      });
      new Chart(hoursCtx, {
        type: "bar",
        data: {
          labels: Object.keys(monthlyData).map((month) => formatMonth(month)),
          datasets: [{
            label: "Total Hours",
            data: Object.values(monthlyData),
            backgroundColor: "rgba(54,162,235,0.6)",
            borderColor: "rgba(54,162,235,1)",
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Total Hours by Month", font: { size: 14 } },
          },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
      const statusData = {};
      submissions.forEach((ts) => {
        const status = ts.status || "Unknown";
        statusData[status] = (statusData[status] || 0) + 1;
      });
      const colors = {
        Open: "rgba(255,206,86,.6)",
        Approved: "rgba(75,192,192,.6)",
        Rejected: "rgba(255,99,132,.6)",
        Cancelled: "rgba(201,203,207,.6)",
      };
      new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: Object.keys(statusData),
          datasets: [{
            data: Object.values(statusData),
            backgroundColor: Object.keys(statusData).map((status) => colors[status] || "rgba(153,102,255,.6)"),
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: "Status Distribution", font: { size: 14 } },
            legend: { position: "bottom" },
          },
        },
      });
    }

    if (showSubmissionTrend) {
      const trendCtx = document.getElementById("trendChart");
      if (trendCtx) {
        const trendData = {};
        [...submissions]
          .sort((a, b) => new Date(a.creation) - new Date(b.creation))
          .forEach((ts) => {
            const month = ts.month_year || "Unknown";
            trendData[month] = (trendData[month] || 0) + 1;
          });
        new Chart(trendCtx, {
          type: "line",
          data: {
            labels: Object.keys(trendData).map((month) => formatMonth(month)),
            datasets: [{
              label: "Submissions",
              data: Object.values(trendData),
              borderColor: "rgba(75,192,192,1)",
              backgroundColor: "rgba(75,192,192,.2)",
              tension: 0.4,
              fill: true,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: "Submission Trend", font: { size: 14 } },
            },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          },
        });
      }
    }

    if (showEmployeeChart) {
      const employeeCtx = document.getElementById("employeeChart");
      if (employeeCtx) {
        const empData = {};
        submissions.forEach((ts) => {
          const name = ts.employee_name || ts.employee || "Unknown";
          empData[name] = (empData[name] || 0) + parseFloat(ts.total_working_hours || 0);
        });
        const sorted = Object.entries(empData).sort((a, b) => b[1] - a[1]).slice(0, 10);
        new Chart(employeeCtx, {
          type: "bar",
          data: {
            labels: sorted.map((entry) => entry[0]),
            datasets: [{
              label: "Total Hours",
              data: sorted.map((entry) => entry[1]),
              backgroundColor: "rgba(153,102,255,.6)",
              borderColor: "rgba(153,102,255,1)",
              borderWidth: 1,
            }],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: "Top 10 Employees by Hours", font: { size: 14 } },
            },
            scales: { x: { beginAtZero: true } },
          },
        });
      }
    }

    if (showEmployeeMonthlyChart) {
      const employeeMonthlyCtx = document.getElementById("employeeMonthlyChart");
      if (employeeMonthlyCtx) {
        const monthlyData = {};
        [...submissions]
          .sort((a, b) => new Date(a.creation) - new Date(b.creation))
          .forEach((ts) => {
            const month = ts.month_year || "Unknown";
            monthlyData[month] = (monthlyData[month] || 0) + parseFloat(ts.total_working_hours || 0);
          });
        new Chart(employeeMonthlyCtx, {
          type: "line",
          data: {
            labels: Object.keys(monthlyData).map((month) => formatMonth(month)),
            datasets: [{
              label: "Hours",
              data: Object.values(monthlyData),
              borderColor: "rgba(54,162,235,1)",
              backgroundColor: "rgba(54,162,235,.15)",
              tension: 0.35,
              fill: true,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: { display: true, text: "Hours Per Month", font: { size: 14 } },
            },
            scales: { y: { beginAtZero: true } },
          },
        });
      }
    }

    return undefined;
  }, [submissions, showSubmissionTrend, showEmployeeChart, showEmployeeMonthlyChart, formatMonth]);
}

export default useTimesheetCharts;
