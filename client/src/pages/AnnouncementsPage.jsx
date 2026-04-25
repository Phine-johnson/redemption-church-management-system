const announcements = [
  { title: "Resurrection Sunday rehearsal", audience: "Worship Team", channel: "Email + WhatsApp" },
  { title: "New members class reminder", audience: "Recent Visitors", channel: "SMS" },
  { title: "Food drive volunteer call", audience: "Entire Church", channel: "Email" }
];

export default function AnnouncementsPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Communication</span>
          <h2>Announcements</h2>
        </div>
        <button className="primary-button" type="button">
          New Announcement
        </button>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Recent Broadcasts</h3>
          <span>Messages sent to members and ministry teams</span>
        </div>
        <div className="stack-list">
          {announcements.map((item) => (
            <div className="coverage-row" key={item.title}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.audience}</p>
              </div>
              <strong>{item.channel}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
