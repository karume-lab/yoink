import { useRouter } from "expo-router";
import { useIncomingShare } from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
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
  const [status, setStatus] = useState<"idle" | "downloading" | "error">(
    "idle",
  );

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
      setStatus("downloading");
      enqueueDownload(url, { notify: true });
    } else {
      setStatus("error");
    }
  }, [sharedPayloads, clearSharedPayloads]);

  return (
    <View className="flex-1 items-center justify-center bg-background px-8 gap-4">
      <Text variant="title" className="text-center">
        {status === "error" ? "No link found" : "Downloading"}
      </Text>
      <Text
        variant="body"
        className="text-center text-muted-foreground leading-snug"
      >
        {status === "error"
          ? "Yoink couldn't find a link in what was shared. Try sharing the link again."
          : "Yoink is downloading your media in the background - you can leave now."}
      </Text>
      <Button
        variant="secondary"
        className="mt-2"
        onPress={() => router.replace("/(tabs)/queue")}
      >
        <Text>{status === "error" ? "Go to downloads" : "View queue"}</Text>
      </Button>
    </View>
  );
}
