import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MetricChip from "../ui/MetricChip";
import { fetchJson, fetchDailyDevotional } from "../services/api";

const roleEmails = {
  'Super Admin': 'admin@redemptionpresby.org',
  'AudioVisual': 'audiovisual@redemptionpresby.org',
  'Accountant': 'accountant@redemptionpresby.org',
  'Clerk': 'clerk@redemptionpresby.org',
  'Member': 'member@redemptionpresby.org'
};

const roleDestinations = {
  'Super Admin': '/dashboard',
  'AudioVisual': '/media-audio',
  'Accountant': '/accountant',
  'Clerk': '/clerk',
  'Member': '/member-dashboard'
};

const roleLabels = {
  'Super Admin': 'Super Admin',
  'AudioVisual': 'Audio Visuals',
  'Accountant': 'Accountant',
  'Clerk': 'Clerk',
  'Member': 'Member'
};

const defaultVerse = {
  reference: "Philippians 4:13",
  text: "I can do all things through Christ who strengthens me.",
  meditation: "Whatever challenges you face this week, remember that Christ strengthens you. You are capable of more than you think!"
};

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('Super Admin');
  const [weeklyVerse, setWeeklyVerse] = useState(defaultVerse);
  const [formData, setFormData] = useState({
    email: 'admin@redemptionpresby.org',
    password: '',
    rememberMe: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadVerse = async () => {
      try {
        const verse = await fetchDailyDevotional();
        if (verse) {
          setWeeklyVerse({
            reference: verse.verse,
            text: verse.text.split('. ')[0] + '.',
            meditation: verse.text
          });
        }
      } catch (err) {
        console.error("Failed to load verse:", err);
      }
    };
    loadVerse();
  }, []);

  const handleRoleSelect = (role) => {
    if (role === 'Member') {
      navigate('/members', { replace: true });
      return;
    }
    setSelectedRole(role);
    setFormData((current) => ({
      ...current,
      email: roleEmails[role]
    }));
  };

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = await fetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(formData)
      });

      if (!payload || !payload.user) {
        throw new Error("Invalid response from server.");
      }

      if (payload.message === "Invalid email or password.") {
        throw new Error("Invalid email or password.");
      }

      onLogin(payload.user);

      const destination = roleDestinations[payload.user.role] || '/dashboard';
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page login-page-reference">
      <div className="reference-shape shape-left"></div>
      <div className="reference-shape shape-right"></div>
      <div className="reference-ring"></div>

      <section className="reference-card">
        <header className="reference-banner">
          <div className="reference-badge" aria-hidden="true">
            <div className="badge-circle presby-badge-circle">
              <span className="presby-mini-shield"></span>
            </div>
          </div>
          <div>
            <h1>Redemption Presby Congregation</h1>
            <p>New Gbawe District Church Management System</p>
          </div>
        </header>

        <div className="bible-verse-banner">
          <div className="bible-verse-label">Bible Verse of the Week</div>
          <div className="bible-verse-reference">{weeklyVerse.reference}</div>
          <div className="bible-verse-text">"{weeklyVerse.text}"</div>
          <div className="bible-verse-meditation">{weeklyVerse.meditation}</div>
        </div>

        <div className="reference-layout">
          <aside className="reference-sidebar">
            <div className="reference-logo-mark" aria-hidden="true">
              <div className="presby-logo">
                <span className="presby-leaf presby-leaf-left"></span>
                <span className="presby-leaf presby-leaf-right"></span>
                <div className="presby-logo-core">
                  <div className="presby-logo-book"></div>
                  <div className="presby-logo-shield">
                    <span className="shield-block shield-blue"></span>
                    <span className="shield-block shield-red"></span>
                    <span className="shield-cross"></span>
                    <span className="shield-palm"></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="reference-logo-copy">
              <h2>REDEMPTION PRESBY</h2>
              <p>Congregation, New Gbawe District</p>
            </div>

            <div className="reference-menu">
              <button className="reference-menu-item is-active" type="button">
                Church Management Login
              </button>
              <button className="reference-menu-item" type="button">
                Member Registration
              </button>
              <button className="reference-menu-item" type="button">
                Admin Demo
              </button>
            </div>

            <div className="reference-metric-stack">
              <MetricChip label="Members" value="1,284" />
              <MetricChip label="Families" value="416" />
            </div>
          </aside>

          <section className="reference-main">
            <form className="reference-form" onSubmit={handleSubmit}>
              <div className="reference-fields">
                <label className="reference-field">
                  <span>Email Address</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@redemptionpresby.org"
                    required
                  />
                </label>

                <label className="reference-field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                  />
                </label>
              </div>

              <div className="reference-actions">
                <label className="reference-check">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <span>Remember Me</span>
                </label>

                <div className="reference-action-row">
                  <button className="reference-login-button" type="submit" disabled={submitting}>
                    {submitting ? "LOGGING IN..." : "LOG IN"}
                  </button>
                </div>
              </div>

              {error ? <p className="form-error">{error}</p> : null}
            </form>

            <div className="reference-role-grid">
              {Object.entries(roleLabels).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  className={`reference-role-card ${selectedRole === role ? "is-selected" : ""}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <span className="reference-role-icon">{label.charAt(0)}</span>
                  <strong>{label}</strong>
                  {selectedRole === role ? <span className="reference-role-plus">+</span> : null}
                </button>
              ))}
            </div>

            <div className="reference-footer">
              <button className="reference-help-button" type="button">
                <span className="reference-help-icon">📖</span>
                Read the Bible
              </button>
            </div>
          </section>
        </div>

        <div className="reference-leaf" aria-hidden="true">
          <span className="leaf-stem"></span>
          <span className="leaf-part leaf-part-a"></span>
          <span className="leaf-part leaf-part-b"></span>
          <span className="leaf-part leaf-part-c"></span>
          <span className="leaf-part leaf-part-d"></span>
        </div>

        <div className="reference-brand-mark" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>
    </main>
  );
}