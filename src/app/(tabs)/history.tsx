import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, TouchableOpacity, View } from "react-native";
import { IconTrash } from "tabler-icons-react-native";
import { HistoryCard } from "@/components/core/HistoryCard";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { deleteYoinkAssets } from "@/features/downloads/services/yoinkAlbum";
import {
  deleteDownload,
  deleteDownloads,
  getAllDownloads,
  searchDownloads,
} from "@/features/history/services/queries";
import { useDownloadStore } from "@/stores/downloadStore";

type DownloadRow = {
  id: string;
  platform: string;
  author: string | null;
  localUri: string;
  assetId: string | null;
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

  const removeStoreJobs = (localUris: string[]) => {
    const uris = new Set(localUris);
    const store = useDownloadStore.getState();
    for (const job of Object.values(store.jobs)) {
      if (job.localUri && uris.has(job.localUri)) {
        store.removeJob(job.id);
      }
    }
  };

  const handleDeleteOne = (row: DownloadRow) => {
    Alert.alert(
      "Delete download?",
      "This removes the video from your gallery.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (row.assetId) {
                await deleteYoinkAssets([row.assetId]);
              }
            } catch (e) {
              console.error(e);
            }
            try {
              await deleteDownload(row.id);
            } catch (e) {
              console.error(e);
            }
            removeStoreJobs([row.localUri]);
            loadHistory();
          },
        },
      ],
    );
  };

  const handleDeleteAll = () => {
    if (history.length === 0) return;
    Alert.alert(
      "Delete all downloads?",
      `This permanently removes all ${history.length} videos from your gallery. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              const assetIds = history
                .map((row) => row.assetId)
                .filter((id): id is string => !!id);
              if (assetIds.length > 0) {
                await deleteYoinkAssets(assetIds);
              }
            } catch (e) {
              console.error(e);
            }
            try {
              await deleteDownloads(history.map((row) => row.id));
            } catch (e) {
              console.error(e);
            }
            removeStoreJobs(history.map((row) => row.localUri));
            loadHistory();
          },
        },
      ],
    );
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

      {history.length > 0 && (
        <View className="flex-row justify-end mb-3">
          <TouchableOpacity
            onPress={handleDeleteAll}
            className="flex-row items-center gap-2 p-2 rounded-md bg-popover"
          >
            <Icon as={IconTrash} size={16} className="text-destructive" />
            <Text variant="caption" className="text-destructive">
              Delete All
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
            onDelete={() => handleDeleteOne(item)}
          />
        )}
      />
    </View>
  );
}
