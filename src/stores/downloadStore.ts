import { createMMKV } from "react-native-mmkv";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DownloadJob } from "@/features/downloads/types";
import { APP_STORAGE_ID } from "@/lib/constants";

const storage = createMMKV({
  id: `${APP_STORAGE_ID}-downloads`,
});

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.remove(name);
  },
};

interface DownloadStore {
  jobs: Record<string, DownloadJob>;
  addJob: (job: DownloadJob) => void;
  updateJob: (id: string, updates: Partial<DownloadJob>) => void;
  removeJob: (id: string) => void;
  removeCompleted: () => void;
  clearAll: () => void;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set) => ({
      jobs: {},
      addJob: (job) =>
        set((state) => ({ jobs: { ...state.jobs, [job.id]: job } })),
      updateJob: (id, updates) =>
        set((state) => {
          const job = state.jobs[id];
          if (!job) return state;
          return { jobs: { ...state.jobs, [id]: { ...job, ...updates } } };
        }),
      removeJob: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.jobs;
          return { jobs: rest };
        }),
      removeCompleted: () =>
        set((state) => {
          const rest = Object.fromEntries(
            Object.entries(state.jobs).filter(
              ([_, job]) => job.status !== "complete",
            ),
          );
          return { jobs: rest };
        }),
      clearAll: () => set({ jobs: {} }),
    }),
    {
      name: "download-storage",
      storage: createJSONStorage(() => zustandStorage),
      // Only persist completed jobs (or error jobs) so we don't restore stuck in-flight jobs
      partialize: (state) => ({
        jobs: Object.fromEntries(
          Object.entries(state.jobs).filter(
            ([_, job]) => job.status === "complete" || job.status === "error",
          ),
        ),
      }),
    },
  ),
);
