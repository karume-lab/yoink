import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { HistoryCard } from "@/components/core/HistoryCard";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  getAllDownloads,
  searchDownloads,
} from "@/features/history/services/queries";

type DownloadRow = {
  id: string;
  platform: string;
  author: string | null;
  localUri: string;
  coverUrl: string | null;
};

export default function HistoryScreen() {
  const [history, setHistory] = useState<DownloadRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const results = searchQuery
        ? await searchDownloads(searchQuery)
        : await getAllDownloads();
      setHistory(results as DownloadRow[]);
    } catch (e) {
      console.error(e);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpen = (uri: string) => {
    Linking.openURL(uri).catch(() => {});
  };

  return (
    <View className="flex-1 bg-background px-4 py-2">
      <Input
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search history..."
        placeholderTextColor="#8F8F96"
        className="bg-card border border-border rounded-lg px-3 py-2 text-foreground font-body mb-4"
      />

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 pb-6"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <Text variant="body" className="text-muted-foreground text-center">
              No downloads yet
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryCard
            platform={item.platform}
            author={item.author ?? undefined}
            filename={item.localUri.split("/").pop() || "video.mp4"}
            coverUrl={item.coverUrl ?? undefined}
            onOpen={() => handleOpen(item.localUri)}
          />
        )}
      />
    </View>
  );
}
