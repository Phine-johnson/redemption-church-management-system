const donations = [
  { donor: "Online Giving Batch", method: "Card", amount: "$5,420", date: "Apr 21, 2026" },
  { donor: "Sunday Offering", method: "Cash", amount: "$3,780", date: "Apr 20, 2026" },
  { donor: "Missions Pledge", method: "Transfer", amount: "$2,100", date: "Apr 18, 2026" }
];

export default function DonationsPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Giving</span>
          <h2>Donations</h2>
        </div>
        <button className="primary-button" type="button">
          Record Donation
        </button>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Recent Donations</h3>
          <span>Tracked giving channels and deposits</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((item) => (
                <tr key={`${item.donor}-${item.date}`}>
                  <td><strong>{item.donor}</strong></td>
                  <td>{item.method}</td>
                  <td><span className="money-in">{item.amount}</span></td>
                  <td>{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
