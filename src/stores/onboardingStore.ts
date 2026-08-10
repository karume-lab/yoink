import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import { zustandStorage } from "@/features/shared/store/storage";

const ONBOARDED_KEY = "isOnboarded";

// Backfill the dedicated flag for users who finished onboarding before it
// existed (the flag lives in the persisted zustand JSON in that case).
if (zustandStorage.getItem(ONBOARDED_KEY) === null) {
  try {
    const raw = zustandStorage.getItem("onboarding-storage");
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.state?.hasSeenOnboarding) {
      zustandStorage.setItem(ONBOARDED_KEY, "true");
    }
  } catch {
    // Corrupt store - treat as not onboarded.
  }
}

// Synchronous MMKV read so startup routing can decide the initial screen
// without waiting for zustand hydration.
export const isOnboarded = (): boolean =>
  zustandStorage.getItem(ONBOARDED_KEY) === "true";

interface OnboardingState {
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: isOnboarded(),
      completeOnboarding: () => {
        zustandStorage.setItem(ONBOARDED_KEY, "true");
        return set({ hasSeenOnboarding: true });
      },
      resetOnboarding: () => {
        zustandStorage.setItem(ONBOARDED_KEY, "false");
        return set({ hasSeenOnboarding: false });
      },
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => zustandStorage as StateStorage),
    },
  ),
);
