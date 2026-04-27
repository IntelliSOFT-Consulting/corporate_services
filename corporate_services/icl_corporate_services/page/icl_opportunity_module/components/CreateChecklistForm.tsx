import React, { useRef, useState } from "react";
import { MentionInput, Employee } from "./MentionInput";
import { downloadChecklistTemplate, parseChecklistFile } from "./excelUtils";

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Cancelled"];
const CHECKLIST_STATUS = ["Open", "In Progress", "Completed", "Cancelled"];

interface ItemRow {
  id: string;
  proposal_section: string;
  description: string;
  status: string;
  employees: Employee[];
}

interface Props {
  opportunityId: string;
  onBack: () => void;
  onCreated: () => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyRow(): ItemRow {
  return { id: uid(), proposal_section: "", description: "", status: "Pending", employees: [] };
}

export function CreateChecklistForm({ opportunityId, onBack, onCreated }: Props) {
  const frappe = (globalThis as any).frappe;
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Open");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // -- Item helpers ------------------------------------------------------------

  function updateItem(id: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  // -- Excel / CSV import ------------------------------------------------------

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    e.target.value = "";

    const { rows, error } = await parseChecklistFile(file);
    if (error) { setImportError(error); return; }

    setItems(rows.map((r) => ({ ...r, id: uid() })));
    frappe.show_alert({ message: `Imported ${rows.length} rows.`, indicator: "green" }, 4);
  }

  // -- Save ---------------------------------------------------------------------

  async function handleSave() {
    if (!title.trim()) {
      frappe.msgprint({ title: "Required", message: "Please enter a checklist title.", indicator: "red" });
      return;
    }
    const validItems = items.filter((r) => r.description.trim());
    if (validItems.length === 0) {
      frappe.msgprint({ title: "Required", message: "Add at least one item.", indicator: "red" });
      return;
    }

    setSaving(true);
    try {
      await frappe.call({
        method: "corporate_services.api.opportunity.create_checklist",
        args: {
          opportunity: opportunityId,
          title: title.trim(),
          status,
          description,
          items: JSON.stringify(
            validItems.map((r) => ({
              proposal_section: r.proposal_section,
              description: r.description,
              status: r.status,
              employees: r.employees,
            }))
          ),
        },
      });
      frappe.show_alert({ message: "Checklist created successfully.", indicator: "green" }, 5);
      onCreated();
    } catch (e: any) {
      frappe.msgprint({ title: "Error", message: e?.message || "Could not create checklist.", indicator: "red" });
    } finally {
      setSaving(false);
    }
  }

  // -- Render -------------------------------------------------------------------

  return (
    <div className="om-fade-in">
      {/* Header */}
      <div className="om-detail-header" style={{ marginBottom: 20 }}>
        <button type="button" className="om-detail-back" onClick={onBack} title="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h5 className="om-detail-title">
          New Task Checklist
          <span className="om-detail-id">{opportunityId}</span>
        </h5>
        <div className="om-detail-actions">
          <button type="button" className="btn btn-default btn-sm" onClick={onBack} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Checklist"}
          </button>
        </div>
      </div>

      {/* Meta fields */}
      <div className="frappe-card" style={{ padding: "20px", marginBottom: 16 }}>
        <h6 className="om-section-title" style={{ marginBottom: 14 }}>Checklist Details</h6>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Title <span style={{ color: "var(--red)" }}>*</span></label>
            <input
              className="form-control form-control-sm"
              placeholder="e.g. Proposal Preparation Checklist"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select className="form-control form-control-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {CHECKLIST_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            className="form-control form-control-sm"
            rows={3}
            placeholder="Optional notes about this checklist…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="frappe-card" style={{ padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h6 className="om-section-title" style={{ marginBottom: 0 }}>
            Checklist Items
            {items.filter((r) => r.description.trim()).length > 0 && (
              <span className="text-muted" style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                ({items.filter((r) => r.description.trim()).length})
              </span>
            )}
          </h6>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-default btn-sm" onClick={downloadTemplate} title="Download Excel template">
              ⬇ Template
            </button>
            <button type="button" className="btn btn-default btn-sm" onClick={() => fileRef.current?.click()}>
              📂 Import Excel / CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>
        </div>

        {importError && (
          <div className="alert alert-danger" style={{ fontSize: 13, marginBottom: 12 }}>
            {importError}
          </div>
        )}

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px 1fr 32px", gap: 8, marginBottom: 6, padding: "0 2px" }}>
          {["Proposal Section", "Description *", "Status", "Assign To (@name)", ""].map((h) => (
            <div key={h} style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {h}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {items.map((row) => (
            <div
              key={row.id}
              style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px 1fr 32px", gap: 8, alignItems: "start" }}
            >
              <input
                className="form-control form-control-sm"
                placeholder="Section"
                value={row.proposal_section}
                onChange={(e) => updateItem(row.id, { proposal_section: e.target.value })}
              />
              <input
                className="form-control form-control-sm"
                placeholder="What needs to be done?"
                value={row.description}
                onChange={(e) => updateItem(row.id, { description: e.target.value })}
              />
              <select
                className="form-control form-control-sm"
                value={row.status}
                onChange={(e) => updateItem(row.id, { status: e.target.value })}
              >
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <MentionInput
                value={row.employees}
                onChange={(emps) => updateItem(row.id, { employees: emps })}
                placeholder="@ to assign"
              />
              <button
                type="button"
                onClick={() => removeItem(row.id)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "4px 0" }}
                title="Remove row"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-default btn-sm"
          style={{ marginTop: 12 }}
          onClick={addRow}
        >
          + Add Row
        </button>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 32 }}>
        <button type="button" className="btn btn-default btn-sm" onClick={onBack} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Checklist"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-muted)",
  marginBottom: 4,
  display: "block",
  fontWeight: 500,
};
