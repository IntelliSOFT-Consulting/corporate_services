import React from "react";
import { createPortal } from "react-dom";
import { useSidebarExits } from "./hooks/useSidebarExits";
import { ExitRow } from "./types";

interface ListProps {
  year: number;
  activeEmployee: string | null;
  onOpen: (employee: string) => void;
}

interface DetailProps {
  employee: string;
  employeeName?: string;
  exitInterviewId?: string | null;
  onBack: () => void;
}

function NavLink({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="sm-sidebar-item" onClick={onClick}>
      <span className="d-flex align-items-center" style={{ gap: 8 }}>
        <span className="text-muted">{icon}</span>
        <span className="sm-sidebar-item-name">{label}</span>
      </span>
    </div>
  );
}

function DetailSidebar({ employee, employeeName, exitInterviewId, onBack }: DetailProps) {
  const frappe = (globalThis as any).frappe;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sm-sidebar-header">
        <button
          type="button"
          className="btn btn-default btn-xs w-100 text-left d-flex align-items-center"
          style={{ gap: 6 }}
          onClick={onBack}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          All Exits
        </button>
        <div className="text-muted mt-2" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {employeeName || employee}
        </div>
        <div className="text-muted" style={{ fontSize: 10 }}>{employee}</div>
      </div>

      <div className="sm-sidebar-list">
        <div className="px-2 pt-2 pb-1">
          <span className="text-muted" style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Record
          </span>
        </div>

        <NavLink
          label="Open Employee Form"
          onClick={() => frappe?.set_route("Form", "Employee", employee)}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          }
        />

        {exitInterviewId && (
          <NavLink
            label="Open Exit Interview"
            onClick={() => frappe?.set_route("Form", "Exit Interview", exitInterviewId)}
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
            }
          />
        )}

        <NavLink
          label="Leave Applications"
          onClick={() => frappe?.set_route("List", "Leave Application", { employee })}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function ListSidebar({ year, activeEmployee, onOpen }: ListProps) {
  const { exits, loading } = useSidebarExits({ year });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sm-sidebar-header">
        <p className="sm-sidebar-title">Exits {year}</p>
        {!loading && (
          <span className="text-muted" style={{ fontSize: 11 }}>
            {exits.length} employee{exits.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="sm-sidebar-list">
        {loading ? (
          <div className="text-muted px-3 py-2" style={{ fontSize: 12 }}>Loading…</div>
        ) : exits.length === 0 ? (
          <div className="text-muted px-3 py-2" style={{ fontSize: 12 }}>No exits for {year}</div>
        ) : (
          exits.map((row: ExitRow) => (
            <div
              key={row.name}
              className={`sm-sidebar-item${activeEmployee === row.name ? " active" : ""}`}
              onClick={() => onOpen(row.name)}
              title={row.employee_name}
            >
              <span className="d-flex flex-column" style={{ minWidth: 0 }}>
                <span className="sm-sidebar-item-name" style={{ fontWeight: activeEmployee === row.name ? 600 : undefined }}>
                  {row.employee_name || row.name}
                </span>
                {row.department && (
                  <span className="text-muted" style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.department}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface Props {
  year: number;
  activeEmployee: string | null;
  activeEmployeeName?: string;
  activeExitInterviewId?: string | null;
  onOpen: (employee: string) => void;
  onBack: () => void;
}

export function TurnoverSidebar({ year, activeEmployee, activeEmployeeName, activeExitInterviewId, onOpen, onBack }: Props) {
  const sidebarRoot = document.getElementById("et-sidebar-root");
  if (!sidebarRoot) return null;

  const content = activeEmployee ? (
    <DetailSidebar
      employee={activeEmployee}
      employeeName={activeEmployeeName}
      exitInterviewId={activeExitInterviewId}
      onBack={onBack}
    />
  ) : (
    <ListSidebar year={year} activeEmployee={activeEmployee} onOpen={onOpen} />
  );

  return createPortal(content, sidebarRoot);
}
