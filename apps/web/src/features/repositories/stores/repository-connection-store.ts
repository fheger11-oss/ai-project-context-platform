import { create } from "zustand";
import { persist } from "zustand/middleware";

type RepositoryConnectionState = {
  apiAccessToken: string;
  githubAccessToken: string;
  setApiAccessToken: (token: string) => void;
  setGithubAccessToken: (token: string) => void;
};

export const useRepositoryConnectionStore = create<RepositoryConnectionState>()(
  persist(
    (set) => ({
      apiAccessToken: "",
      githubAccessToken: "",
      setApiAccessToken: (apiAccessToken) => set({ apiAccessToken }),
      setGithubAccessToken: (githubAccessToken) => set({ githubAccessToken })
    }),
    {
      name: "repository-connection"
    }
  )
);
