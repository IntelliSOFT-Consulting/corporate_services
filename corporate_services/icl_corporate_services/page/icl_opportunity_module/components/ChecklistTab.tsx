import React, { useState, useEffect, useCallback, useRef } from "react";
import { OpportunityChecklist, ChecklistItem } from "./types";
import { MentionInput, Employee } from "./MentionInput";
import { downloadChecklistTemplate, parseChecklistFile, ParsedItem } from "./excelUtils";

const EMPTY_FORM = { proposal_section: "", description: "", status: "Pending", employees: [] as Employee[] };

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Cancelled"];

const STATUS_COLOR: Record<string, string> = {
  Pending: "gray",
  "In Progress": "blue",
  Completed: "green",
  Cancelled: "red",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "gray";
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{status}</span>
    </span>
  );
}

interface Props {
  opportunityId: string;
  onCreateChecklist?: () => void;
}

export function ChecklistTab({ opportunityId, onCreateChecklist }: Props) {
  const frappe = (globalThis as any).frappe;
  const [checklist, setChecklist] = useState<OpportunityChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRow, setUpdatingRow] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importedRows, setImportedRows] = useState<ParsedItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await frappe.call({
        method: "corporate_services.api.opportunity.get_opportunity_checklist",
        args: { opportunity_name: opportunityId },
      });
      setChecklist(r?.message ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load checklist.");
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(row: ChecklistItem, newStatus: string) {
    if (row.status === newStatus) return;
    setUpdatingRow(row.name);
    try {
      await frappe.call({
        method: "corporate_services.api.opportunity.update_checklist_item_status",
        args: {
          checklist_name: checklist?.name,
          row_name: row.name,
          status: newStatus,
        },
      });
      setChecklist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.name === row.name ? { ...i, status: newStatus } : i
          ),
        };
      });
    } catch (e: any) {
      frappe.msgprint({
        title: "Update Failed",
        message: e?.message || "Could not update status.",
        indicator: "red",
      });
    } finally {
      setUpdatingRow(null);
    }
  }

  async function handleAddItem() {
    if (!addForm.description.trim() || !checklist) return;
    setSaving(true);
    try {
      await frappe.call({
        method: "corporate_services.api.opportunity.add_checklist_item",
        args: {
          checklist_name: checklist.name,
          proposal_section: addForm.proposal_section,
          description: addForm.description,
          status: addForm.status,
          employees: JSON.stringify(addForm.employees),
        },
      });
      setAddForm({ ...EMPTY_FORM });
      setShowAddForm(false);
      await load();
    } catch (e: any) {
      frappe.msgprint({ title: "Error", message: e?.message || "Could not add item.", indicator: "red" });
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    e.target.value = "";
    const { rows, error } = await parseChecklistFile(file);
    if (error) { setImportError(error); return; }
    setImportedRows(rows);
  }

  async function handleConfirmImport() {
    if (!checklist || importedRows.length === 0) return;
    setImporting(true);
    try {
      await frappe.call({
        method: "corporate_services.api.opportunity.bulk_add_checklist_items",
        args: {
          checklist_name: checklist.name,
          items: JSON.stringify(importedRows),
        },
      });
      frappe.show_alert({ message: `Imported ${importedRows.length} rows.`, indicator: "green" }, 4);
      setImportedRows([]);
      setShowImport(false);
      await load();
    } catch (e: any) {
      frappe.msgprint({ title: "Import Failed", message: e?.message || "Could not import rows.", indicator: "red" });
    } finally {
      setImporting(false);
    }
  }

  function openChecklistForm() {
    if (checklist) {
      frappe.set_route("Form", "Opportunity Task Checklist", checklist.name);
    } else if (onCreateChecklist) {
      onCreateChecklist();
    } else {
      frappe.new_doc("Opportunity Task Checklist", { opportunity: opportunityId });
    }
  }

  if (loading) {
    return (
      <div className="text-center text-muted" style={{ padding: "40px 0" }}>
        <div className="spinner-border spinner-border-sm" role="status" />
        <div style={{ marginTop: 10 }}>Loading checklist…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="frappe-card" style={{ padding: "32px 20px", textAlign: "center" }}>
        <div className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>
          No task checklist linked to this opportunity yet.
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={openChecklistForm}
        >
          Create Checklist
        </button>
      </div>
    );
  }

  // Group by proposal_section, then by description so multiple assignees per task appear together
  const grouped = checklist.items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const section = item.proposal_section || "General";
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  // Within each section, collapse rows with the same description into one display block
  const collapse = (rows: ChecklistItem[]) => {
    const seen = new Map<string, { item: ChecklistItem; assignees: string[] }>();
    for (const row of rows) {
      const key = row.description;
      if (!seen.has(key)) {
        seen.set(key, { item: row, assignees: [] });
      }
      if (row.employee_name || row.employee) {
        seen.get(key)!.assignees.push(row.employee_name || row.employee!);
      }
    }
    return Array.from(seen.values());
  };

  const completedCount = checklist.items.filter((i) => i.status === "Completed").length;
  const total = checklist.items.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div>
      {/* Checklist header */}
      <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h6 className="om-section-title" style={{ marginBottom: 4 }}>{checklist.title}</h6>
            <StatusBadge status={checklist.status} />
          </div>
          <button
            type="button"
            className="btn btn-default btn-sm"
            onClick={openChecklistForm}
          >
            Open Full Form
          </button>
        </div>

        {total > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span className="text-muted">{completedCount} of {total} completed</span>
              <span className="text-muted">{progress}%</span>
            </div>
            <div style={{ background: "var(--border-color)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: progress === 100 ? "var(--green)" : "var(--primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Items grouped by section */}
      {/* Toolbar: Add Item + Import */}
      {!showAddForm && !showImport && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
            + Add Item
          </button>
          <button type="button" className="btn btn-default btn-sm" onClick={() => { setShowImport(true); setImportedRows([]); setImportError(null); }}>
            ⬆ Import Excel / CSV
          </button>
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <h6 className="om-section-title" style={{ marginBottom: 12 }}>Import Items from Excel / CSV</h6>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn btn-default btn-sm" onClick={() => downloadChecklistTemplate()} title="Download Excel template">
              ⬇ Download Template
            </button>
            <button type="button" className="btn btn-default btn-sm" onClick={() => importFileRef.current?.click()}>
              📂 Choose File
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleImportFileChange}
            />
          </div>

          {importError && (
            <div className="alert alert-danger" style={{ fontSize: 13, marginBottom: 10 }}>{importError}</div>
          )}

          {importedRows.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Preview — {importedRows.length} row{importedRows.length !== 1 ? "s" : ""} ready to import:
              </div>
              <div style={{ overflowX: "auto", marginBottom: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "var(--control-bg)" }}>
                      {["Section", "Description", "Status", "Employee"].map((h) => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", border: "1px solid var(--border-color)", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importedRows.slice(0, 8).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "5px 10px", border: "1px solid var(--border-color)" }}>{r.proposal_section || "-"}</td>
                        <td style={{ padding: "5px 10px", border: "1px solid var(--border-color)" }}>{r.description}</td>
                        <td style={{ padding: "5px 10px", border: "1px solid var(--border-color)" }}>{r.status}</td>
                        <td style={{ padding: "5px 10px", border: "1px solid var(--border-color)" }}>{r.employees.map((e) => e.employee_name || e.name).join(", ") || "-"}</td>
                      </tr>
                    ))}
                    {importedRows.length > 8 && (
                      <tr>
                        <td colSpan={4} style={{ padding: "5px 10px", color: "var(--text-muted)", fontStyle: "italic" }}>
                          …and {importedRows.length - 8} more row{importedRows.length - 8 !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-default btn-sm" onClick={() => { setShowImport(false); setImportedRows([]); setImportError(null); }}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={importing || importedRows.length === 0}
              onClick={handleConfirmImport}
            >
              {importing ? "Importing…" : `Import ${importedRows.length > 0 ? importedRows.length + " rows" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Add Item form */}
      {showAddForm && (
        <div className="frappe-card" style={{ padding: "16px 20px", marginBottom: 16 }}>
          <h6 className="om-section-title" style={{ marginBottom: 12 }}>New Item</h6>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Proposal Section</label>
                <input
                  className="form-control form-control-sm"
                  placeholder="e.g. Introduction"
                  value={addForm.proposal_section}
                  onChange={(e) => setAddForm((f) => ({ ...f, proposal_section: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Status</label>
                <select
                  className="form-control form-control-sm"
                  value={addForm.status}
                  onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>Description <span style={{ color: "var(--red)" }}>*</span></label>
              <input
                className="form-control form-control-sm"
                placeholder="What needs to be done?"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, display: "block" }}>
                Assign To — type <kbd style={{ fontSize: 11, padding: "1px 4px", borderRadius: 3, background: "var(--control-bg)", border: "1px solid var(--border-color)" }}>@</kbd> to search employees
              </label>
              <MentionInput
                value={addForm.employees}
                onChange={(emps) => setAddForm((f) => ({ ...f, employees: emps }))}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-default btn-sm"
                onClick={() => { setShowAddForm(false); setAddForm({ ...EMPTY_FORM }); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={saving || !addForm.description.trim()}
                onClick={handleAddItem}
              >
                {saving ? "Saving…" : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="frappe-card" style={{ padding: "20px", textAlign: "center" }}>
          <div className="text-muted" style={{ fontSize: 13 }}>
            No items added yet.{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); openChecklistForm(); }}>
              Open the form
            </a>{" "}
            to add items.
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([section, rows]) => (
          <div key={section} className="frappe-card" style={{ padding: "16px 20px", marginBottom: 12 }}>
            <h6 className="om-section-title" style={{ marginBottom: 12 }}>{section}</h6>
            <div style={{ display: "grid", gap: 8 }}>
              {collapse(rows).map(({ item, assignees }) => (
                <div
                  key={item.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: 6,
                    background: item.status === "Completed" ? "var(--subtle-fg)" : undefined,
                    opacity: item.status === "Cancelled" ? 0.55 : 1,
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 13,
                      textDecoration: item.status === "Completed" ? "line-through" : "none",
                      color: item.status === "Completed" ? "var(--text-muted)" : undefined,
                    }}>
                      {item.description}
                    </div>
                    {assignees.length > 0 && (
                      <div style={{ fontSize: 12, marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                        <span className="text-muted">Assigned:</span>
                        {assignees.map((name) => (
                          <span key={name} style={{
                            background: "var(--control-bg)",
                            borderRadius: 4,
                            padding: "1px 6px",
                            fontSize: 11,
                          }}>
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <StatusBadge status={item.status} />

                  <select
                    className="form-control form-control-sm"
                    style={{ width: 130, fontSize: 12 }}
                    value={item.status}
                    disabled={updatingRow === item.name}
                    onChange={(e) => handleStatusChange(item, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
