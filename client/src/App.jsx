import { useEffect, useState, useCallback } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountantPage from "./pages/AccountantPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import AttendancePage from "./pages/AttendancePage";
import BiblePage from "./pages/BiblePage";
import ClerkPage from "./pages/ClerkPage";
import DashboardPage from "./pages/DashboardPage";
import DonationsPage from "./pages/DonationsPage";
import EventsPage from "./pages/EventsPage";
import FamiliesPage from "./pages/FamiliesPage";
import FinancePage from "./pages/FinancePage";
import LoginPage from "./pages/LoginPage";
import MediaAudioPage from "./pages/MediaAudioPage";
import MemberHomePage from "./pages/MemberHomePage";
import MemberRegistrationPage from "./pages/MemberRegistrationPage";
import MembersPage from "./pages/MembersPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import VolunteersPage from "./pages/VolunteersPage";
import { fetchJson } from "./services/api";

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Loading church data...</p>
    </div>
  );
}

const initialSession = () => {
  try {
    return JSON.parse(window.localStorage.getItem("cms-session")) || null;
  } catch {
    return null;
  }
};

function AppRoutes() {
  const [session, setSession] = useState(initialSession);
  const [bootstrap, setBootstrap] = useState({
    loading: Boolean(initialSession()),
    error: "",
    data: null
  });

  // Handle logout with token cleanup
  const handleLogout = useCallback(async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      setSession(null);
      localStorage.removeItem('cms-session');
      localStorage.removeItem('cms-access-token');
      localStorage.removeItem('cms-refresh-token');
    }
  }, []);

  useEffect(() => {
    if (session) {
      window.localStorage.setItem("cms-session", JSON.stringify(session));
    } else {
      window.localStorage.removeItem("cms-session");
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    setBootstrap((current) => ({ ...current, loading: true, error: "" }));

    fetchJson("/api/bootstrap")
      .then((data) => {
        if (!ignore) {
          setBootstrap({ loading: false, error: "", data });
        }
      })
      .catch((error) => {
        if (!ignore) {
          setBootstrap({
            loading: false,
            error: error.message || "Unable to load church data.",
            data: null
          });
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LoginPage onLogin={setSession} />} />
      <Route
        path="/member-dashboard"
        element={
          <ProtectedRoute session={session}>
            <MemberHomePage session={session} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/media-audio"
        element={
          <ProtectedRoute session={session} allowedRoles={['AudioVisual']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <MediaAudioPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/accountant"
        element={
          <ProtectedRoute session={session} allowedRoles={['Accountant']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <AccountantPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clerk"
        element={
          <ProtectedRoute session={session} allowedRoles={['Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <ClerkPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/media-library"
        element={
          <ProtectedRoute session={session} allowedRoles={['AudioVisual']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <EventsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/live-streaming"
        element={
          <ProtectedRoute session={session} allowedRoles={['AudioVisual']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <EventsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sermons"
        element={
          <ProtectedRoute session={session} allowedRoles={['AudioVisual']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <EventsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/graphics"
        element={
          <ProtectedRoute session={session} allowedRoles={['AudioVisual']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <EventsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/budget"
        element={
          <ProtectedRoute session={session} allowedRoles={['Accountant', 'Super Admin']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <FinancePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute session={session} allowedRoles={['Accountant', 'Super Admin']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <FinancePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoicing"
        element={
          <ProtectedRoute session={session} allowedRoles={['Accountant', 'Super Admin']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <FinancePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/visitors"
        element={
          <ProtectedRoute session={session} allowedRoles={['Clerk', 'Super Admin']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <AttendancePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <DashboardPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/members"
        element={
          bootstrap.loading ? <LoadingState /> : <MembersPage bootstrap={bootstrap} session={session} />
        }
      />
      <Route
        path="/member-registration"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <MemberRegistrationPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <AttendancePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'AudioVisual', 'Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <EventsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteers"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'AudioVisual']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <VolunteersPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/families"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <FamiliesPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'AudioVisual', 'Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <AnnouncementsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bible"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'AudioVisual', 'Accountant', 'Clerk', 'Member']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <BiblePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/read-bible"
        element={
          <div className="public-bible-page">
            <BiblePage bootstrap={bootstrap} />
          </div>
        }
      />
      <Route
        path="/donations"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'Accountant']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <DonationsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'Accountant', 'Clerk']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <ReportsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin', 'Accountant']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <FinancePage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute session={session} allowedRoles={['Super Admin']}>
            <AppShell session={session} onLogout={handleLogout} bootstrap={bootstrap}>
              <SettingsPage bootstrap={bootstrap} />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <Navigate 
            to={
              session 
                ? ({
                    'Member': '/member-dashboard',
                    'AudioVisual': '/media-audio',
                    'Accountant': '/accountant',
                    'Clerk': '/clerk',
                    'Super Admin': '/dashboard'
                  }[session.role] || '/dashboard') 
                : "/"
            } 
            replace 
          />
        }
      />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;