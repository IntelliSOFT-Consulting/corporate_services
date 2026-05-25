import React from "react";

const ITEMS = [
  {
    label: "Weekly Progress Report",
    doctype: "Weekly Progress Report",
    description: "Track weekly intern progress and supervisor feedback.",
  },
  {
    label: "Monthly Reflection",
    doctype: "Monthly Reflection",
    description: "Capture monthly performance reflection and learning.",
  },
  {
    label: "Intern Evaluation",
    doctype: "Intern Evaluation",
    description: "Complete intern performance evaluation forms.",
  },
];

export function EmployeeEngagementTab() {
  const frappe = (globalThis as any).frappe;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <h6 className="mb-1">Employee Engagement and Development</h6>
        <p className="text-muted mb-3" style={{ fontSize: 12 }}>
          Access and manage engagement forms and development check-ins.
        </p>

        <div className="row">
          {ITEMS.map((item) => (
            <div className="col-md-4 mb-3" key={item.doctype}>
              <div className="card h-100 border">
                <div className="card-body d-flex flex-column">
                  <h6 className="mb-2">{item.label}</h6>
                  <p className="text-muted mb-3" style={{ fontSize: 12 }}>
                    {item.description}
                  </p>
                  <div className="mt-auto d-flex" style={{ gap: 8 }}>
                    <button
                      className="btn btn-default btn-sm"
                      onClick={() => frappe?.set_route("List", item.doctype)}
                    >
                      View List
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => frappe?.new_doc(item.doctype)}
                    >
                      New
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

