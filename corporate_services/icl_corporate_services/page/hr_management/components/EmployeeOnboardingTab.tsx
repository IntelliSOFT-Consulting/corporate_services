import React, { useEffect, useState } from "react";

type OnboardingRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  date_of_joining?: string;
  department?: string;
  designation?: string;
  docstatus?: number;
  owner?: string;
  modified?: string;
};

export function EmployeeOnboardingTab() {
  const frappe = (globalThis as any).frappe;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OnboardingRow[]>([]);

  useEffect(() => {
    setLoading(true);
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Employee Onboarding",
        fields: [
          "name",
          "employee",
          "employee_name",
          "date_of_joining",
          "department",
          "designation",
          "docstatus",
          "owner",
          "modified",
        ],
        order_by: "modified desc",
        limit_page_length: 20,
      },
      callback: (r: any) => {
        setRows((r && r.message) || []);
        setLoading(false);
      },
      error: () => {
        setRows([]);
        setLoading(false);
      },
    });
  }, []);

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
          <div>
            <h6 className="mb-1">Employee Onboarding</h6>
            <p className="text-muted mb-0" style={{ fontSize: 12 }}>
              Track onboarding records and progress.
            </p>
          </div>
          <div className="d-flex" style={{ gap: 8 }}>
            <button
              className="btn btn-default btn-sm"
              onClick={() => frappe?.set_route("List", "Employee Onboarding")}
            >
              View List
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => frappe?.new_doc("Employee Onboarding")}
            >
              New Onboarding
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted">Loading onboarding records...</div>
        ) : !rows.length ? (
          <div className="text-muted">No onboarding records found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle">
              <thead>
                <tr>
                  <th>Onboarding</th>
                  <th>Employee</th>
                  <th>Joining Date</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Document Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          frappe?.set_route("Form", "Employee Onboarding", row.name);
                        }}
                      >
                        {row.name}
                      </a>
                    </td>
                    <td>{row.employee_name || row.employee || ""}</td>
                    <td>{row.date_of_joining || ""}</td>
                    <td>{row.department || ""}</td>
                    <td>{row.designation || ""}</td>
                    <td>
                      {row.docstatus === 1
                        ? "Submitted"
                        : row.docstatus === 2
                          ? "Cancelled"
                          : "Draft"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
