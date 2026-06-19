import React from "react";

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
}

export function RelatedTable<T>({
  columns,
  rows,
  getKey,
  emptyText,
}: Props<T>) {
  if (rows.length === 0) {
    return <div className="pm-empty-inline">{emptyText}</div>;
  }
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
          {rows.map((row, idx) => (
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
    </div>
  );
}
