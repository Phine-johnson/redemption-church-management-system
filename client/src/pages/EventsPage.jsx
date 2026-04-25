export default function EventsPage({ bootstrap }) {
  const data = bootstrap.data;

  if (!data) {
    return null;
  }

  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Calendar</span>
          <h2>Ministry Events</h2>
        </div>
        <button className="primary-button" type="button">
          Schedule Event
        </button>
      </section>

      <section className="event-grid">
        {data.events.upcoming.map((event) => (
          <article key={event.id} className="event-card">
            <div className="event-date-block">
              <strong>{event.day}</strong>
              <span>{event.month}</span>
            </div>
            <div className="event-details">
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <div className="event-meta">
                <span>{event.time}</span>
                <span>{event.location}</span>
                <span>{event.team}</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Volunteer Readiness</h3>
          <span>Staffing for the next ministry events</span>
        </div>
        <div className="stack-list">
          {data.events.volunteerCoverage.map((item) => (
            <div className="coverage-row" key={item.event}>
              <div>
                <strong>{item.event}</strong>
                <p>{item.team}</p>
              </div>
              <div className="progress-bar">
                <span style={{ width: `${item.coverage}%` }}></span>
              </div>
              <strong>{item.coverage}%</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
