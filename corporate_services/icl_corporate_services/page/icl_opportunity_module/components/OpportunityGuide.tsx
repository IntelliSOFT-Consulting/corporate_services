import React from "react";

interface OpportunityGuideProps {
  onBack: () => void;
}

export function OpportunityGuide({ onBack }: OpportunityGuideProps) {
  return (
    <div className="om-fade-in">
      <div className="om-detail-header">
        <button type="button" className="om-detail-back" onClick={onBack} title="Back to module">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <h5 className="om-detail-title">Opportunity Guide</h5>
      </div>

      <div className="frappe-card om-framework-card">
        <h6 className="om-section-title">Bid Development Framework Setup</h6>

        <p className="om-framework-intro">
          Once the decision to pursue the bid is made, the bid development coordinator will undertake the following tasks:
        </p>
        <ul className="om-framework-list">
          <li>Technical</li>
          <li>Financial</li>
          <li>Administrative</li>
          <li>ALL supportive documents requested in the RFP, CV, Organization Profile</li>
          <li>Sending out updates about bid development status</li>
          <li>Monday morning email</li>
          <li>Follow up emails - Gilead, continuous throughout the week</li>
          <li>Submission</li>
        </ul>

        <p className="om-framework-intro" style={{ marginTop: 14 }}>
          Internal Team to support BD coordination also as a way of building capacity.
        </p>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>Set up the Bid development shared folder</h6>
        <p className="om-framework-intro">
          This will house all relevant documents, including the RFP, Terms of Reference, client-shared templates,
          annexes and any additional materials that will contribute to the bid development process.
        </p>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>Task checklist document</h6>
        <p className="om-framework-intro">
          A dedicated document titled Task Checklist will be created within the shared folder to serve as a guide
          for the bid development process. This document will contain the following:
        </p>
        <ul className="om-framework-list">
          <li>
            Brief project overview and objectives: Provide a clear summary of the project, outlining its scope,
            objectives, and strategic importance as articulated by the client.
          </li>
          <li>
            Task breakdown: The BD coordinator will then proceed to define the specific tasks that IntelliSOFT must
            execute to put together a strong and competitive bid.
          </li>
          <li>
            Expert selection and role allocation: The BD Coordinator will assess the technical requirements of the bid
            and strategically determine the most suitable experts within or beyond IntelliSOFT who are best equipped
            to contribute effectively. This will collectively be the bid development team.
          </li>
          <li>
            Assignment of Responsibilities: The Bid Development Coordinator will assign roles and responsibilities to
            each member of the bid development team based on their expertise. These experts are expected to not only
            come up with ideas but also write clear, high-quality content for their assigned sections.
          </li>
          <li>
            Timelines and Accountability: Based on the expected submission date stipulated by the client, the
            coordinator will establish well-defined deadlines for each task and individual. The primary goal is to
            guarantee that ICL will submit a high quality proposal within the stipulated deadline. Of equal importance,
            timelines MUST incorporate a buffer period to allow for thorough review of the final proposal for technical
            accuracy, completeness, and overall excellence before submission.
          </li>
        </ul>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>Technical Proposal Template</h6>
        <p className="om-framework-intro">
          This template will also be housed in the shared folder and will only be created if the client has not
          provided a specific technical proposal template. If no template is provided, the BD Coordinator will develop
          a well-structured document with clearly defined sections that ensures a logical flow. This allows the bid
          development team to effectively communicate their ideas. Each section will be assigned to specific
          contributors, who will be tagged via @mentions, with comments detailing expectations for that section and
          deadlines. Where applicable, hyperlinks to relevant reference materials will be included to provide
          additional guidance.
        </p>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>Recommendation</h6>
        <ul className="om-framework-list">
          <li>Design the technical proposal template.</li>
          <li>Design the financial proposal template.</li>
        </ul>
        <p className="om-framework-intro">
          This template will also be housed in the shared folder and will only be created if the client has not
          provided a specific technical proposal template. If there is no template provided, the ICL finance team will
          use the ICL financial proposal template.
        </p>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>Financial proposal Development Process</h6>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>Team Coordination and Communication</h6>
        <p className="om-framework-intro">
          Once the bid development framework is established, a formal email will be drafted and sent to the designated
          bid development team to officially initiate the bid development process. In this communication, the BD
          coordinator will be expected to outline the following key elements with irrefutable clarity:
        </p>
        <ul className="om-framework-list">
          <li>
            Each team member's responsibilities will be explicitly defined, detailing their specific contributions to
            the bid and expected outcomes.
          </li>
          <li>
            Hyperlinks will be provided to the shared bid development folder, including all important documents such as
            the task checklist and technical proposal template.
          </li>
          <li>Firmly articulated and emphasized timelines for each deliverable.</li>
        </ul>

        <h6 className="om-section-title" style={{ marginTop: 14 }}>
          Monitoring of the Bid Development Process - Notification alerts
        </h6>
        <p className="om-framework-intro">
          Following the official initiation of the bid development process, the BD Coordinator will assume the
          following responsibilities:
        </p>
        <ul className="om-framework-list">
          <li>Provide timely contribution to any section of the technical proposal they were assigned.</li>
          <li>
            Continuously monitor the contributions of each assigned team member to ensure adherence to outlined
            responsibilities and deadlines.
          </li>
          <li>Regularly update the team on the progress of the bid development process.</li>
          <li>
            Identify any delays or gaps in execution and promptly issue reminders to relevant individuals to reinforce
            expectations and maintain momentum.
          </li>
          <li>
            If stagnation persists despite follow ups, escalate the matter to Steve outlining specific concerns,
            responsible individuals, and potential implications for the bid's progress.
          </li>
          <li>
            Continuously review provided contributions to ensure alignment with the strategic direction of the bid,
            maintaining consistency, logical flow, and adherence to client specifications.
          </li>
        </ul>
      </div>
    </div>
  );
}
