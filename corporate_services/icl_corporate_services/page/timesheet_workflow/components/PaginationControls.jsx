import React from "react";

function PaginationControls({ currentPage, totalPages, totalItems, onPageChange, pageSize = 10 }) {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap mt-2 mb-3" style={{ gap: 8 }}>
      <div style={{ fontSize: 12, color: "#6c757d" }}>
        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
      </div>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item${currentPage === 1 ? " disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(1)} disabled={currentPage === 1}>«</button>
        </li>
        <li className={`page-item${currentPage === 1 ? " disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange((p) => p - 1)} disabled={currentPage === 1}>‹</button>
        </li>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
          .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <li key={`ellipsis-${i}`} className="page-item disabled"><span className="page-link">…</span></li>
            ) : (
              <li key={p} className={`page-item${currentPage === p ? " active" : ""}`}>
                <button className="page-link" onClick={() => onPageChange(p)}>{p}</button>
              </li>
            )
          )}
        <li className={`page-item${currentPage === totalPages ? " disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange((p) => p + 1)} disabled={currentPage === totalPages}>›</button>
        </li>
        <li className={`page-item${currentPage === totalPages ? " disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>»</button>
        </li>
      </ul>
    </div>
  );
}

export default PaginationControls;
