import { useEffect, useMemo, useState } from "react";
import useTimesheetCharts from "./useTimesheetCharts";

const PAGE = "corporate_services.icl_corporate_services.page.timesheet_workflow.timesheet_workflow";
const NOTIFY_API = "corporate_services.api.timesheet.notify_non_submitters.notify_non_submitters";
const PAGE_SIZE = 10;

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatMonth(value) {
  if (!value || !value.includes("-")) return value || "";
  const [m, y] = value.split("-");
  const n = parseInt(m, 10);
  return n >= 1 && n <= 12 ? `${MONTH_NAMES[n]} ${y}` : value;
}

function buildMonthOptions() {
  const opts = [{ value: "", label: "All Months" }];
  const now = new Date();
  for (let i = 24; i >= -3; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    opts.push({ value: `${m}-${y}`, label: `${MONTH_NAMES[d.getMonth() + 1]} ${y}` });
  }
  return opts;
}

function getCurrentMonthYear() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  return `${m}-${y}`;
}

function matchesEmployeeQuery(row, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (row.employee_name || "").toLowerCase().includes(q) ||
    (row.employee || "").toLowerCase().includes(q) ||
    (row.name || "").toLowerCase().includes(q)
  );
}

function useTimesheetSubmissions({ employee = null, roleContext = null }) {
  const [submissions, setSubmissions] = useState([]);
  const [nonSubmitters, setNonSubmitters] = useState([]);
  const [currentMonthNonSubmitters, setCurrentMonthNonSubmitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [nonSubmitterPage, setNonSubmitterPage] = useState(1);
  const [activeTableTab, setActiveTableTab] = useState("submissions");

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const currentMonthYear = useMemo(() => getCurrentMonthYear(), []);
  const role = roleContext?.role || "employee";
  const showWorkflowState = role === "hr_finance";
  const showNonSubmittersSection = role !== "employee" && !employee;

  const visibleNonSubmitters = monthFilter ? nonSubmitters : currentMonthNonSubmitters;
  const visibleNonSubmitterMonth = monthFilter || currentMonthYear;

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((row) => {
      if (!matchesEmployeeQuery(row, searchQuery)) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }, [submissions, searchQuery, statusFilter]);

  const filteredNonSubmitters = useMemo(() => {
    return visibleNonSubmitters.filter((row) => matchesEmployeeQuery(row, searchQuery));
  }, [visibleNonSubmitters, searchQuery]);

  const totalPages = Math.ceil(filteredSubmissions.length / PAGE_SIZE);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useTimesheetCharts({
    submissions: filteredSubmissions,
    showSubmissionTrend: !employee,
    showEmployeeChart: !employee,
    formatMonth,
  });

  useEffect(() => {
    setLoading(true);
    setNonSubmitters([]);
    setCurrentMonthNonSubmitters([]);

    const method = employee
      ? `${PAGE}.get_timesheet_submissions_by_employee`
      : `${PAGE}.get_all_timesheet_submissions`;

    const args = employee
      ? { employee_name: employee.name || employee.employee_name, month_year: monthFilter || null }
      : { month_year: monthFilter || null };

    frappe.call({
      method,
      args,
      callback: (r) => {
        setSubmissions(r.message || []);
        setCurrentPage(1);
        setNonSubmitterPage(1);
        setLoading(false);
      },
    });

    if (monthFilter && showNonSubmittersSection) {
      frappe.call({
        method: `${PAGE}.get_not_submitted_employees`,
        args: { month_year: monthFilter },
        callback: (r) => {
          setNonSubmitters(r.message || []);
          setNonSubmitterPage(1);
        },
      });
    }
  }, [employee, monthFilter, showNonSubmittersSection]);

  useEffect(() => {
    if (!showNonSubmittersSection) return;

    frappe.call({
      method: `${PAGE}.get_not_submitted_employees`,
      args: { month_year: currentMonthYear },
      callback: (r) => {
        setCurrentMonthNonSubmitters(r.message || []);
      },
    });
  }, [showNonSubmittersSection, currentMonthYear]);

  useEffect(() => {
    setNonSubmitterPage(1);
  }, [monthFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setNonSubmitterPage(1);
  }, [searchQuery, statusFilter, monthFilter, activeTableTab]);

  const sendReminder = (employeeRows, targetMonth) => {
    if (!employeeRows.length) {
      frappe.msgprint({
        title: "No Non-Submitters",
        message: `All employees have submitted for ${formatMonth(targetMonth)}.`,
        indicator: "green",
      });
      return;
    }

    const employeeList = employeeRows.map((e) => e.name);
    const preview = employeeRows.slice(0, 5).map((e) => e.employee_name).join(", ");
    const extra = employeeRows.length > 5 ? ` and ${employeeRows.length - 5} more` : "";

    frappe.confirm(
      `Send a reminder to <strong>${employeeRows.length}</strong> employee(s)?<br><small style="color:#6c757d">${preview}${extra}</small>`,
      () => {
        frappe.call({
          method: NOTIFY_API,
          args: { month_year: targetMonth, employee_list: JSON.stringify(employeeList) },
          freeze: true,
          freeze_message: "Sending reminders…",
          callback: (r) => {
            frappe.show_alert({ message: r.message, indicator: "green" });
          },
        });
      }
    );
  };

  const handleNotify = () => {
    const targetMonth = monthFilter || currentMonthYear;
    sendReminder(filteredNonSubmitters, targetMonth);
  };

  const title = employee
    ? `${employee.employee_name}'s Timesheet Submissions`
    : role === "employee"
      ? "My Timesheet Submissions"
      : role === "supervisor"
        ? "My Team's Timesheet Submissions"
        : null;

  return {
    PAGE_SIZE,
    role,
    title,
    loading,
    submissions,
    filteredSubmissions,
    filteredNonSubmitters,
    visibleNonSubmitterMonth,
    activeNonSubmitters: filteredNonSubmitters,
    monthFilter,
    setMonthFilter,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    nonSubmitterPage,
    setNonSubmitterPage,
    activeTableTab,
    setActiveTableTab,
    monthOptions,
    showWorkflowState,
    showNonSubmittersSection,
    paginatedSubmissions,
    totalPages,
    formatMonth,
    handleNotify,
    sendReminder,
  };
}

export default useTimesheetSubmissions;
