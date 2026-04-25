import { Link } from "react-router-dom";

export default function MediaAudioPage({ bootstrap }) {
  const data = bootstrap.data;

  if (!data) {
    return null;
  }

  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Audio Visuals</span>
          <h2>Media Team Dashboard</h2>
        </div>
      </section>

      <section className="dashboard-grid">
        <Link to="/media-library" className="dashboard-card">
          <div className="card-icon">🎬</div>
          <div className="card-content">
            <h3>Media Library</h3>
            <p>Upload and manage media files</p>
          </div>
        </Link>

        <Link to="/events" className="dashboard-card">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Event Scheduling</h3>
            <p>Schedule and manage tech setup</p>
          </div>
        </Link>

        <Link to="/live-streaming" className="dashboard-card">
          <div className="card-icon">📺</div>
          <div className="card-content">
            <h3>Live Streaming</h3>
            <p>Control live stream and audio</p>
          </div>
        </Link>

        <Link to="/sermons" className="dashboard-card">
          <div className="card-icon">🎙️</div>
          <div className="card-content">
            <h3>Sermon Recording</h3>
            <p>Record and process sermons</p>
          </div>
        </Link>

        <Link to="/graphics" className="dashboard-card">
          <div className="card-icon">🎨</div>
          <div className="card-content">
            <h3>Graphics & Video</h3>
            <p>Create graphics and videos</p>
          </div>
        </Link>
      </section>
    </div>
  );
}