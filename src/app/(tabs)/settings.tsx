import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { IG_SESSION_KEY } from "@/lib/constants";
import { useSettingsStore } from "@/stores/settingsStore";

export default function SettingsScreen() {
  const { saveToAlbum, albumName, updateSettings } = useSettingsStore();
  const [cookie, setCookie] = useState("");

  useEffect(() => {
    SecureStore.getItemAsync(IG_SESSION_KEY).then((val) => {
      if (val) setCookie(val);
    });
  }, []);

  const handleSaveCookie = async () => {
    if (cookie) {
      await SecureStore.setItemAsync(IG_SESSION_KEY, cookie);
    } else {
      await SecureStore.deleteItemAsync(IG_SESSION_KEY);
    }
  };

  return (
    <View className="flex-1 bg-background px-4 py-4 gap-6">
      <View className="gap-2">
        <Text variant="title">Downloads</Text>
        <Card className="p-3 gap-4 shadow-none">
          <View className="flex-row items-center justify-between">
            <Text variant="body">Save to specific album</Text>
            <Switch
              checked={saveToAlbum}
              onCheckedChange={(val: boolean) =>
                updateSettings({ saveToAlbum: val })
              }
            />
          </View>

          {saveToAlbum && (
            <View>
              <Text variant="caption" className="text-muted-foreground mb-1">
                Album Name
              </Text>
              <Input
                value={albumName}
                onChangeText={(val) => updateSettings({ albumName: val })}
                className="bg-background"
              />
            </View>
          )}
        </Card>
      </View>

      <View className="gap-2">
        <Text variant="title">Instagram Authentication</Text>
        <Text variant="caption" className="text-muted-foreground leading-snug">
          To download Instagram stories, provide your sessionid cookie. This is
          stored securely on your device.
        </Text>

        <Card className="p-3 gap-3 shadow-none">
          <Input
            value={cookie}
            onChangeText={setCookie}
            placeholder="sessionid"
            placeholderTextColor="#8F8F96"
            className="bg-background font-mono"
            secureTextEntry
          />
          <Button variant="secondary" onPress={handleSaveCookie}>
            <Text>Save Cookie</Text>
          </Button>
        </Card>
      </View>
    </View>
  );
}
