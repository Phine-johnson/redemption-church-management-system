import { Link } from "react-router-dom";

export default function ClerkPage({ bootstrap }) {
  const data = bootstrap.data;

  if (!data) {
    return null;
  }

  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Administration</span>
          <h2>Clerk Dashboard</h2>
        </div>
      </section>

      <section className="dashboard-grid">
        <Link to="/members" className="dashboard-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>Member Directory</h3>
            <p>Manage member contact information</p>
          </div>
        </Link>

        <Link to="/events" className="dashboard-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Event Management</h3>
            <p>Manage events and announcements</p>
          </div>
        </Link>

        <Link to="/reports" className="dashboard-card">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>Reports</h3>
            <p>View statistics and reports</p>
          </div>
        </Link>

        <Link to="/announcements" className="dashboard-card">
          <div className="card-icon">📣</div>
          <div className="card-content">
            <h3>Communication</h3>
            <p>Communicate with members and teams</p>
          </div>
        </Link>

        <Link to="/member-registration" className="dashboard-card">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <h3>Membership</h3>
            <p>Registration and updates</p>
          </div>
        </Link>

        <Link to="/visitors" className="dashboard-card">
          <div className="card-icon">🚶</div>
          <div className="card-content">
            <h3>Visitor Tracking</h3>
            <p>Track and follow-up with visitors</p>
          </div>
        </Link>
      </section>
    </div>
  );
}