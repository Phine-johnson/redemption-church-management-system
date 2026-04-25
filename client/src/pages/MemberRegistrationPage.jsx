const registrationSteps = [
  { title: "Profile Details", detail: "Name, contact information, birthday, and occupation." },
  { title: "Family Linking", detail: "Connect spouse, children, and household records." },
  { title: "Membership Journey", detail: "Track baptism, class completion, and ministry interests." }
];

export default function MemberRegistrationPage() {
  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker">Onboarding</span>
          <h2>Member Registration</h2>
        </div>
        <button className="primary-button" type="button">
          Start New Registration
        </button>
      </section>

      <section className="content-grid-two">
        <article className="panel-card">
          <div className="panel-header">
            <h3>Registration Flow</h3>
            <span>Simple intake process for new members</span>
          </div>
          <div className="stack-list">
            {registrationSteps.map((step) => (
              <div className="coverage-row" key={step.title}>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-header">
            <h3>Required Fields</h3>
            <span>Recommended starter schema</span>
          </div>
          <ul className="bullet-list ink-list">
            <li>Full name, phone number, email address</li>
            <li>Home address and emergency contact</li>
            <li>Marital status and household link</li>
            <li>Membership status and discipleship class stage</li>
            <li>Serving interests and pastoral notes</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
