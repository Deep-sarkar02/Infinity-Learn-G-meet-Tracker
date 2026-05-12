import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../models/auth.store";

export const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!user || !token) {
    const path = String(location?.pathname || "");
    if (path.startsWith("/teacher")) {
      return <Navigate to="/login/teacher" replace />;
    }
    if (path.startsWith("/admin")) {
      return <Navigate to="/login/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
};

export const PublicOnlyRoute = ({ children }) => {
  const { user } = useAuthStore();
  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
};
