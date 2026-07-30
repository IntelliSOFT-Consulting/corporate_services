import React from "react";
import { createRoot } from "react-dom/client";

import { ProjectManagementApp } from "./App";

declare global {
  interface Window {
    frappe: any;
    initProjectManagement?: (page?: any) => void;
  }
}

function mount(page: any) {
  const el = document.getElementById("project-management-root");
  if (!el) return;
  createRoot(el).render(<ProjectManagementApp page={page} />);
}

(globalThis as any).initProjectManagement = function initProjectManagement(
  page: any,
) {
  mount(page);
};
