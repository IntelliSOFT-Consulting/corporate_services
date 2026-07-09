import React, { useEffect, useState } from "react";
import { SectionCard } from "../components/SectionCard";
import { RelatedTable, Column } from "../components/RelatedTable";
import { frappeCall, openForm } from "../utils/frappe";
import { formatDateOrDash } from "../utils/format";

type Meeting = {
  name: string;
  meeting_title?: string;
  meeting_date?: string;
  location?: string;
  call_recording?: string;
  next_meeting_date?: string;
  objective?: string;
  docstatus: number;
  attendee_count: number;
  in_attendance_count: number;
  agenda_count: number;
};

type MeetingCounts = {
  total: number;
  submitted: number;
  draft: number;
  next_meeting_date?: string | null;
};

const EMPTY_COUNTS: MeetingCounts = { total: 0, submitted: 0, draft: 0, next_meeting_date: null };

function DocStatusPill({ docstatus }: { docstatus: number }) {
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Draft", color: "orange" },
    1: { label: "Submitted", color: "green" },
    2: { label: "Cancelled", color: "gray" },
  };
  const { label, color } = map[docstatus] ?? { label: "-", color: "gray" };
  return (
    <span className={`indicator-pill ${color}`} style={{ fontSize: 12 }}>
      <span>{label}</span>
    </span>
  );
}

export function MeetingsTab({ projectId }: { projectId: string }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [counts, setCounts] = useState<MeetingCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await frappeCall(
        "corporate_services.api.project.get_project_meetings",
        { project_name: projectId },
      );
      setMeetings(r?.message?.meetings ?? []);
      setCounts(r?.message?.counts ?? EMPTY_COUNTS);
    } catch {
      setMeetings([]);
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  const openNewMeeting = () => {
    openForm("Project Meeting Minutes", "new-project-meeting-minutes-1");
    setTimeout(() => {
      const f = (globalThis as any).cur_frm;
      if (f && f.doctype === "Project Meeting Minutes") {
        f.set_value("project", projectId);
      }
    }, 800);
  };

  const columns: Column<Meeting>[] = [
    {
      header: "Meeting",
      render: (m) => (
        <a
          className="pm-proj-link"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openForm("Project Meeting Minutes", m.name);
          }}
        >
          {m.meeting_title || m.name}
        </a>
      ),
    },
    { header: "Date", render: (m) => formatDateOrDash(m.meeting_date) },
    { header: "Location", render: (m) => m.location || "-" },
    {
      header: "Attendees",
      align: "center",
      render: (m) => `${m.in_attendance_count}/${m.attendee_count}`,
    },
    { header: "Agenda Items", align: "center", render: (m) => m.agenda_count },
    { header: "Next Meeting", render: (m) => formatDateOrDash(m.next_meeting_date) },
    { header: "Status", align: "center", render: (m) => <DocStatusPill docstatus={m.docstatus} /> },
    {
      header: "Recording",
      render: (m) =>
        m.call_recording ? (
          <a className="pm-proj-link" href={m.call_recording} target="_blank" rel="noreferrer">
            Link
          </a>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <div className="pm-fade-in">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="frappe-card" style={{ padding: "12px 16px" }}>
          <div className="text-muted" style={{ fontSize: 12 }}>Total Meetings</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{counts.total}</div>
        </div>
        <div className="frappe-card" style={{ padding: "12px 16px" }}>
          <div className="text-muted" style={{ fontSize: 12 }}>Submitted</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{counts.submitted}</div>
        </div>
        <div className="frappe-card" style={{ padding: "12px 16px" }}>
          <div className="text-muted" style={{ fontSize: 12 }}>Draft</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>{counts.draft}</div>
        </div>
        <div className="frappe-card" style={{ padding: "12px 16px" }}>
          <div className="text-muted" style={{ fontSize: 12 }}>Next Meeting</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            {formatDateOrDash(counts.next_meeting_date ?? undefined)}
          </div>
        </div>
      </div>

      <SectionCard
        title="Project Meeting Minutes"
        count={meetings.length}
        countLabel="meeting"
        right={
          <>
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Refresh
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={openNewMeeting}>
              New Meeting Minutes
            </button>
          </>
        }
      >
        {loading ? (
          <div className="text-muted">Loading meetings…</div>
        ) : (
          <RelatedTable
            columns={columns}
            rows={meetings}
            getKey={(m) => m.name}
            emptyText="No meeting minutes have been recorded for this project yet."
          />
        )}
      </SectionCard>
    </div>
  );
}
