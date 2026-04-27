import React, { useState } from "react";

const PAGE_SIZE = 20;

interface TextResponseListProps {
  responses: string[];
}

export function TextResponseList({ responses }: TextResponseListProps) {
  const [page, setPage] = useState(0);

  const total  = responses.length;
  const pages  = Math.ceil(total / PAGE_SIZE);
  const slice  = responses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (total === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
        No text responses yet.
      </div>
    );
  }

  return (
    <div>
      {/* -- Response list ------------------------------------------------ */}
      <div
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: 5,
          overflow: "hidden",
          background: "var(--card-bg, #fff)",
        }}
      >
        {slice.map((r, i) => (
          <div
            key={i}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text-color)",
              borderBottom:
                i < slice.length - 1
                  ? "1px solid var(--border-color)"
                  : "none",
            }}
          >
            {r ? (
              <span>{r}</span>
            ) : (
              <em style={{ fontSize: 12, color: "var(--text-muted)" }}>
                - (blank)
              </em>
            )}
          </div>
        ))}
      </div>

      {/* -- Pagination --------------------------------------------------- */}
      {pages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            fontSize: 12,
          }}
        >
          <button
            className="btn btn-xs btn-default"
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>

          <span style={{ color: "var(--text-muted)" }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>

          <button
            className="btn btn-xs btn-default"
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* -- Total count (single page) ------------------------------------- */}
      {pages <= 1 && total > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          {total} response{total !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}