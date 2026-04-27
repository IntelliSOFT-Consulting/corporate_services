import React, { useState } from "react";
import { Analytics } from "../types";
import { QuestionReportCard } from "./QuestionReportCard";
import { Spinner } from "../ui/Spinner";
import { Fade } from "../ui/Fade";

interface ResponseReportProps {
  analytics: Analytics | null;
  loading: boolean;
  onLoad: (department?: string) => void;
  totalSubmissions: number;
}

export function ResponseReport({
  analytics,
  loading,
  onLoad,
  totalSubmissions,
}: ResponseReportProps) {
  const [selectedDept, setSelectedDept] = useState<string>("");

  const handleDeptChange = (dept: string) => {
    setSelectedDept(dept);
    onLoad(dept || undefined);
  };
  // -- Loading ------------------------------------------------------------
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          padding: "48px 0",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <Spinner />
        <span>Loading report…</span>
      </div>
    );
  }

  // -- Empty / not yet loaded ---------------------------------------------
  if (!analytics) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 12 }}>📊</div>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--text-color)" }}>
          Response Report
        </p>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            maxWidth: 340,
            margin: "0 auto 20px",
          }}
        >
          View per-question grouped results across all{" "}
          <strong>{totalSubmissions}</strong> submission
          {totalSubmissions !== 1 ? "s" : ""}.
        </p>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={onLoad}
          style={{ padding: "5px 20px" }}
        >
          Load Report
        </button>
      </div>
    );
  }

  // -- Derived stats ------------------------------------------------------
  const avgRate =
    analytics.questions.length > 0
      ? Math.round(
          analytics.questions.reduce((sum, q) => {
            const r =
              analytics.total_responses > 0
                ? (q.response_count / analytics.total_responses) * 100
                : 0;
            return sum + r;
          }, 0) / analytics.questions.length
        )
      : 0;

  const openEndedCount = analytics.questions.filter(
    (q) => q.question_type === "TEXT"
  ).length;

  const stats = [
    {
      num: analytics.total_responses,
      label: "Total Responses",
      color: "var(--primary, #5e64ff)",
    },
    {
      num: analytics.questions.length,
      label: "Questions",
      color: "#0d6efd",
    },
    {
      num: openEndedCount,
      label: "Open-ended",
      color: "#6610f2",
    },
    {
      num: `${avgRate}%`,
      label: "Avg. Response Rate",
      color:
        avgRate >= 75 ? "#36b37e" : avgRate >= 50 ? "#ff8b00" : "#e24c4c",
    },
  ];

  return (
    <Fade>
      {/* -- Summary stat strip -------------------------------------------- */}
      <div
        className="frappe-card"
        style={{
          display: "flex",
          marginBottom: 20,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {/* Vertical divider between cells */}
            {i > 0 && (
              <div
                style={{
                  width: 1,
                  background: "var(--border-color)",
                  flexShrink: 0,
                  alignSelf: "stretch",
                }}
              />
            )}

            {/* Stat cell */}
            <div
              style={{
                flex: 1,
                textAlign: "center",
                padding: "14px 8px",
                background: "var(--subtle-accent)",
              }}
            >
             
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: s.color,
                  lineHeight: 1.1,
                  marginBottom: 2,
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* -- Section heading + department filter + refresh ----------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 8,
          flexWrap: "wrap",
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
          Per-question Results
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Department filter */}
          {analytics.departments.length > 0 && (
            <select
              className="form-control form-control-sm"
              style={{ fontSize: 12, height: 26, padding: "2px 8px", minWidth: 160 }}
              value={selectedDept}
              onChange={(e) => handleDeptChange(e.target.value)}
              disabled={loading}
            >
              <option value="">All Departments</option>
              {analytics.departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}

          <button
            className="btn btn-xs btn-default"
            type="button"
            onClick={() => onLoad(selectedDept || undefined)}
            title="Refresh report data"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* -- Per-question cards --------------------------------------------- */}
      {analytics.questions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          No questions found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {analytics.questions.map((q, i) => (
            <QuestionReportCard
              key={q.name}
              question={q}
              totalResponses={analytics.total_responses}
              questionNumber={i + 1}
            />
          ))}
        </div>
      )}
    </Fade>
  );
}