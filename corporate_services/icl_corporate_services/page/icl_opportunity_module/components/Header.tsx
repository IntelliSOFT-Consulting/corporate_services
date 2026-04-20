import React from "react";

interface HeaderProps {
  onNewLead: () => void;
  onNewOpportunity: () => void;
  onOpenGuide: () => void;
}

export function Header({ onNewLead, onNewOpportunity, onOpenGuide }: HeaderProps) {
  return (
    <div className="om-header om-fade-in">
      <p className="om-header-title">Manage your leads and opportunities</p>

      <div className="om-header-actions">
        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={onOpenGuide}
        >
          Opportunity Guide
        </button>

        <button
          type="button"
          className="btn btn-default btn-sm"
          onClick={onNewLead}
        >
          <span className="mr-1">+</span> New Lead
        </button>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onNewOpportunity}
        >
          <span className="mr-1">+</span> New Opportunity
        </button>
      </div>
    </div>
  );
}
