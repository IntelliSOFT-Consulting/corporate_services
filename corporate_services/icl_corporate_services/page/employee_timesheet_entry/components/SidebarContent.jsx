import React from "react";
import { formatMonthYearLabel } from "./utils";

export default function SidebarContent({ visibleSubmissions, activeSubmission, loadContext }) {
    return (
        <div className="frappe-card" style={{ padding: 10, height: "fit-content" }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Available Months</div>
            {visibleSubmissions.map((s) => (
                <button
                    key={s.name}
                    className={`btn btn-xs ${s.name === activeSubmission ? "btn-primary" : "btn-default"}`}
                    style={{ width: "100%", marginBottom: 6, textAlign: "left" }}
                    onClick={() => loadContext(s.name)}
                >
                    {formatMonthYearLabel(s.month_year)}
                </button>
            ))}
        </div>
    );
}
