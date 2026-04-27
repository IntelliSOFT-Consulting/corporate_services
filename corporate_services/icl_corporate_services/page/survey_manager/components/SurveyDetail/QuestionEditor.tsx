import React from "react";
import { SurveyQuestionRow, QuestionType } from "../types";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "TEXT", label: "Free Text" },
  { value: "SINGLE_SELECT", label: "Single Select" },
  { value: "MULTI_SELECT", label: "Multi Select" },
  { value: "RATING", label: "Rating" },
];

interface QuestionEditorProps {
  question: SurveyQuestionRow;
  qIdx: number;
  onUpdate: (updater: (q: SurveyQuestionRow) => SurveyQuestionRow) => void;
  onRemove: () => void;
}

export function QuestionEditor({ question, qIdx, onUpdate, onRemove }: QuestionEditorProps) {
  const hasOptions =
    question.question_type === "SINGLE_SELECT" ||
    question.question_type === "MULTI_SELECT";

  return (
    <div
      className="frappe-card"
      style={{ padding: 12, marginBottom: 0 }}
    >
      {/* -- Top row: badge + question text + remove -------------------- */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>

        {/* Q number badge */}
        <span
          className="indicator-pill gray"
          style={{
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 5,
            minWidth: 28,
            textAlign: "center",
          }}
        >
          Q{qIdx + 1}
        </span>

        {/* Main body */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Question text input */}
          <input
            className="form-control"
            style={{ fontSize: 13, marginBottom: 8, height: 30 }}
            placeholder="Question text…"
            value={question.question_text}
            onChange={(e) =>
              onUpdate((q) => ({ ...q, question_text: e.target.value }))
            }
          />

          {/* Type + Required + Order row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {/* Question type */}
            <select
              className="form-control"
              style={{ width: 150, fontSize: 12, height: 28, padding: "3px 8px" }}
              value={question.question_type}
              onChange={(e) =>
                onUpdate((q) => ({
                  ...q,
                  question_type: e.target.value as QuestionType,
                  options: "",
                }))
              }
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Required checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                cursor: "pointer",
                color: "var(--text-color)",
                margin: 0,
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={!!question.is_required}
                onChange={(e) =>
                  onUpdate((q) => ({
                    ...q,
                    is_required: e.target.checked ? 1 : 0,
                  }))
                }
                style={{ cursor: "pointer" }}
              />
              Required
            </label>

            {/* Order */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginLeft: "auto",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Order:
              </span>
              <input
                className="form-control"
                style={{ width: 54, fontSize: 12, height: 28, textAlign: "center", padding: "3px 6px" }}
                type="number"
                min={1}
                value={question.order}
                onChange={(e) =>
                  onUpdate((q) => ({ ...q, order: Number(e.target.value) }))
                }
              />
            </div>
          </div>
        </div>

        {/* Remove button */}
        <button
          className="btn btn-xs btn-default"
          type="button"
          onClick={onRemove}
          title="Remove question"
          style={{ color: "var(--red-500, #e24c4c)", flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {/* -- Options textarea (SINGLE_SELECT / MULTI_SELECT) ------------ */}
      {hasOptions && (
        <div style={{ marginTop: 10 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: 4,
            }}
          >
            Options (one per line)
          </label>
          <textarea
            className="form-control"
            rows={3}
            placeholder={"Option A\nOption B\nOption C"}
            value={question.options ?? ""}
            onChange={(e) =>
              onUpdate((q) => ({ ...q, options: e.target.value }))
            }
            style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
          />
        </div>
      )}

      {/* -- Follow-up text ---------------------------------------------- */}
      <div style={{ marginTop: 8 }}>
        <input
          className="form-control"
          style={{ fontSize: 12, height: 28 }}
          placeholder="Follow-up question text (optional)"
          value={question.follow_up_text ?? ""}
          onChange={(e) =>
            onUpdate((q) => ({ ...q, follow_up_text: e.target.value }))
          }
        />
      </div>
    </div>
  );
}