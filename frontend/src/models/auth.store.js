import { create } from "zustand";

const STORAGE_KEY = "meeting_platform_auth";

const getStorage = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
};

const readPersistedAuth = () => {
  try {
    const storage = getStorage();
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { token: "", user: null };
    const parsed = JSON.parse(raw);
    const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
    const user = parsed?.user ?? null;
    if (!token || !user) {
      storage?.removeItem(STORAGE_KEY);
      return { token: "", user: null };
    }
    if (user.role === "student") {
      storage?.removeItem(STORAGE_KEY);
      return { token: "", user: null };
    }
    return { token, user };
  } catch {
    return { token: "", user: null };
  }
};

const persistAuth = (token, user) => {
  const storage = getStorage();
  storage?.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
};

export const useAuthStore = create((set) => ({
  ...readPersistedAuth(),
  setSession: ({ token, user }) =>
    set(() => {
      persistAuth(token, user);
      return { token, user };
    }),
  setUser: (user) =>
    set((state) => {
      if (!state.token) return state;
      persistAuth(state.token, user);
      return { ...state, user };
    }),
  logout: () =>
    set(() => {
      const storage = getStorage();
      storage?.removeItem(STORAGE_KEY);
      return { token: "", user: null };
    }),
}));
