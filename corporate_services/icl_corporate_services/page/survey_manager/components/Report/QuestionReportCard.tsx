import React, { useEffect, useState } from "react";
import { AnalyticsQuestion } from "../types";
import { BarChart, BarChartItem } from "./BarChart";
import { TextResponseList } from "./TextResponseList";

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Free Text",
  SINGLE_SELECT: "Single Select",
  MULTI_SELECT: "Multi Select",
  RATING: "Rating",
};

const TYPE_BADGE_COLOR: Record<string, string> = {
  TEXT:          "#6c757d",
  SINGLE_SELECT: "#0d6efd",
  MULTI_SELECT:  "#6610f2",
  RATING:        "#fd7e14",
};

interface QuestionReportCardProps {
  question: AnalyticsQuestion;
  totalResponses: number;
  questionNumber: number;
}

export function QuestionReportCard({
  question,
  totalResponses,
  questionNumber,
}: QuestionReportCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [rateMounted, setRateMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRateMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const hasAggregation =
    (question.question_type === "SINGLE_SELECT" ||
      question.question_type === "MULTI_SELECT" ||
      question.question_type === "RATING") &&
    Object.keys(question.aggregation).length > 0;

  const barItems: BarChartItem[] = hasAggregation
    ? Object.entries(question.aggregation)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
    : [];

  const skipCount    = totalResponses - question.response_count;
  const responseRate =
    totalResponses > 0
      ? Math.round((question.response_count / totalResponses) * 100)
      : 0;

  const rateColor =
    responseRate >= 80 ? "#36b37e"
    : responseRate >= 50 ? "var(--primary, #5e64ff)"
    : "#ff8b00";

  const badgeColor = TYPE_BADGE_COLOR[question.question_type] ?? "#6c757d";

  return (
    <div
      className="frappe-card"
      style={{ overflow: "hidden", marginBottom: 12, padding: 0 }}
    >
      {/* -- Card header --------------------------------------------------- */}
      <div
        style={{
          background: "var(--subtle-accent)",
          borderBottom: expanded ? "1px solid var(--border-color)" : "none",
          padding: "10px 14px",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>

          {/* Q number */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--primary, #5e64ff)",
              flexShrink: 0,
              minWidth: 28,
              paddingTop: 1,
            }}
          >
            Q{questionNumber}
          </span>

          {/* Question text + type badge + section */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.45,
                color: "var(--text-color)",
              }}
            >
              {question.question_text}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              {/* Type badge */}
              <span
                style={{
                  display: "inline-block",
                  background: badgeColor,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 7px",
                  borderRadius: 3,
                  lineHeight: 1.6,
                }}
              >
                {TYPE_LABELS[question.question_type] ?? question.question_type}
              </span>

              {/* Section name */}
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {question.section}
              </span>
            </div>
          </div>

          {/* Response stats + mini rate bar */}
          <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "var(--text-color)" }}>
                {question.response_count}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                /{totalResponses}
              </span>
            </div>

            <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              {responseRate}% answered
              {skipCount > 0 && ` · ${skipCount} skipped`}
            </div>

            {/* Mini progress bar */}
            <div
              style={{
                marginTop: 5,
                height: 4,
                borderRadius: 4,
                background: "var(--border-color, #eaecef)",
                overflow: "hidden",
                minWidth: 80,
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 4,
                  background: rateColor,
                  width: rateMounted ? `${responseRate}%` : "0%",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>

          {/* Expand / collapse caret */}
          <span
            style={{
              flexShrink: 0,
              marginTop: 3,
              fontSize: 11,
              color: "var(--text-muted)",
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              display: "inline-block",
            }}
          >
            ▶
          </span>
        </div>
      </div>

      {/* -- Card body ----------------------------------------------------- */}
      {expanded && (
        <div style={{ padding: 14, background: "var(--card-bg)" }}>
          {hasAggregation && (
            <BarChart items={barItems} total={question.response_count} />
          )}

          {question.question_type === "TEXT" && (
            <TextResponseList responses={question.text_responses} />
          )}

          {!hasAggregation && question.question_type !== "TEXT" && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              No responses recorded.
            </div>
          )}

          {/* -- Follow-up responses ---------------------------------------- */}
          {question.follow_up_text && question.follow_up_responses.length > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px dashed var(--border-color)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                Follow-up: {question.follow_up_text}
              </div>
              <TextResponseList responses={question.follow_up_responses} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}