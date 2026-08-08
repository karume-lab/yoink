import { useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useEffect, useRef } from "react";
import { enqueueDownload } from "@/features/downloads/services/queue";

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  if (!match) return null;
  return match[0].replace(/[),.}\]"'?!]+$/, "");
}

export default function HandleShareScreen() {
  const router = useRouter();
  const { sharedPayloads, clearSharedPayloads } = useIncomingShare();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (sharedPayloads.length === 0) return;

    handled.current = true;
    clearSharedPayloads();

    const text = sharedPayloads
      .map((payload) => payload.value ?? "")
      .join(" ")
      .trim();

    const url = extractUrl(text);

    if (url) {
      enqueueDownload(url);
      router.replace("/(tabs)/queue");
    } else {
      router.replace("/(tabs)");
    }
  }, [sharedPayloads, clearSharedPayloads, router]);

  return null;
}
