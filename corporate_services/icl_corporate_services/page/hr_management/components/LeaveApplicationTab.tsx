import React, { useEffect, useState } from "react";

type LeaveRow = {
  name: string;
  employee?: string;
  employee_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
};

export function LeaveApplicationTab() {
  const frappe = (globalThis as any).frappe;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeaveRow[]>([]);

  useEffect(() => {
    setLoading(true);
    frappe.call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Leave Application",
        fields: [
          "name",
          "employee",
          "employee_name",
          "leave_type",
          "from_date",
          "to_date",
          "status",
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
            <h6 className="mb-1">Leave Application</h6>
            <p className="text-muted mb-0" style={{ fontSize: 12 }}>
              Manage leave requests and approvals.
            </p>
          </div>
          <div className="d-flex" style={{ gap: 8 }}>
            <button
              className="btn btn-default btn-sm"
              onClick={() => frappe?.set_route("List", "Leave Application")}
            >
              View List
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => frappe?.new_doc("Leave Application")}
            >
              New Leave Application
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-muted">Loading leave applications...</div>
        ) : !rows.length ? (
          <div className="text-muted">No leave applications found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-bordered align-middle">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
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
                          frappe?.set_route("Form", "Leave Application", row.name);
                        }}
                      >
                        {row.name}
                      </a>
                    </td>
                    <td>{row.employee_name || row.employee || ""}</td>
                    <td>{row.leave_type || ""}</td>
                    <td>{row.from_date || ""}</td>
                    <td>{row.to_date || ""}</td>
                    <td>{row.status || ""}</td>
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

