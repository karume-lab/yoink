import { FlatList, TouchableOpacity, View } from "react-native";
import { IconTrash } from "tabler-icons-react-native";
import { DownloadCard } from "@/components/core/DownloadCard";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useDownloadStore } from "@/stores/downloadStore";

export default function QueueScreen() {
  const jobs = useDownloadStore((state) => Object.values(state.jobs));
  const removeCompleted = useDownloadStore((state) => state.removeCompleted);

  // Sort: active/error first, completed last, then by ID (which is loosely time based if nanoid, but we could add timestamp)
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.status === "complete" && b.status !== "complete") return 1;
    if (a.status !== "complete" && b.status === "complete") return -1;
    return 0;
  });

  const hasCompleted = jobs.some((j) => j.status === "complete");

  return (
    <View className="flex-1 bg-background">
      {hasCompleted && (
        <View className="flex-row justify-end px-4 py-2 border-b border-border">
          <TouchableOpacity
            onPress={removeCompleted}
            className="flex-row items-center gap-2 p-2 rounded-md bg-popover"
          >
            <Icon as={IconTrash} size={16} className="text-muted-foreground" />
            <Text variant="caption" className="text-muted-foreground">
              Clear Completed
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={sortedJobs}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 gap-3"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20">
            <Text variant="body" className="text-muted-foreground text-center">
              No active downloads
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DownloadCard
            platform={item.platform}
            author={item.author}
            status={item.status}
            progress={item.progress}
            error={item.error}
          />
        )}
      />
    </View>
  );
}
