import React, { useState } from "react";
import { useOpportunityDetail } from "./hooks/useOpportunityDetail";
import { WorkflowStatus } from "./WorkflowStatus";
import { FileBrowser } from "./FileBrowser";
import { ChecklistTab } from "./ChecklistTab";
import { CreateChecklistForm } from "./CreateChecklistForm";

const STATUS_INDICATOR: Record<string, string> = {
  Open: "blue",
  Replied: "orange",
  Quotation: "yellow",
  "Lost Quotation": "red",
  Interested: "green",
  Converted: "green",
  "Do Not Contact": "red",
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-muted">-</span>;
  const color = STATUS_INDICATOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const isEmpty = value == null || value === "";
  return (
    <div>
      <div className="om-field-label">{label}</div>
      <div className={`om-field-value${isEmpty ? " empty" : ""}`}>
        {isEmpty ? "-" : value}
      </div>
    </div>
  );
}

function formatCurrency(amount?: number, currency?: string) {
  if (amount == null) return null;
  return `${currency ?? ""} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
}

function formatDate(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeStatus(value?: string) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface Props {
  opportunityId: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}

export function OpportunityDetail({ opportunityId, onBack }: Props) {
  const frappe = (globalThis as any).frappe;
  const { doc, loading, error, reload } = useOpportunityDetail(opportunityId);
  const [awarding, setAwarding] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [awardedProject, setAwardedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "checklist">("overview");
  const [subView, setSubView] = useState<"create-checklist" | null>(null);

  const isAwarded = doc?.custom_bid_status === "Awarded";
  const linkedProject = awardedProject || doc?.linked_project || null;
  const userRoles: string[] = frappe?.boot?.user?.roles || [];
  const canViewFinanceTab =
    Boolean(frappe?.user?.has_role?.("Finance")) || userRoles.includes("Finance");
  const canSendDueReminder = normalizeStatus(doc?.custom_bid_status) === "inprogress";

  async function handleAward() {
    if (!confirm(`Award opportunity "${opportunityId}" and create a project?`)) return;
    setAwarding(true);
    try {
      const r = await (globalThis as any).frappe.call({
        method: "corporate_services.api.opportunity.award_opportunity",
        args: { name: opportunityId },
      });
      const result = r?.message;
      if (result?.project?.name) {
        setAwardedProject(result.project.name);
        reload();
        (globalThis as any).frappe?.show_alert(
          { message: `Project ${result.project.name} created successfully`, indicator: "green" },
          5
        );
      }
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Award Failed",
        message: e?.message || "Could not create project.",
        indicator: "red",
      });
    } finally {
      setAwarding(false);
    }
  }

  async function handleLinkBudgetTemplate() {
    if (!doc) return;

    frappe.prompt(
      [
        {
          fieldname: "budget_template",
          label: "Budget Template",
          fieldtype: "Link",
          options: "Opportunity Budget Template",
          reqd: 1,
          default: doc.custom_budget_template || "",
        },
      ],
      async (values: { budget_template: string }) => {
        try {
          await frappe.call({
            method: "frappe.client.set_value",
            args: {
              doctype: "Opportunity",
              name: doc.name,
              fieldname: "custom_budget_template",
              value: values.budget_template,
            },
          });
          reload();
          frappe.show_alert(
            { message: "Budget template linked successfully.", indicator: "green" },
            5
          );
        } catch (e: any) {
          frappe.msgprint({
            title: "Update Failed",
            message: e?.message || "Could not link budget template.",
            indicator: "red",
          });
        }
      },
      "Link Budget Template",
      "Save"
    );
  }

  async function handleSendReminder() {
    if (!doc) return;
    setSendingReminder(true);
    try {
      await (globalThis as any).frappe.call({
        method: "corporate_services.api.notification.opportunity.v1.send_manual_due_reminder",
        args: { opportunity_name: doc.name },
      });
      reload();
      (globalThis as any).frappe?.show_alert(
        { message: "Due reminder sent to the Opportunity Owner.", indicator: "green" },
        5
      );
    } catch (e: any) {
      (globalThis as any).frappe?.msgprint({
        title: "Reminder Failed",
        message: e?.message || "Unable to send due reminder.",
        indicator: "red",
      });
    } finally {
      setSendingReminder(false);
    }
  }

  if (subView === "create-checklist") {
    return (
      <CreateChecklistForm
        opportunityId={opportunityId}
        onBack={() => setSubView(null)}
        onCreated={() => {
          setSubView(null);
          setActiveTab("checklist");
          reload();
        }}
      />
    );
  }

  return (
    <div className="om-fade-in">
      {/* -- Header -- */}
      <div className="om-detail-header">
        <button type="button" className="om-detail-back" onClick={onBack} title="Back to list">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h5 className="om-detail-title">
          {loading ? "Loading…" : (doc?.title || doc?.customer_name || opportunityId)}
          <span className="om-detail-id">{opportunityId}</span>
        </h5>

        {doc && <StatusBadge status={doc.status} />}

        <div className="om-detail-actions">
          {/* Linked project badge */}
          {linkedProject && (
            <button
              type="button"
              className="btn btn-sm om-awarded-badge"
              onClick={() => (globalThis as any).frappe?.set_route("icl-project-module", linkedProject)}
              title="View linked project"
            >
              <span className="indicator-pill green" style={{ fontSize: 12 }}>
                <span>Awarded · {linkedProject}</span>
              </span>
            </button>
          )}

          {/* Award button - hidden once awarded */}
          {!isAwarded && !linkedProject && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAward}
              disabled={awarding || loading}
            >
              {awarding ? "Awarding…" : "Award"}
            </button>
          )}

          <button
            type="button"
            className="btn btn-default btn-sm"
            onClick={() =>
              (globalThis as any).frappe?.set_route("Form", "Opportunity", opportunityId)
            }
          >
            Edit in Form
          </button>
        </div>
      </div>

      {/* -- Loading -- */}
      {loading && (
        <div className="text-center text-muted" style={{ padding: "48px 0" }}>
          <div className="spinner-border spinner-border-sm" role="status" />
          <div style={{ marginTop: 10 }}>Loading opportunity…</div>
        </div>
      )}

      {/* -- Error -- */}
      {error && (
        <div className="alert alert-danger" style={{ fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* -- Content -- */}
      {doc && !loading && (
        <div className="row">
          <div className="col-md-8">

            <WorkflowStatus currentState={doc.workflow_state} />

            <div className="frappe-card" style={{ padding: "8px 12px", marginBottom: 16 }}>
              <div className="btn-group" role="tablist">
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "overview" ? "btn-primary" : "btn-default"}`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
                {canViewFinanceTab && (
                  <button
                    type="button"
                    className={`btn btn-sm ${activeTab === "finance" ? "btn-primary" : "btn-default"}`}
                    onClick={() => setActiveTab("finance")}
                  >
                    Finance
                  </button>
                )}
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "checklist" ? "btn-primary" : "btn-default"}`}
                  onClick={() => setActiveTab("checklist")}
                >
                  Task Checklist
                </button>
              </div>
            </div>

            {activeTab === "overview" && (
              <>
            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="om-section-title">Overview</h6>
              <div className="om-field-grid">
                <Field label="Title" value={doc.title} />
                <Field label="Party" value={doc.customer_name} />
                <Field label="Opportunity From" value={doc.opportunity_from} />
                <Field label="Company" value={doc.company} />
                <Field label="Sales Stage" value={doc.sales_stage} />
                <Field label="Source" value={doc.source} />
                <Field label="Territory" value={doc.territory} />
                <Field label="Campaign" value={doc.campaign} />
              </div>
            </div>

            {(doc.contact_person || doc.contact_email || doc.contact_mobile || doc.phone) && (
              <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
                <h6 className="om-section-title">Contact</h6>
                <div className="om-field-grid">
                  <Field label="Contact Person" value={doc.contact_person} />
                  <Field label="Email" value={doc.contact_email} />
                  <Field label="Mobile" value={doc.contact_mobile} />
                  <Field label="Phone" value={doc.phone} />
                  <Field label="City" value={doc.city} />
                  <Field label="Country" value={doc.country} />
                </div>
              </div>
            )}
              </>
            )}

            {activeTab === "checklist" && (
              <ChecklistTab
                opportunityId={opportunityId}
                onCreateChecklist={() => setSubView("create-checklist")}
              />
            )}

            {canViewFinanceTab && activeTab === "finance" && (
              <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="om-section-title">Finance</h6>
              <div className="om-field-grid">
                <Field label="Opportunity Amount" value={formatCurrency(doc.opportunity_amount, doc.currency)} />
                <Field label="Currency" value={doc.currency} />
                <Field label="Budget Template Source" value={doc.custom_budget_template_source} />
                <Field
                  label="Budget Template"
                  value={
                    doc.custom_budget_template ? (
                      <a
                        className="text-underline text-info"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          (globalThis as any).frappe?.set_route(
                            "Form",
                            "Opportunity Budget Template",
                            doc.custom_budget_template
                          );
                        }}
                      >
                        {doc.custom_budget_template}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-default"
                        onClick={handleLinkBudgetTemplate}
                      >
                        Link Budget Template
                      </button>
                    )
                  }
                />
                <Field label="Probability (%)" value={doc.probability != null ? `${doc.probability}%` : null} />
                <Field label="Expected Closing" value={formatDate(doc.expected_closing)} />
              </div>
            </div>
            )}

          </div>

          <div className="col-md-4">

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="om-section-title">Assignment</h6>
              <div className="om-field-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Field label="Opportunity Owner" value={doc.opportunity_owner} />
                <Field label="Opportunity Date" value={formatDate(doc.transaction_date)} />
                <Field label="Created By" value={doc.owner} />
                <Field label="Last Modified" value={formatDate(doc.modified)} />
              </div>
            </div>
            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="om-section-title">Closing Date</h6>
              <div className="om-field-grid" style={{ gridTemplateColumns: "1fr" }}>
                <Field label="Expected Closing(Due Date)" value={formatDate(doc.expected_closing)} />
                <button
                  type="button"
                  className="btn btn-sm btn-default"
                  onClick={handleSendReminder}
                  disabled={sendingReminder || !canSendDueReminder}
                >
                  {sendingReminder ? "Sending…" : "Send Due Reminder to Owner"}
                </button>
                {!canSendDueReminder && (
                  <small className="text-muted">
                    Reminders can only be sent when bid status is In-progress.
                  </small>
                )}
              </div>
            </div>

            <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
              <h6 className="om-section-title">Reminder Activity Log</h6>
              {doc.reminder_activities && doc.reminder_activities.length > 0 ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {doc.reminder_activities.map((activity) => (
                    <div
                      key={activity.name}
                      style={{
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        padding: "8px 10px",
                      }}
                    >
                      <div style={{ fontSize: 13 }}>
                        {activity.content || "Opportunity Due Reminder sent."}
                      </div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {formatDateTime(activity.creation) || "-"}
                        {activity.owner ? ` • ${activity.owner}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted" style={{ fontSize: 13 }}>
                  No reminder activity yet.
                </div>
              )}
            </div>

            {(doc.industry || doc.market_segment || doc.no_of_employees || doc.annual_revenue) && (
              <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
                <h6 className="om-section-title">Market</h6>
                <div className="om-field-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <Field label="Industry" value={doc.industry} />
                  <Field label="Market Segment" value={doc.market_segment} />
                  <Field label="No. of Employees" value={doc.no_of_employees} />
                  <Field label="Annual Revenue" value={formatCurrency(doc.annual_revenue, doc.currency)} />
                </div>
              </div>
            )}

            {doc.opportunity_folder && (
              <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
                <h6 className="om-section-title">Files</h6>
                <FileBrowser
                  rootFolder={doc.opportunity_folder}
                  opportunityName={opportunityId}
                />
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
