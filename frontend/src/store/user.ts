import { create } from "zustand";
import { persist } from "zustand/middleware";

export type User = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    picture?: string | null;
    role: {
      id: string;
      name: string;
      /** Permission actions dari backend (digunakan untuk filter menu & akses) */
      actions: string[];
    };
    outlet_id?: string;
    role_id: string;
  };
};

type State = {
  user: User | null;
  setUser: (e: User) => void;
  deleteUser: () => void;
};

const useUserStore = create<State>()(
  persist(
    (set) => ({
      user: null,
      setUser: (e: User) => set(() => ({ user: e })),
      deleteUser: () => set(() => ({ user: null })),
    }),
    {
      name: "user",
    },
  ),
);

export default useUserStore;
