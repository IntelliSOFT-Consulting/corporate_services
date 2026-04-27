import React from "react";

function ChartsPanel({ showSubmissionTrend, showEmployeeChart, showEmployeeMonthlyChart }) {
  return (
    <div className="row g-4 mb-4">
      <div className="col-lg-6 mb-4">
        <div className="card">
          <div className="card-body" style={{ height: 300 }}>
            <canvas id="hoursChart" />
          </div>
        </div>
      </div>

      <div className="col-lg-6 mb-4">
        <div className="card">
          <div className="card-body" style={{ height: 300 }}>
            <canvas id="statusChart" />
          </div>
        </div>
      </div>

      {showSubmissionTrend && (
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-body" style={{ height: 300 }}>
              <canvas id="trendChart" />
            </div>
          </div>
        </div>
      )}

      {showEmployeeChart && (
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-body" style={{ height: 300 }}>
              <canvas id="employeeChart" />
            </div>
          </div>
        </div>
      )}

      {showEmployeeMonthlyChart && (
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-body" style={{ height: 320 }}>
              <canvas id="employeeMonthlyChart" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartsPanel;
