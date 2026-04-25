const settingGroups = [
  { title: "Church Profile", detail: "Name, branches, contact numbers, and service times." },
  { title: "User Roles", detail: "Permissions for admins, accountants, volunteers, and members." },
  { title: "Notifications", detail: "Email, SMS, and internal reminders for church teams." },
  { title: "Integrations", detail: "Payment gateway, livestream tools, and export options." }
];

export default function SettingsPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Configuration</span>
          <h2>Settings</h2>
        </div>
        <button className="primary-button" type="button">
          Save Changes
        </button>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>System Areas</h3>
          <span>Core church management configuration blocks</span>
        </div>
        <div className="stack-list">
          {settingGroups.map((group) => (
            <div className="coverage-row" key={group.title}>
              <div>
                <strong>{group.title}</strong>
                <p>{group.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
