import React from "react";
import { createRoot } from "react-dom/client";
import DevWorkspaceApp from "./DevWorkspaceApp";

window.initDevWorkspace = function (page) {
    const container = document.createElement("div");
    container.id = "dev-workspace-root";
    page.main[0].appendChild(container);
    const root = createRoot(container);
    root.render(<DevWorkspaceApp />);
};
