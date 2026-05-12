import axios from "axios";
import { useAuthStore } from "../models/auth.store";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isAuthLoginCall = requestUrl.includes("/auth/login");
    const { token, logout } = useAuthStore.getState();
    if (status === 401 && token && !isAuthLoginCall) {
      // Expired/invalid session: clear auth state; route guards handle redirect.
      logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
