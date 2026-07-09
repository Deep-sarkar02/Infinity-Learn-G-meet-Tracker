import { create } from "zustand";

const STORAGE_KEY = "meeting_platform_auth";

const getSessionStorage = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
};

const getLocalStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const parseStoredAuth = (raw) => {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  const token = typeof parsed?.token === "string" ? parsed.token.trim() : "";
  const user = parsed?.user ?? null;
  if (!token || !user) return null;
  if (user.role === "student") return null;
  return { token, user };
};

const readPersistedAuth = () => {
  try {
    const local = getLocalStorage();
    const session = getSessionStorage();
    const fromLocal = parseStoredAuth(local?.getItem(STORAGE_KEY));
    if (fromLocal) return fromLocal;
    const fromSession = parseStoredAuth(session?.getItem(STORAGE_KEY));
    if (fromSession) return fromSession;
    return { token: "", user: null };
  } catch {
    return { token: "", user: null };
  }
};

const getActiveStorage = () => {
  const local = getLocalStorage();
  if (local?.getItem(STORAGE_KEY)) return local;
  return getSessionStorage();
};

const persistAuth = (token, user, rememberMe) => {
  const local = getLocalStorage();
  const session = getSessionStorage();
  const payload = JSON.stringify({ token, user });
  if (rememberMe) {
    local?.setItem(STORAGE_KEY, payload);
    session?.removeItem(STORAGE_KEY);
  } else {
    session?.setItem(STORAGE_KEY, payload);
    local?.removeItem(STORAGE_KEY);
  }
};

const clearPersistedAuth = () => {
  getLocalStorage()?.removeItem(STORAGE_KEY);
  getSessionStorage()?.removeItem(STORAGE_KEY);
};

export const useAuthStore = create((set) => ({
  ...readPersistedAuth(),
  setSession: ({ token, user }, rememberMe = false) =>
    set(() => {
      persistAuth(token, user, rememberMe);
      return { token, user };
    }),
  setUser: (user) =>
    set((state) => {
      if (!state.token) return state;
      const storage = getActiveStorage();
      if (storage) {
        storage.setItem(STORAGE_KEY, JSON.stringify({ token: state.token, user }));
      }
      return { ...state, user };
    }),
  logout: () =>
    set(() => {
      clearPersistedAuth();
      return { token: "", user: null };
    }),
}));
