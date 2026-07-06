import { create } from "zustand";
import { persist } from "zustand/middleware";

type NavigationStore = {
  isSidebarOpen: boolean;
  isSidebarOpenMobile: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebarMobile: () => void;
  closeSidebarMobile: () => void;
};

const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      isSidebarOpen: false,
      isSidebarOpenMobile: false,
      toggleSidebar: () =>
        set((state) => ({
          isSidebarOpen: !state.isSidebarOpen,
        })),
      closeSidebar: () =>
        set(() => ({
          isSidebarOpen: false,
        })),
      toggleSidebarMobile: () =>
        set((state) => ({
          isSidebarOpenMobile: !state.isSidebarOpenMobile,
        })),
      closeSidebarMobile: () =>
        set(() => ({
          isSidebarOpenMobile: false,
        })),
    }),
    {
      name: "navigation",
    }
  )
);

export default useNavigationStore;
