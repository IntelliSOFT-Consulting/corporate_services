import React from "react";

function TableTabs({
  activeTableTab,
  setActiveTableTab,
  showNonSubmittersSection,
  nonSubmittersCount = 0,
}) {
  return (
    <ul className="nav nav-tabs mb-3">
      <li className="nav-item">
        <button
          type="button"
          className={`nav-link${activeTableTab === "submissions" ? " active" : ""}`}
          onClick={() => setActiveTableTab("submissions")}
        >
          Submission Details
        </button>
      </li>
      {showNonSubmittersSection && (
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${activeTableTab === "non-submitters" ? " active" : ""}`}
            onClick={() => setActiveTableTab("non-submitters")}
          >
            Non Submitters
            {nonSubmittersCount > 0 && (
              <span className="badge bg-danger ms-2">{nonSubmittersCount}</span>
            )}
          </button>
        </li>
      )}
    </ul>
  );
}

export default TableTabs;
