import React, { useEffect, useState } from "react";

export type Column<T> = {
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  render: (row: T) => React.ReactNode;
};

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, idx: number) => string;
  emptyText: string;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 10;

export function RelatedTable<T>({
  columns,
  rows,
  getKey,
  emptyText,
  pageSize = DEFAULT_PAGE_SIZE,
}: Props<T>) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [rows]);

  if (rows.length === 0) {
    return <div className="pm-empty-inline">{emptyText}</div>;
  }

  const visible = showAll ? rows : rows.slice(0, pageSize);
  const hidden = rows.length - visible.length;

  return (
    <div className="pm-related-table-wrap">
      <table className="table table-sm pm-related-table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} style={{ width: c.width, textAlign: c.align }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, idx) => (
            <tr key={getKey(row, idx)}>
              {columns.map((c, i) => (
                <td key={i} style={{ textAlign: c.align }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(hidden > 0 || showAll) && (
        <div className="pm-related-table-footer" style={{ textAlign: "center", fontSize: 12, padding: "6px 0" }}>
          {showAll ? (
            <button className="btn btn-link btn-sm p-0" onClick={() => setShowAll(false)}>
              Show fewer
            </button>
          ) : (
            <button className="btn btn-link btn-sm p-0" onClick={() => setShowAll(true)}>
              Show {hidden} more row{hidden !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
