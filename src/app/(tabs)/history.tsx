import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, FlatList, TouchableOpacity, View } from "react-native";
import { IconTrash } from "tabler-icons-react-native";
import { HistoryCard } from "@/components/core/HistoryCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { openVideoFile } from "@/features/downloads/services/openVideo";
import { deleteYoinkAssets } from "@/features/downloads/services/yoinkAlbum";
import {
  deleteDownload,
  deleteDownloads,
  getAllDownloads,
  searchDownloads,
} from "@/features/history/services/queries";
import { reconcileNativeDownloads } from "@/services/NativeDownloadSync";
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
  const [deleteTarget, setDeleteTarget] = useState<DownloadRow | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        reconcileNativeDownloads()
          .catch(() => {})
          .then(loadHistory);
      }
    });
    return () => subscription.remove();
  }, [loadHistory]);

  const handleOpen = (row: DownloadRow) => {
    openVideoFile(row.localUri, row.assetId);
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

  const confirmDeleteOne = async (row: DownloadRow) => {
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
  };

  const confirmDeleteAll = async () => {
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
            onPress={() => setDeleteAllOpen(true)}
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
            onOpen={() => handleOpen(item)}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete download?</DialogTitle>
            <DialogDescription>
              This removes the video from your gallery.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onPress={() => setDeleteTarget(null)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="default"
              onPress={() => {
                if (deleteTarget) confirmDeleteOne(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              <Text>Delete</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all downloads?</DialogTitle>
            <DialogDescription>
              This permanently removes all {history.length} videos from your
              gallery. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onPress={() => setDeleteAllOpen(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              variant="default"
              onPress={() => {
                setDeleteAllOpen(false);
                confirmDeleteAll();
              }}
            >
              <Text>Delete All</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
