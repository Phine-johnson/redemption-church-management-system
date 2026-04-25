const reports = [
  { name: "Attendance Summary", frequency: "Weekly", owner: "Operations Desk" },
  { name: "Giving Analysis", frequency: "Monthly", owner: "Finance Team" },
  { name: "Pastoral Care Follow-up", frequency: "Weekly", owner: "Pastoral Office" },
  { name: "Volunteer Coverage", frequency: "Bi-weekly", owner: "Ministry Leads" }
];

export default function ReportsPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Insights</span>
          <h2>Reports</h2>
        </div>
        <button className="primary-button" type="button">
          Generate Report
        </button>
      </section>

      <section className="stats-grid finance-grid">
        <article className="stat-card">
          <span>Saved Reports</span>
          <strong>18</strong>
          <small>Templates ready to export</small>
        </article>
        <article className="stat-card">
          <span>Automated Reports</span>
          <strong>7</strong>
          <small>Scheduled delivery enabled</small>
        </article>
        <article className="stat-card">
          <span>Pending Reviews</span>
          <strong>3</strong>
          <small>Awaiting leadership approval</small>
        </article>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Report Library</h3>
          <span>Common reporting views</span>
        </div>
        <div className="stack-list">
          {reports.map((report) => (
            <div className="coverage-row" key={report.name}>
              <div>
                <strong>{report.name}</strong>
                <p>{report.owner}</p>
              </div>
              <strong>{report.frequency}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
