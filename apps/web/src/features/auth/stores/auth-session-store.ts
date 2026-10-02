import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AuthSessionState = {
  accessToken: string;
  expiresIn: number | null;
  clearSession: () => void;
  setSession: (session: { accessToken: string; expiresIn: number }) => void;
};

export const useAuthSessionStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      accessToken: "",
      expiresIn: null,
      clearSession: () => set({ accessToken: "", expiresIn: null }),
      setSession: (session) => set(session)
    }),
    {
      name: "auth-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresIn: state.expiresIn
      })
    }
  )
);
