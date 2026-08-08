import { createMMKV } from "react-native-mmkv";
import { APP_STORAGE_ID } from "@/lib/constants";

export const storage = createMMKV({
  id: APP_STORAGE_ID,
});

export const zustandStorage = {
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
