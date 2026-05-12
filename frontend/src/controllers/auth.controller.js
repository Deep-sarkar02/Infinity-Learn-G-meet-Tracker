import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../models/auth.store";
import { useToast } from "../hooks/useToast";

const routeByRole = {
  admin: "/admin",
  teacher: "/teacher",
};

export const useAuthController = () => {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  const login = async (payload, expectedRole) => {
    setLoading(true);
    try {
      const { data } = await authService.login(payload);
      const loggedInRole = data.data.user.role;
      if (expectedRole && expectedRole !== loggedInRole) {
        pushToast({
          title: `This login is only for ${expectedRole}. You are registered as ${loggedInRole}.`,
          variant: "error",
        });
        return;
      }
      setSession(data.data);
      pushToast({ title: "Login successful" });
      navigate(routeByRole[loggedInRole] || "/");
    } catch (error) {
      pushToast({
        title: error.response?.data?.message || "Unable to login",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return { login, loading };
};
