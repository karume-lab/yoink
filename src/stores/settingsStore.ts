import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { APP_STORAGE_ID } from "@/lib/constants";

const storage = createMMKV({
  id: `${APP_STORAGE_ID}-settings`,
});

const zustandStorage = {
  setItem: (name: string, value: string) => storage.set(name, value),
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => storage.remove(name),
};

interface SettingsStore {
  // Placeholder for future settings
  _initialized?: boolean;
  updateSettings: (
    updates: Partial<Omit<SettingsStore, "updateSettings">>,
  ) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      _initialized: true,
      updateSettings: (updates) => set((state) => ({ ...state, ...updates })),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);
