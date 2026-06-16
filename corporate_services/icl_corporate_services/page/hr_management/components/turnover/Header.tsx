import React from "react";

interface HeaderProps {
  year: number;
  onYearChange: (year: number) => void;
  availableYears: number[];
}

export function Header({ year, onYearChange, availableYears }: HeaderProps) {
  return (
    <div className="et-header et-fade-in">
      <div>
        <h5 className="et-header-title">Employee Turnover</h5>
        <p className="et-header-subtitle">
          Permanent employees only - excludes consultants and interns
        </p>
      </div>
      <div className="et-header-actions">
        <label
          htmlFor="et-year-select"
          className="text-muted"
          style={{ fontSize: 12, margin: 0 }}
        >
          Year:
        </label>
        <select
          id="et-year-select"
          className="form-control form-control-sm"
          style={{ width: "auto" }}
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
