import { create } from "zustand";

type LayoutState = {
  mobileSidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  toggleSidebar: () => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  mobileSidebarOpen: false,
  sidebarCollapsed: false,
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}));
