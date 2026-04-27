import React from "react";
import TableFilters from "./TableFilters";
import SubmissionTable from "./SubmissionTable";
import NonSubmittersTable from "./NonSubmittersTable";
import SummaryCards from "./SummaryCards";
import ChartsPanel from "./ChartsPanel";
import TableTabs from "./TableTabs";
import useTimesheetSubmissions from "./useTimesheetSubmissions";

function TimesheetSubmissions({
  employee = null,
  roleContext = null,   // { role, employee, reportees }
  onBack,
  onEmployeeClick,
  onSubmissionClick,
}) {
  const {
    PAGE_SIZE,
    role,
    title,
    loading,
    submissions,
    filteredSubmissions,
    filteredNonSubmitters,
    visibleNonSubmitterMonth,
    activeNonSubmitters,
    monthFilter,
    setMonthFilter,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    nonSubmitterPage,
    setNonSubmitterPage,
    activeTableTab,
    setActiveTableTab,
    monthOptions,
    showWorkflowState,
    showNonSubmittersSection,
    paginatedSubmissions,
    totalPages,
    formatMonth,
    handleNotify,
    sendReminder,
  } = useTimesheetSubmissions({ employee, roleContext });
  const isEmployeeView = !!employee;
  const isEmptyState = isEmployeeView
    ? filteredSubmissions.length === 0
    : filteredSubmissions.length === 0 && filteredNonSubmitters.length === 0;

  // -- Loading ---------------------------------------------------------------
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // -- Table filters --------------------------------------------------------
  // -- Empty state
  if (isEmptyState) {
    return (
      <div className="container py-5">
        {onBack && (
          <button className="btn btn-secondary mb-3" onClick={onBack}>
            ← Back
          </button>
        )}
        {title && <h1 className="mb-4 text-center" style={{ fontSize: 22 }}>{title}</h1>}
        <div className="card">
          <div className="card-body text-center py-5">
            <h5 className="text-muted mt-2">No Timesheet Submissions Found</h5>
            <p className="text-muted" style={{ fontSize: 13 }}>
              {monthFilter
                ? `No submissions for ${formatMonth(monthFilter)}.`
                : employee
                  ? "This employee has not submitted any timesheets yet."
                  : "No submissions found."}
            </p>
            {onBack && (
              <button className="btn btn-primary mt-3" onClick={onBack}>
                ← Back
              </button>
            )}
          </div>
        </div>

      </div>
    );
  }

  // -- Main view
  return (
    <div className="container py-4">
      <div className={`d-flex align-items-center justify-content-between gap-3 flex-wrap ${isEmployeeView ? "mb-3" : "mb-2"}`}>
        <div>
          {title && <h1 className="mb-0" style={{ fontSize: 22 }}>{title}</h1>}
        </div>
        {isEmployeeView && onBack && (
          <button className="btn btn-outline-secondary" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>

      {/* Summary cards */}
      <SummaryCards
        cards={[
          { label: "Total Submissions", value: submissions.length, color: "#0d6efd" },
          { label: "Total Hours", value: submissions.reduce((s, t) => s + parseFloat(t.total_working_hours || 0), 0).toFixed(1), color: "#6610f2" },
          { label: "Approved", value: submissions.filter((t) => t.status === "Approved").length, color: "#16a34a" },
          { label: "Pending", value: submissions.filter((t) => t.status === "Open").length, color: "#f59e0b" },
        ]}
      />

      {!isEmployeeView && (
        <ChartsPanel
          showSubmissionTrend
          showEmployeeChart
          showEmployeeMonthlyChart={false}
        />
      )}

      {isEmployeeView && (
        <ChartsPanel
          showSubmissionTrend={false}
          showEmployeeChart={false}
          showEmployeeMonthlyChart={false}
        />
      )}

      {!isEmployeeView && (
        <TableTabs
          activeTableTab={activeTableTab}
          setActiveTableTab={setActiveTableTab}
          showNonSubmittersSection={showNonSubmittersSection}
          nonSubmittersCount={filteredNonSubmitters.length}
        />
      )}

      {(isEmployeeView || activeTableTab === "submissions") && (
        <>
          <TableFilters
            showNonSubmittersSection={showNonSubmittersSection}
            activeNonSubmittersCount={activeNonSubmitters.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            monthFilter={monthFilter}
            setMonthFilter={setMonthFilter}
            monthOptions={monthOptions}
            showStatus={!isEmployeeView}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onNotify={handleNotify}
          />
          <SubmissionTable
            pageSize={PAGE_SIZE}
            formatMonth={formatMonth}
            submissions={filteredSubmissions}
            paginatedSubmissions={paginatedSubmissions}
            currentPage={currentPage}
            totalPages={totalPages}
            showWorkflowState={showWorkflowState}
            role={role}
            employee={employee}
            onEmployeeClick={onEmployeeClick}
            onSubmissionClick={onSubmissionClick}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {!isEmployeeView && activeTableTab === "non-submitters" && showNonSubmittersSection && (
        <>
          <TableFilters
            showNonSubmittersSection={showNonSubmittersSection}
            activeNonSubmittersCount={activeNonSubmitters.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            monthFilter={monthFilter}
            setMonthFilter={setMonthFilter}
            monthOptions={monthOptions}
            showStatus={false}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onNotify={handleNotify}
          />
          <NonSubmittersTable
            pageSize={PAGE_SIZE}
            formatMonth={formatMonth}
            nonSubmitters={filteredNonSubmitters}
            monthFilter={visibleNonSubmitterMonth}
            onNotify={handleNotify}
            onNotifyEmployee={(emp) => sendReminder([emp], visibleNonSubmitterMonth)}
            currentPage={nonSubmitterPage}
            onPageChange={setNonSubmitterPage}
          />
        </>
      )}
    </div>
  );
}

export default TimesheetSubmissions;
