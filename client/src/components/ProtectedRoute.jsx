import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, session, allowedRoles }) {
  if (!session) return <Navigate to="/" replace />;

  const roleHome = {
    'Member': '/member-dashboard',
    'AudioVisual': '/media-audio',
    'Accountant': '/finance',
    'Clerk': '/clerk',
    'Super Admin': '/dashboard'
  };

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    const home = roleHome[session.role] || '/dashboard';
    return <Navigate to={home} replace />;
  }

  return children;
}
