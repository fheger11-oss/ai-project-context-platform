import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthSessionState = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number | null;
  clearSession: () => void;
  setSession: (session: { accessToken: string; refreshToken: string; expiresIn: number }) => void;
};

export const useAuthSessionStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      accessToken: "",
      refreshToken: "",
      expiresIn: null,
      clearSession: () => set({ accessToken: "", refreshToken: "", expiresIn: null }),
      setSession: (session) => set(session)
    }),
    {
      name: "auth-session",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresIn: state.expiresIn
      })
    }
  )
);
