export default function FinancePage({ bootstrap }) {
  const data = bootstrap.data;

  if (!data) {
    return null;
  }

  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Stewardship</span>
          <h2>Finance Overview</h2>
        </div>
        <button className="primary-button" type="button">
          Export Report
        </button>
      </section>

      <section className="stats-grid finance-grid">
        {data.finance.summary.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </section>

      <section className="content-grid-two">
        <article className="panel-card">
          <div className="panel-header">
            <h3>Fund Performance</h3>
            <span>Giving and designated account balances</span>
          </div>
          <div className="stack-list">
            {data.finance.funds.map((fund) => (
              <div className="coverage-row" key={fund.name}>
                <div>
                  <strong>{fund.name}</strong>
                  <p>{fund.description}</p>
                </div>
                <strong>{fund.amount}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-header">
            <h3>Recent Transactions</h3>
            <span>Latest entries from the finance desk</span>
          </div>
          <div className="stack-list">
            {data.finance.transactions.map((transaction) => (
              <div className="transaction-row" key={transaction.id}>
                <div>
                  <strong>{transaction.title}</strong>
                  <p>{transaction.date}</p>
                </div>
                <span className={transaction.type === "Income" ? "money-in" : "money-out"}>
                  {transaction.amount}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
