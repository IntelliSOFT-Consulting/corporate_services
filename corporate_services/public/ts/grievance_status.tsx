import React, { useState } from "react";
import { createRoot } from "react-dom/client";

type CorrespondenceRow = {
  sender: "Investigator" | "Reporter";
  message: string;
  sent_on: string;
};

declare global {
  interface Window {
    frappe: any;
  }
}

function GrievanceStatusApp() {
  const [codeInput, setCodeInput] = useState("");
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<string | null>(null);
  const [correspondence, setCorrespondence] = useState<CorrespondenceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const lookup = async () => {
    if (!codeInput.trim()) {
      setError("Please enter your tracking code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await window.frappe.call({
        method: "corporate_services.api.grievance.anonymous_grievance.get_anonymous_grievance_status",
        args: { tracking_code: codeInput.trim() },
      });
      setWorkflowState(r.message.workflow_state);
      setCorrespondence(r.message.correspondence || []);
      setTrackingCode(codeInput.trim());
    } catch (e: any) {
      setError(e?.message || "No grievance found for that tracking code.");
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!trackingCode || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      await window.frappe.call({
        method: "corporate_services.api.grievance.anonymous_grievance.reply_to_anonymous_grievance",
        args: { tracking_code: trackingCode, message: reply.trim() },
      });
      setCorrespondence((prev) => [
        ...prev,
        { sender: "Reporter", message: reply.trim(), sent_on: new Date().toISOString() },
      ]);
      setReply("");
    } catch (e: any) {
      setError(e?.message || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (!trackingCode) {
    return (
      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        <h2>Check Grievance Status</h2>
        <p>Enter the tracking code you received when you filed your report.</p>
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-control"
            placeholder="Tracking code"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
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
          disabled={loading}
          onClick={lookup}
        >
          {loading ? "Checking…" : "Check Status"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <h2>Grievance Status</h2>
      <p>
        Tracking Code: <strong>{trackingCode}</strong>
      </p>
      <p>
        Status: <strong>{workflowState}</strong>
      </p>

      <h4 style={{ marginTop: 24 }}>Correspondence</h4>
      {correspondence.length === 0 && <p>No messages yet.</p>}
      {correspondence.map((row, i) => (
        <div
          key={i}
          style={{
            padding: "8px 12px",
            marginBottom: 8,
            borderLeft: `3px solid ${row.sender === "Investigator" ? "#1a1a1a" : "#888"}`,
            background: "#f5f5f5",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 12, textTransform: "uppercase" }}>
            {row.sender === "Investigator" ? "Head of Corporate Services" : "You"}
          </div>
          <div>{row.message}</div>
        </div>
      ))}

      <div style={{ marginTop: 16 }}>
        <label className="form-label">Send a reply</label>
        <textarea
          className="form-control"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
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
        disabled={sending || !reply.trim()}
        onClick={sendReply}
      >
        {sending ? "Sending…" : "Send Reply"}
      </button>
    </div>
  );
}

function mount() {
  const el = document.getElementById("grievance-status-root");
  if (!el) return;
  const root = createRoot(el);
  root.render(<GrievanceStatusApp />);
}

document.addEventListener("DOMContentLoaded", mount);
