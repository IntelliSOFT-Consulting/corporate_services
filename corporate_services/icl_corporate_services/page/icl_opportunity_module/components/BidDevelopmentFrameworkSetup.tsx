import React from "react";

interface BidDevelopmentFrameworkSetupProps {
  onOpenGuide: () => void;
}

export function BidDevelopmentFrameworkSetup({ onOpenGuide }: BidDevelopmentFrameworkSetupProps) {
  return (
    <div className="frappe-card om-framework-card om-fade-in">
      <h6 className="om-section-title">Bid Development Framework Setup</h6>

      <p className="om-framework-intro">
        Review the complete bid coordination process, task checklist structure, expert assignment
        model, timelines and accountability requirements in the dedicated opportunity guide.
      </p>

      <button type="button" className="btn btn-default btn-sm" onClick={onOpenGuide}>
        Open Opportunity Guide
      </button>
    </div>
  );
}
