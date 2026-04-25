const attendanceRows = [
  { service: "Sunday Celebration", attendance: "842", trend: "+6.2%", note: "Strong family turnout" },
  { service: "Midweek Bible Study", attendance: "214", trend: "+2.8%", note: "More first-time guests" },
  { service: "Youth Fellowship", attendance: "118", trend: "+9.1%", note: "Retreat buzz helped" }
];

export default function AttendancePage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Tracking</span>
          <h2>Attendance</h2>
        </div>
        <button className="primary-button" type="button">
          Record Attendance
        </button>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Recent Services</h3>
          <span>Weekly attendance overview</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Attendance</th>
                <th>Trend</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((row) => (
                <tr key={row.service}>
                  <td><strong>{row.service}</strong></td>
                  <td>{row.attendance}</td>
                  <td><span className="money-in">{row.trend}</span></td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
