const userBreakdown = [
  { label: "Members", value: 9, color: "#7cc9c6" },
  { label: "Accountant", value: 3, color: "#e45784" },
  { label: "Management", value: 2, color: "#99a7b5" },
  { label: "Family Member", value: 5, color: "#9c8e2d" },
  { label: "Volunteer Member", value: 2, color: "#d3afe5" }
];

const paymentBreakdown = [
  { label: "Income", value: "$ 24820", color: "#9fcff1" },
  { label: "Expense", value: "$ 0", color: "#d8b1bd" },
  { label: "Net Profit", value: "$ 24820", color: "#8ac053" }
];

const dashboardShortcuts = [
  { label: "Member", value: "1", accent: "cyan", icon: "◌" },
  { label: "Accountant", value: "3", accent: "peach", icon: "▤" },
  { label: "Notice", value: "5", accent: "amber", icon: "△" },
  { label: "Message", value: "6", accent: "mint", icon: "◔" }
];

const monthlyAxis = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

function DonutCard({ centerLabel, centerValue, items, title, variant = "users" }) {
  const total = items.reduce((sum, item) => sum + (typeof item.value === "number" ? item.value : 0), 0);
  const gradient = items
    .map((item, index) => {
      const numericValue = typeof item.value === "number" ? item.value : 0;
      const previous = items
        .slice(0, index)
        .reduce((sum, current) => sum + (typeof current.value === "number" ? current.value : 0), 0);
      const start = total ? (previous / total) * 100 : 0;
      const end = total ? ((previous + numericValue) / total) * 100 : 100;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <article className="dashboard-panel">
      <div className="dashboard-panel-title">{title}</div>
      <div className={`donut-widget ${variant}`}>
        <div className="donut-ring" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="donut-hole">
            <strong>{centerValue}</strong>
            <span>{centerLabel}</span>
          </div>
        </div>
      </div>
      <div className={`donut-legend ${variant}`}>
        {items.map((item) => (
          <div key={item.label} className="donut-legend-item">
            <span className="legend-dot" style={{ background: item.color }}></span>
            <div>
              <strong>{typeof item.value === "number" ? item.value : item.value}</strong>
              <span>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ChartPanel({ title, legend, tone = "green" }) {
  return (
    <article className="dashboard-panel chart-panel">
      <div className="panel-header compact">
        <h3>{title}</h3>
        <span className={`chart-legend-tag ${tone}`}>{legend}</span>
      </div>

      <div className="mock-chart">
        <div className="chart-grid-lines">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="chart-axis-labels left">
          <span>1</span>
          <span>0.5</span>
          <span>0</span>
        </div>
        <div className={`chart-line chart-line-${tone}`}></div>
        <div className="chart-axis-labels bottom">
          {monthlyAxis.map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function DashboardPage({ bootstrap }) {
  const data = bootstrap.data;

  if (!data) {
    return null;
  }

  return (
    <div className="dashboard-reference">
      <section className="dashboard-overview-grid">
        <div className="dashboard-shortcuts-grid">
          {dashboardShortcuts.map((item) => (
            <article key={item.label} className="dashboard-shortcut-card">
              <div className={`shortcut-icon ${item.accent}`}>{item.icon}</div>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>

        <DonutCard
          title="Users"
          centerLabel="Users"
          centerValue="21"
          items={userBreakdown}
          variant="users"
        />

        <article className="dashboard-panel">
          <div className="dashboard-panel-title">Payment</div>
          <div className="donut-widget payment">
            <div
              className="donut-ring"
              style={{
                background:
                  "conic-gradient(#a8d3f3 0% 25%, #8cc553 25% 100%)"
              }}
            >
              <div className="donut-hole">
                <strong>$ 24820</strong>
                <span>Payment</span>
              </div>
            </div>
          </div>
          <div className="donut-legend payment payment-summary">
            {paymentBreakdown.map((item) => (
              <div key={item.label} className="donut-legend-item">
                <span className="legend-dot" style={{ background: item.color }}></span>
                <div>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-chart-stack">
        <ChartPanel title="Transaction/Donation" legend="Transaction/Donation" tone="green" />
        <ChartPanel title="Income Expense & Net Profit" legend="Income  Expense  Net Profit" tone="blue" />
      </section>

      <section className="dashboard-bottom-grid">
        <div className="dashboard-list-stack">
          <article className="dashboard-panel slim-list-panel">
            <div className="panel-header compact">
              <h3>Group List</h3>
            </div>
            <div className="simple-list">
              {["Word Group", "Acts Impact", "Apostles Winners"].map((item, index) => (
                <div key={item} className="simple-list-row">
                  <div className="simple-avatar gradient-a">{index + 1}</div>
                  <span>{item}</span>
                  <button type="button" className="mini-square-button">
                    +
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel slim-list-panel">
            <div className="panel-header compact">
              <h3>Ministry List</h3>
            </div>
            <div className="simple-list">
              {["Cultural Ministry", "Hospitality", "Praise Program"].map((item, index) => (
                <div key={item} className="simple-list-row">
                  <div className="simple-avatar gradient-b">{index + 1}</div>
                  <span>{item}</span>
                  <button type="button" className="mini-square-button">
                    +
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-panel slim-list-panel">
            <div className="panel-header compact">
              <h3>Activity List</h3>
            </div>
            <div className="simple-list">
              {data.dashboard.activities.map((activity) => (
                <div key={activity.id} className="simple-list-row activity-style">
                  <div className="simple-avatar gradient-c">{activity.category.charAt(0)}</div>
                  <div>
                    <strong>{activity.title}</strong>
                    <span>{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="dashboard-side-stack">
          <article className="dashboard-panel calendar-panel">
            <div className="panel-header compact">
              <h3>Calendar</h3>
              <span>APRIL 2026</span>
            </div>
            <div className="calendar-grid">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                <div key={day} className="calendar-head">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, index) => {
                const day = index - 1;
                const isHighlight = day === 15;
                const isAlert = day === 1;
                return (
                  <div
                    key={index}
                    className={`calendar-cell ${isHighlight ? "highlight" : ""} ${isAlert ? "alert" : ""}`}
                  >
                    {day > 0 && day <= 30 ? day : ""}
                  </div>
                );
              })}
            </div>
          </article>

          <article className="dashboard-panel slim-list-panel">
            <div className="panel-header compact">
              <h3>Services</h3>
            </div>
            <div className="simple-list">
              {[
                data.dashboard.summary.nextService,
                { title: "Midweek Service", time: "Wednesday, 6:30 PM" },
                { title: "Prayer Watch", time: "Friday, 5:30 PM" }
              ].map((service) => (
                <div key={service.title} className="simple-list-row activity-style">
                  <div className="simple-avatar gradient-d">S</div>
                  <div>
                    <strong>{service.title}</strong>
                    <span>{service.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-hidden-data">
        <article className="dashboard-panel">
          <div className="panel-header compact">
            <h3>Pastoral Care Queue</h3>
          </div>
          <div className="simple-list">
            {data.dashboard.careQueue.map((item) => (
              <div className="simple-list-row activity-style" key={item.name}>
                <div className="simple-avatar gradient-e">{item.priority.charAt(0)}</div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.reason}</span>
                </div>
                <span className={`status-pill status-${item.priority.toLowerCase()}`}>{item.priority}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
