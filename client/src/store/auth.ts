import { create } from "zustand";

type User = { id: string; name: string; username?: string; email: string };
type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem("teamflow.token"),
  user: JSON.parse(localStorage.getItem("teamflow.user") ?? "null"),
  setAuth: (token, user) => {
    localStorage.setItem("teamflow.token", token);
    localStorage.setItem("teamflow.user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("teamflow.token");
    localStorage.removeItem("teamflow.user");
    set({ token: null, user: null });
  }
}));
