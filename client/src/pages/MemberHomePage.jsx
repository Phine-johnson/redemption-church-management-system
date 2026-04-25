import { Link } from "react-router-dom";

const memberStats = [
  { label: "Attendance", value: "87%", note: "4 of last 5 services" },
  { label: "Upcoming Events", value: "3", note: "1 volunteer assignment" },
  { label: "Giving This Month", value: "$240", note: "Last gift 3 days ago" }
];

const memberCards = [
  {
    title: "My Profile",
    description: "Update your contact details, family record, and ministry interests."
  },
  {
    title: "My Giving",
    description: "Review donations, payment history, and downloadable receipts."
  },
  {
    title: "Prayer Requests",
    description: "Share prayer needs and follow ministry updates from the church."
  },
  {
    title: "Announcements",
    description: "Catch recent church notices, event reminders, and care updates."
  }
];

const upcoming = [
  { title: "Sunday Celebration Service", meta: "Sunday, 9:00 AM" },
  { title: "New Members Class", meta: "Wednesday, 6:30 PM" },
  { title: "Community Outreach", meta: "Saturday, 10:00 AM" }
];

export default function MemberHomePage({ session }) {
  return (
    <main className="member-home">
      <section className="member-topbar">
        <div>
          <span className="section-kicker">Member Portal</span>
          <h1>Welcome back, {session?.name || "Member"}</h1>
          <p>Everything you need for your church life in one place.</p>
        </div>
        <Link to="/" className="secondary-button">
          Log Out
        </Link>
      </section>

      <section className="member-hero">
        <div className="member-profile-card">
          <div className="member-avatar">{session?.name?.charAt(0) || "M"}</div>
          <div>
            <strong>{session?.name || "Church Member"}</strong>
            <p>{session?.email || "member@gracefellowship.org"}</p>
            <span className="member-badge">Active Member</span>
          </div>
        </div>

        <div className="member-hero-note">
          <strong>Grace Fellowship Church</strong>
          <p>Stay connected with services, giving, events, and pastoral communication.</p>
        </div>
      </section>

      <section className="member-stat-grid">
        {memberStats.map((item) => (
          <article key={item.label} className="member-stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </section>

      <section className="member-content-grid">
        <article className="panel-card">
          <div className="panel-header">
            <h3>Quick Access</h3>
            <span>Member tools</span>
          </div>
          <div className="member-card-grid">
            {memberCards.map((card) => (
              <div key={card.title} className="member-mini-card">
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-header">
            <h3>Upcoming Schedule</h3>
            <span>Your next church activities</span>
          </div>
          <div className="stack-list">
            {upcoming.map((item) => (
              <div key={item.title} className="coverage-row">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
