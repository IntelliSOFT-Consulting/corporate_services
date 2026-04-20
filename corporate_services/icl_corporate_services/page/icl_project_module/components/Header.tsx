import React from "react";

interface HeaderProps {
  onNewProject: () => void;
}

export function Header({ onNewProject }: HeaderProps) {
  return (
    <div className="pm-header pm-fade-in">
      <p className="pm-header-title">Manage your projects</p>

      <div className="pm-header-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onNewProject}
        >
          <span className="mr-1">+</span> New Project
        </button>
      </div>
    </div>
  );
}
