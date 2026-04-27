import React, { useState, useEffect } from "react";
import { SurveyDoc, SurveyRow, SurveyQuestionRow, Analytics } from "../types";
import { Spinner } from "../ui/Spinner";
import { Fade } from "../ui/Fade";
import { Badge } from "../ui/Badge";
import { MetaFields } from "./MetaFields";
import { SectionEditor } from "./SectionEditor";
import { ResponseReport } from "../Report/ResponseReport";

type TabId = "edit" | "report";

interface SurveyDetailPanelProps {
  selectedRow: SurveyRow | null;
  doc: SurveyDoc | null;
  docLoading: boolean;
  docError: string | null;
  dirty: boolean;
  isNew: boolean;
  analytics: Analytics | null;
  analyticsLoading: boolean;
  publicUrl: string;
  linkCopied: boolean;
  onUpdateDoc: (updater: (d: SurveyDoc) => SurveyDoc) => void;
  onSave: () => void;
  onCancelNew: () => void;
  onTogglePublish: () => void;
  onLoadAnalytics: (department?: string) => void;
  onAddSection: () => void;
  onRemoveSection: (idx: number) => void;
  onAddQuestion: (sectionIdx: number) => void;
  onRemoveQuestion: (sectionIdx: number, qIdx: number) => void;
  onCopyLink: () => void;
}

export function SurveyDetailPanel({
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
  onUpdateDoc,
  onSave,
  onCancelNew,
  onTogglePublish,
  onLoadAnalytics,
  onAddSection,
  onRemoveSection,
  onAddQuestion,
  onRemoveQuestion,
  onCopyLink,
}: SurveyDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("edit");

  useEffect(() => {
    setActiveTab("edit");
  }, [selectedRow?.name]);

  useEffect(() => {
    if (activeTab === "report" && !analytics && !analyticsLoading) {
      onLoadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const hasSubmissions = (selectedRow?.total_submissions ?? 0) > 0;

  // -- Empty state ----------------------------------------------------------
  if (!doc && !docLoading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
        <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
          Select a survey
        </p>
        <p style={{ fontSize: 13, margin: 0, color: "var(--text-muted)" }}>
          Choose a survey from the list, or create a new one.
        </p>
      </div>
    );
  }

  // -- Loading spinner ------------------------------------------------------
  if (docLoading && !doc) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: "var(--text-muted)",
        }}
      >
        <div className="frappe-loading" />
        <span style={{ fontSize: 13 }}>Loading survey…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* -- Page header ----------------------------------------------------- */}
      <div
        style={{
          background: "var(--card-bg)",
          borderBottom: "1px solid var(--border-color)",
          padding: "12px 20px 0",
        }}
      >
        {/* Title + toolbar row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          {/* Left: title + meta */}
          <div style={{ minWidth: 0 }}>
            <h5
              style={{
                fontSize: 16,
                fontWeight: 600,
                margin: "0 0 4px",
                color: "var(--heading-color)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isNew
                ? "New Survey"
                : doc?.title || selectedRow?.title || "Untitled Survey"}
            </h5>

            {!isNew && selectedRow && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <Badge published={!!selectedRow.is_published} />
                <span>
                  {selectedRow.total_submissions ?? 0}{" "}
                  {(selectedRow.total_submissions ?? 0) === 1
                    ? "response"
                    : "responses"}
                </span>
                {selectedRow.modified && (
                  <span>
                    · Modified{" "}
                    {new Date(selectedRow.modified).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {dirty && (
              <span
                className="indicator-pill orange"
                style={{ fontSize: 11 }}
              >
                Unsaved changes
              </span>
            )}

            {isNew && (
              <button
                className="btn btn-default btn-sm"
                type="button"
                onClick={onCancelNew}
              >
                Cancel
              </button>
            )}

            {!isNew && (
              <button
                className={`btn btn-sm ${
                  selectedRow?.is_published ? "btn-default" : "btn-secondary"
                }`}
                type="button"
                onClick={onTogglePublish}
                disabled={!selectedRow?.name || docLoading}
              >
                {selectedRow?.is_published ? "Unpublish" : "Publish"}
              </button>
            )}

            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={onSave}
              disabled={!dirty || docLoading}
            >
              {docLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {/* -- Tabs -------------------------------------------------------- */}
        <div className="form-tabs-list" style={{ display: "flex", gap: 0, marginBottom: -1 }}>
          <button
            type="button"
            className={`btn btn-tab${activeTab === "edit" ? " active" : ""}`}
            style={{ fontSize: 13 }}
            onClick={() => setActiveTab("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            className={`btn btn-tab${activeTab === "report" ? " active" : ""}${
              !hasSubmissions || isNew ? " disabled" : ""
            }`}
            style={{ fontSize: 13, opacity: !hasSubmissions || isNew ? 0.45 : 1 }}
            onClick={() => {
              if (hasSubmissions && !isNew) setActiveTab("report");
            }}
            title={
              isNew
                ? "Save the survey first"
                : !hasSubmissions
                ? "No responses yet"
                : undefined
            }
          >
            Report
            {hasSubmissions && !isNew && (
              <span
                className="count-badge"
                style={{
                  marginLeft: 5,
                  background: "var(--blue-500, #2490ef)",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "0 6px",
                  fontSize: 10,
                  fontWeight: 600,
                  verticalAlign: "middle",
                }}
              >
                {selectedRow?.total_submissions}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* -- Tab content ----------------------------------------------------- */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "20px",
          background: "var(--bg-color)",
        }}
      >
        {/* Error */}
        {docError && (
          <div className="alert alert-danger" style={{ fontSize: 13, marginBottom: 16 }}>
            <strong>Error:</strong> {docError}
          </div>
        )}

        {/* Edit tab */}
        {activeTab === "edit" && doc && (
          <Fade key={`edit-${selectedRow?.name ?? "new"}`}>

            {/* Meta fields - Frappe form card */}
            <div className="frappe-card" style={{ marginBottom: 20, padding: 16 }}>
              <MetaFields
                doc={doc}
                publicUrl={publicUrl}
                linkCopied={linkCopied}
                onUpdate={onUpdateDoc}
                onCopyLink={onCopyLink}
              />
            </div>

            {/* Sections header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                }}
              >
                Sections &amp; Questions
              </span>
              <button
                className="btn btn-xs btn-default"
                type="button"
                onClick={onAddSection}
              >
                + Add Section
              </button>
            </div>

            {/* Sections list */}
            {doc.sections.length === 0 ? (
              <div
                className="frappe-card"
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                  No sections yet
                </p>
                <p style={{ fontSize: 13, marginBottom: 16 }}>
                  Surveys are organised into sections, each containing questions.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={onAddSection}
                >
                  + Add First Section
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {doc.sections.map((section, si) => (
                  <SectionEditor
                    key={
                      section.name ||
                      section.__temporary_name ||
                      `section-${si}`
                    }
                    section={section}
                    sectionIdx={si}
                    onUpdateSection={(updater) =>
                      onUpdateDoc((d) => ({
                        ...d,
                        sections: d.sections.map((s, i) =>
                          i === si ? updater(s) : s
                        ),
                      }))
                    }
                    onRemove={() => onRemoveSection(si)}
                    onAddQuestion={() => onAddQuestion(si)}
                    onRemoveQuestion={(qi) => onRemoveQuestion(si, qi)}
                    onUpdateQuestion={(
                      qi: number,
                      updater: (q: SurveyQuestionRow) => SurveyQuestionRow
                    ) =>
                      onUpdateDoc((d) => ({
                        ...d,
                        sections: d.sections.map((s, i) => {
                          if (i !== si) return s;
                          return {
                            ...s,
                            questions: s.questions.map((q, j) =>
                              j === qi ? updater(q) : q
                            ),
                          };
                        }),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </Fade>
        )}

        {/* Report tab */}
        {activeTab === "report" && (
          <Fade key={`report-${selectedRow?.name}`}>
            <ResponseReport
              analytics={analytics}
              loading={analyticsLoading}
              onLoad={onLoadAnalytics}
              totalSubmissions={selectedRow?.total_submissions ?? 0}
            />
          </Fade>
        )}
      </div>
    </div>
  );
}