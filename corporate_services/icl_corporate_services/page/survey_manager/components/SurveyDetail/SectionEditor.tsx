import React, { useState } from "react";
import { SurveySectionRow, SurveyQuestionRow } from "../types";
import { QuestionEditor } from "./QuestionEditor";

interface SectionEditorProps {
  section: SurveySectionRow;
  sectionIdx: number;
  onUpdateSection: (updater: (s: SurveySectionRow) => SurveySectionRow) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (qIdx: number) => void;
  onUpdateQuestion: (
    qIdx: number,
    updater: (q: SurveyQuestionRow) => SurveyQuestionRow
  ) => void;
}

export function SectionEditor({
  section,
  sectionIdx,
  onUpdateSection,
  onRemove,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}: SectionEditorProps) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="frappe-card"
      style={{ overflow: "hidden", padding: 0 }}
    >
      {/* -- Section header ----------------------------------------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "var(--subtle-accent)",
          borderBottom: open ? "1px solid var(--border-color)" : "none",
          minHeight: 44,
        }}
      >
        {/* Collapse toggle */}
        <button
          className="btn btn-xs btn-default"
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{
            padding: "2px 6px",
            fontSize: 11,
            flexShrink: 0,
            minWidth: 26,
          }}
        >
          {open ? "▾" : "▸"}
        </button>

        {/* Section badge */}
        <span
          className="indicator-pill gray"
          style={{ fontSize: 10, fontWeight: 700, flexShrink: 0 }}
        >
          S{sectionIdx + 1}
        </span>

        {/* Section title */}
        <input
          className="form-control"
          style={{ maxWidth: 320, fontSize: 13, height: 28 }}
          placeholder="Section title…"
          value={section.title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            onUpdateSection((s) => ({ ...s, title: e.target.value }))
          }
        />

        {/* Order input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Order
          </span>
          <input
            className="form-control"
            style={{ width: 52, fontSize: 12, height: 28, textAlign: "center" }}
            type="number"
            min={1}
            value={section.order}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              onUpdateSection((s) => ({
                ...s,
                order: Number(e.target.value),
              }))
            }
          />
        </div>

        {/* Collapsed question count */}
        {!open && section.questions.length > 0 && (
          <span
            className="indicator-pill gray"
            style={{ fontSize: 10, flexShrink: 0 }}
          >
            {section.questions.length}Q
          </span>
        )}

        {/* Action buttons - pushed right */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            className="btn btn-xs btn-default"
            type="button"
            onClick={onAddQuestion}
            style={{ color: "var(--blue-500, #2490ef)" }}
          >
            + Question
          </button>
          <button
            className="btn btn-xs btn-default"
            type="button"
            onClick={onRemove}
            style={{ color: "var(--red-500, #e24c4c)" }}
            title="Remove section"
          >
            Remove
          </button>
        </div>
      </div>

      {/* -- Questions body ----------------------------------------------- */}
      {open && (
        <div style={{ padding: 12, background: "var(--card-bg)" }}>
          {section.questions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px 16px",
                border: "1px dashed var(--border-color)",
                borderRadius: 4,
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              No questions yet.{" "}
              <button
                className="btn btn-link btn-xs"
                type="button"
                onClick={onAddQuestion}
                style={{ fontSize: 13 }}
              >
                Add the first question
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.questions.map((q, qi) => (
                <QuestionEditor
                  key={
                    q.name ||
                    q.__temporary_name ||
                    `q-${sectionIdx}-${qi}`
                  }
                  question={q}
                  qIdx={qi}
                  onUpdate={(updater) => onUpdateQuestion(qi, updater)}
                  onRemove={() => onRemoveQuestion(qi)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}