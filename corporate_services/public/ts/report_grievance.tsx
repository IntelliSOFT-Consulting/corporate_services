import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type GrievanceType = { name: string };

declare global {
  interface Window {
    frappe: any;
  }
}

function ReportGrievanceApp() {
  const [grievanceTypes, setGrievanceTypes] = useState<GrievanceType[]>([]);
  const [grievanceType, setGrievanceType] = useState("");
  const [severity, setSeverity] = useState("");
  const [dateOfOccurrence, setDateOfOccurrence] = useState("");
  const [description, setDescription] = useState("");
  const [causeOfGrievance, setCauseOfGrievance] = useState("");
  const [witnesses, setWitnesses] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  useEffect(() => {
    window.frappe
      .call({
        method: "corporate_services.api.grievance.anonymous_grievance.get_grievance_types",
      })
      .then((r: any) => setGrievanceTypes(r.message || []))
      .catch(() => setGrievanceTypes([]));
  }, []);

  const handleSubmit = async () => {
    if (!grievanceType) {
      setError("Please select a grievance type.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the grievance.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const r = await window.frappe.call({
        method: "corporate_services.api.grievance.anonymous_grievance.submit_anonymous_grievance",
        args: {
          grievance_type: grievanceType,
          description: description.trim(),
          cause_of_grievance: causeOfGrievance.trim() || null,
          date_of_occurrence: dateOfOccurrence || null,
          severity: severity || null,
          witnesses: witnesses.trim() || null,
        },
      });
      setTrackingCode(r.message.tracking_code);
    } catch (e: any) {
      setError(e?.message || "Failed to submit grievance.");
    } finally {
      setSubmitting(false);
    }
  };

  if (trackingCode) {
    return (
      <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
        <h2>Grievance Submitted</h2>
        <p>
          This submission is anonymous - no identifying information was
          recorded. Your tracking code is the <strong>only</strong> way to
          check for a response, so save it now:
        </p>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 2,
            padding: "12px 16px",
            border: "2px solid #1a1a1a",
            display: "inline-block",
            margin: "12px 0",
          }}
        >
          {trackingCode}
        </div>
        <p>
          Visit <a href="/grievance-status">/grievance-status</a> and enter
          this code to check the status or read/send a reply.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <h2>Report a Grievance Anonymously</h2>
      <p>
        This form does not ask for your name, employee ID, or contact
        details. Submit below and you'll receive a tracking code to check
        for a response later.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Grievance Type *</label>
        <select
          className="form-control"
          value={grievanceType}
          onChange={(e) => setGrievanceType(e.target.value)}
        >
          <option value="">Select…</option>
          {grievanceTypes.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Severity</label>
        <select
          className="form-control"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">Select…</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Date of Occurrence</label>
        <input
          type="date"
          className="form-control"
          value={dateOfOccurrence}
          onChange={(e) => setDateOfOccurrence(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Description *</label>
        <textarea
          className="form-control"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Cause of Grievance</label>
        <textarea
          className="form-control"
          rows={3}
          value={causeOfGrievance}
          onChange={(e) => setCauseOfGrievance(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="form-label">Witnesses (optional, free text)</label>
        <textarea
          className="form-control"
          rows={2}
          value={witnesses}
          onChange={(e) => setWitnesses(e.target.value)}
        />
      </div>

      {error && (
        <div className="text-danger" style={{ marginBottom: 8 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        disabled={submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}

function mount() {
  const el = document.getElementById("report-grievance-root");
  if (!el) return;
  const root = createRoot(el);
  root.render(<ReportGrievanceApp />);
}

document.addEventListener("DOMContentLoaded", mount);
