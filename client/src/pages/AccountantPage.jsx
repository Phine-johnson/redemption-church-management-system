import { Link } from "react-router-dom";

export default function AccountantPage({ bootstrap }) {
  const data = bootstrap.data;

  if (!data) {
    return null;
  }

  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Finance</span>
          <h2>Accountant Dashboard</h2>
        </div>
      </section>

      <section className="dashboard-grid">
        <Link to="/finance" className="dashboard-card">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h3>Financial Reports</h3>
            <p>View financial reports and transactions</p>
          </div>
        </Link>

        <Link to="/donations" className="dashboard-card">
          <div className="card-icon">💝</div>
          <div className="card-content">
            <h3>Donations</h3>
            <p>Track donations and issue receipts</p>
          </div>
        </Link>

        <Link to="/budget" className="dashboard-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Budget Management</h3>
            <p>Manage church budget</p>
          </div>
        </Link>

        <Link to="/expenses" className="dashboard-card">
          <div className="card-icon">📝</div>
          <div className="card-content">
            <h3>Expenses</h3>
            <p>Approve and track expenses</p>
          </div>
        </Link>

        <Link to="/invoicing" className="dashboard-card">
          <div className="card-icon">🧾</div>
          <div className="card-content">
            <h3>Invoicing</h3>
            <p>Create invoices and process payments</p>
          </div>
        </Link>
      </section>
    </div>
  );
}