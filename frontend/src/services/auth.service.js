import apiClient from "./apiClient";

export const authService = {
  login: (payload) => apiClient.post("/auth/login", payload),
  getMe: () => apiClient.get("/auth/me"),
};
