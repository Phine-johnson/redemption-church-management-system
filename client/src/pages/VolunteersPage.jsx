const volunteerTeams = [
  { team: "Ushering", openSlots: "3", lead: "Rachel Mensah" },
  { team: "Children Ministry", openSlots: "5", lead: "Esther Coleman" },
  { team: "Media & Sound", openSlots: "2", lead: "David Nartey" },
  { team: "Welcome Team", openSlots: "4", lead: "Michael Johnson" }
];

export default function VolunteersPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Serving</span>
          <h2>Volunteer Management</h2>
        </div>
        <button className="primary-button" type="button">
          Add Volunteer
        </button>
      </section>

      <section className="stats-grid finance-grid">
        <article className="stat-card">
          <span>Active Volunteers</span>
          <strong>219</strong>
          <small>Across 12 ministries</small>
        </article>
        <article className="stat-card">
          <span>Training Pending</span>
          <strong>17</strong>
          <small>Orientation this Saturday</small>
        </article>
        <article className="stat-card">
          <span>Open Slots</span>
          <strong>14</strong>
          <small>Sunday coverage needed</small>
        </article>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Team Coverage</h3>
          <span>Current staffing needs</span>
        </div>
        <div className="stack-list">
          {volunteerTeams.map((team) => (
            <div className="coverage-row" key={team.team}>
              <div>
                <strong>{team.team}</strong>
                <p>Team lead: {team.lead}</p>
              </div>
              <strong>{team.openSlots} open slots</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
