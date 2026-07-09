import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../models/auth.store";

const loginPathForRoles = (roles) => {
  if (roles?.includes("teacher")) return "/login/teacher";
  if (roles?.includes("admin")) return "/login/admin";
  return "/";
};

export const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!user || !token) {
    const path = String(location?.pathname || "");
    if (path.startsWith("/teacher")) {
      return <Navigate to="/login/teacher" replace state={{ from: location }} />;
    }
    if (path.startsWith("/admin")) {
      return <Navigate to="/login/admin" replace state={{ from: location }} />;
    }
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Wrong role for this area — send to that portal's login so the user can switch accounts,
    // instead of bouncing them back to their current role's dashboard.
    return <Navigate to={loginPathForRoles(roles)} replace state={{ from: location }} />;
  }

  return children;
};

/** Public login routes — only skip the form when the stored session matches this portal. */
export const PublicOnlyRoute = ({ children, forRole }) => {
  const { user } = useAuthStore();
  if (user && forRole && user.role === forRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
};
