import React from "react";
import { createPortal } from "react-dom";

interface ListProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

type SidebarTab =
  | "dashboard"
  | "consultant-time-off"
  | "weekly-progress-report"
  | "monthly-reflection"
  | "leave-application"
  | "employee-onboarding"
  | "job-opening-dashboard"
  | "recruitment-report"
  | "job-applications"
  | "survey-manager"
  | "intern-evaluation"
  | "employee-turnover";

type Props = ListProps;

function NavLink({
  label,
  icon,
  onClick,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  count?: number;
}) {
  return (
    <div className="sm-sidebar-item" onClick={onClick}>
      <span className="d-flex align-items-center" style={{ gap: 8, flex: 1 }}>
        <span className="text-muted">{icon}</span>
        <span className="sm-sidebar-item-name">{label}</span>
      </span>
      {count !== undefined && count > 0 && (
        <span className="sm-sidebar-item-count">{count}</span>
      )}
    </div>
  );
}

function ListSidebar({ activeTab, onTabChange }: ListProps) {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    leaveManagement: false,
    employeeEngagement: false,
    internCompletion: false,
  });
  const frappe = (globalThis as any).frappe;

  const menuEntries = [
    {
      type: "item",
      key: "dashboard",
      label: "Dashboard",
      tab: "dashboard",
    },
    {
      type: "group",
      key: "leaveManagement",
      label: "Leave Management",
      tabs: ["consultant-time-off", "leave-application"] as SidebarTab[],
      items: [
        {
          label: "Consultant Time Off",
          tab: "consultant-time-off" as SidebarTab,
        },
        {
          label: "Leave Application",
          tab: "leave-application" as SidebarTab,
        },
      ],
    },
    {
      type: "group",
      key: "employeeEngagement",
      label: "Employee Engagement",
      tabs: ["weekly-progress-report", "monthly-reflection"] as SidebarTab[],
      items: [
        {
          label: "Weekly Progress Report",
          tab: "weekly-progress-report" as SidebarTab,
        },
        {
          label: "Monthly Reflection",
          tab: "monthly-reflection" as SidebarTab,
        },
      ],
    },
    {
      type: "group",
      key: "internCompletion",
      label: "Intern Completion",
      tabs: [] as SidebarTab[],
      items: [
        {
          label: "Internship Completion Report",
          route: ["List", "Internship Completion Report"] as const,
        },
      ],
    },
    {
      type: "group",
      key: "employeeOnboarding",
      label: "Employee Onboarding",
      tabs: ["employee-onboarding"] as SidebarTab[],
      items: [
        {
          label: "Employee Onboarding",
          tab: "employee-onboarding" as SidebarTab,
        },
      ],
    },
    {
      type: "group",
      key: "jobManagement",
      label: "Job Management",
      tabs: [
        "job-opening-dashboard",
        "recruitment-report",
        "job-applications",
      ] as SidebarTab[],
      items: [
        {
          label: "Job Opening Dashboard",
          tab: "job-opening-dashboard" as SidebarTab,
        },
        {
          label: "Recruitment Report",
          tab: "recruitment-report" as SidebarTab,
        },
        {
          label: "Job Applications",
          tab: "job-applications" as SidebarTab,
        }
      ],
    },


    {
      type: "item",
      key: "survey-manager",
      label: "Survey Manager",
      tab: "survey-manager",
    },
    {
      type: "item",
      key: "intern-evaluation",
      label: "Intern Evaluation",
      tab: "intern-evaluation",
    },
    {
      type: "item",
      key: "employee-turnover",
      label: "Employee Turnover",
      tab: "employee-turnover",
    },
  ] as const;

  React.useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };
      for (const entry of menuEntries) {
        if (entry.type !== "group") continue;
        if (entry.tabs.includes(activeTab)) {
          next[entry.key] = true;
        }
      }
      return next;
    });
  }, [activeTab]);

  function toggleGroup(key: string) {
    setOpenGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function renderGroup(group: (typeof menuEntries)[number]) {
    if (group.type !== "group") {
      return (
        <div
          key={group.key}
          className={`sm-sidebar-item${activeTab === group.tab ? " active" : ""}`}
          onClick={() => onTabChange(group.tab)}
        >
          <span className="sm-sidebar-item-name">{group.label}</span>
        </div>
      );
    }

    const isOpen = !!openGroups[group.key];
    return (
      <React.Fragment key={group.key}>
        <div
          className="sm-sidebar-group-toggle"
          onClick={() => toggleGroup(group.key)}
        >
          <span className="sm-sidebar-item-name">{group.label}</span>
          <span className="text-muted">{isOpen ? "▾" : "▸"}</span>
        </div>
        {isOpen &&
          group.items.map((item) => (
            <div
              key={item.label}
              className={`sm-sidebar-item sm-sidebar-subitem${
                "tab" in item && activeTab === item.tab ? " active" : ""
              }`}
              onClick={() => {
                if ("tab" in item) {
                  onTabChange(item.tab);
                  return;
                }
                if ("route" in item) {
                  frappe?.set_route(...item.route);
                }
              }}
            >
              <span className="sm-sidebar-item-name">{item.label}</span>
            </div>
          ))}
      </React.Fragment>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="sm-sidebar-header">
        <p className="sm-sidebar-title">Dashboard</p>
      </div>
      <div className="sm-sidebar-list">{menuEntries.map(renderGroup)}</div>
    </div>
  );
}

export function PageSidebar({ ...listProps }: Props) {
  const sidebarRoot = document.getElementById("hr-sidebar-root");
  if (!sidebarRoot) return null;
  return createPortal(<ListSidebar {...listProps} />, sidebarRoot);
}
