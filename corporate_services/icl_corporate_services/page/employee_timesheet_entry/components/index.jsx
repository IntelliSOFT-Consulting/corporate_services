import React from "react";
import { createRoot } from "react-dom/client";
import TimesheetEntryApp from "./TimesheetEntryApp";

window.initTimesheetEntry = function(page, submissionName, onContextChange) {
    const container = document.createElement("div");
    container.id = "ts-entry-root";
    page.main[0].appendChild(container);
    const root = createRoot(container);
    root.render(<TimesheetEntryApp submissionName={submissionName} onContextChange={onContextChange} />);
};
