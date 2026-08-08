import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Keyboard, View } from "react-native";
import { LinkInput } from "@/components/core/LinkInput";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { enqueueDownload } from "@/features/downloads/services/queue";

export default function HomeScreen() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setUrl(text);
    }
  };

  const handleDownload = () => {
    if (!url) return;

    Keyboard.dismiss();
    enqueueDownload(url);
    setUrl("");

    // Navigate to queue to see progress
    router.push("/(tabs)/queue");
  };

  return (
    <View className="flex-1 bg-background px-4 py-6">
      <Text variant="display" className="mb-6 mt-4">
        Download Media
      </Text>

      <View className="mb-6">
        <LinkInput
          value={url}
          onChangeText={setUrl}
          onPaste={handlePaste}
          onSubmit={handleDownload}
        />
      </View>

      <Button onPress={handleDownload} disabled={!url}>
        <Text>Download</Text>
      </Button>
    </View>
  );
}
