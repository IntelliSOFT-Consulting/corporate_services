import React, { useState, useRef, useEffect } from "react";

export interface Employee {
  name: string;
  employee_name: string;
}

interface Props {
  value: Employee[];
  onChange: (employees: Employee[]) => void;
  placeholder?: string;
}

export function MentionInput({ value, onChange, placeholder = "Type @ to assign employees…" }: Props) {
  const frappe = (globalThis as any).frappe;
  const [inputVal, setInputVal] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract query after last @
  const atPos = inputVal.lastIndexOf("@");
  const query = atPos >= 0 ? inputVal.slice(atPos + 1) : "";

  useEffect(() => {
    if (atPos < 0 || query.length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await frappe.call({
          method: "corporate_services.api.opportunity.search_employees",
          args: { query },
        });
        const filtered = (r?.message || []).filter(
          (e: Employee) => !value.find((v) => v.name === e.name)
        );
        setResults(filtered);
        setShowDropdown(filtered.length > 0);
        setActiveIdx(0);
      } catch {
        setResults([]);
        setShowDropdown(false);
      }
    }, 200);
  }, [query, atPos]);

  function selectEmployee(emp: Employee) {
    onChange([...value, emp]);
    // Remove the @query from input
    setInputVal(inputVal.slice(0, atPos));
    setShowDropdown(false);
    setResults([]);
    inputRef.current?.focus();
  }

  function removeEmployee(name: string) {
    onChange(value.filter((e) => e.name !== name));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIdx]) selectEmployee(results[activeIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          border: "1px solid var(--border-color)",
          borderRadius: 6,
          background: "var(--control-bg)",
          minHeight: 34,
          cursor: "text",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((emp) => (
          <span
            key={emp.name}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "var(--blue-100, #dbeafe)",
              color: "var(--blue-700, #1d4ed8)",
              borderRadius: 4,
              padding: "2px 6px",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {emp.employee_name}
            <span
              onClick={(e) => { e.stopPropagation(); removeEmployee(emp.name); }}
              style={{ cursor: "pointer", opacity: 0.7, lineHeight: 1 }}
            >
              ×
            </span>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          placeholder={value.length === 0 ? placeholder : ""}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 13,
            flex: "1 1 120px",
            minWidth: 80,
            padding: "2px 0",
          }}
        />
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--fg-color)",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {results.map((emp, i) => (
            <div
              key={emp.name}
              onMouseDown={() => selectEmployee(emp)}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                cursor: "pointer",
                background: i === activeIdx ? "var(--control-bg-on-gray)" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {emp.employee_name.charAt(0).toUpperCase()}
              </span>
              <div>
                <div style={{ fontWeight: 500 }}>{emp.employee_name}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{emp.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
