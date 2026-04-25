const familyUnits = [
  { name: "Coleman Family", members: 5, zone: "North Community", status: "Active" },
  { name: "Asante Household", members: 4, zone: "East Fellowship", status: "Active" },
  { name: "Boateng Family", members: 3, zone: "West Care Group", status: "Pending" }
];

export default function FamiliesPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Households</span>
          <h2>Family Records</h2>
        </div>
        <button className="primary-button" type="button">
          Add Family
        </button>
      </section>

      <article className="panel-card">
        <div className="panel-header">
          <h3>Household Directory</h3>
          <span>Grouped family records and care zones</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Family</th>
                <th>Members</th>
                <th>Zone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {familyUnits.map((family) => (
                <tr key={family.name}>
                  <td><strong>{family.name}</strong></td>
                  <td>{family.members}</td>
                  <td>{family.zone}</td>
                  <td>
                    <span className={`status-pill status-${family.status.toLowerCase()}`}>
                      {family.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
