import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { GlobalStyles } from "./ui/GlobalStyles";
import { ToastContainer } from "./ui/Toast";
import { SurveyListPanel } from "./SurveyList/SurveyListPanel";
import { SurveyDetailPanel } from "./SurveyDetail/SurveyDetailPanel";
import { useSurveys } from "./hooks/useSurveys";
import { ToastMessage } from "./types";
import { uid } from "./utils";

declare global {
  interface Window {
    frappe: any;
    initSurveyManager?: (page?: any) => void;
  }
}

function SurveyManagerApp({ page: _page }: { page: any }) {
  // -- Toast state (lifted to root so useSurveys can push toasts) ----------
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastMessage["type"]) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // -- Central surveys hook -------------------------------------------------
  const {
    surveys,
    listLoading,
    listError,
    selectedName,
    selectedRow,
    doc,
    docLoading,
    docError,
    dirty,
    isNew,
    analytics,
    analyticsLoading,
    publicUrl,
    linkCopied,
    selectSurvey,
    createNew,
    cancelNew,
    updateDoc,
    save,
    togglePublish,
    loadAnalytics,
    addSection,
    removeSection,
    addQuestion,
    removeQuestion,
    copyPublicLink,
  } = useSurveys({ addToast });

  return (
    <>
      <GlobalStyles />

      <div
        className="d-flex"
        style={{
          height: "calc(100vh - 114px)",
          overflow: "hidden",
          background: "var(--bg-color, #fff)",
        }}
      >
        {/* Left: Survey list */}
        <SurveyListPanel
          surveys={surveys}
          selectedName={selectedName}
          isNew={isNew}
          loading={listLoading}
          error={listError}
          onSelect={selectSurvey}
          onNew={createNew}
        />

        {/* Right: Survey detail + report */}
        <SurveyDetailPanel
          selectedRow={selectedRow}
          doc={doc}
          docLoading={docLoading}
          docError={docError}
          dirty={dirty}
          isNew={isNew}
          analytics={analytics}
          analyticsLoading={analyticsLoading}
          publicUrl={publicUrl}
          linkCopied={linkCopied}
          onUpdateDoc={updateDoc}
          onSave={save}
          onCancelNew={cancelNew}
          onTogglePublish={togglePublish}
          onLoadAnalytics={loadAnalytics}
          onAddSection={addSection}
          onRemoveSection={removeSection}
          onAddQuestion={addQuestion}
          onRemoveQuestion={removeQuestion}
          onCopyLink={copyPublicLink}
        />
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

// -- Mount helpers -----------------------------------------------------------

function mount(page: any) {
  const el = document.getElementById("survey-manager-root");
  if (!el) return;
  createRoot(el).render(<SurveyManagerApp page={page} />);
}

(globalThis as any).initSurveyManager = function initSurveyManager(page: any) {
  mount(page);
};

// Fallback for direct script inclusion (dev/test)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => mount(null));
} else if (document.getElementById("survey-manager-root")) {
  mount(null);
}
