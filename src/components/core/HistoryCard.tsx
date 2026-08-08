import { Image, TouchableOpacity, View } from "react-native";
import { IconExternalLink, IconShare } from "tabler-icons-react-native";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

interface HistoryCardProps {
  author?: string;
  platform: string;
  filename: string;
  coverUrl?: string;
  onShare?: () => void;
  onOpen?: () => void;
}

export function HistoryCard({
  author,
  platform,
  filename,
  coverUrl,
  onShare,
  onOpen,
}: HistoryCardProps) {
  return (
    <Card className="flex-row items-center p-3 py-3 gap-0 shadow-none">
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          className="w-12 h-12 rounded-md bg-popover mr-3"
          resizeMode="cover"
        />
      ) : (
        <View className="w-12 h-12 rounded-md bg-popover mr-3 items-center justify-center">
          <Text variant="mono" className="text-muted-foreground text-[10px]">
            {platform}
          </Text>
        </View>
      )}

      <View className="flex-1 mr-2">
        <Text variant="title" numberOfLines={1}>
          {author || "Unknown"} — {platform}
        </Text>
        <Text
          variant="mono"
          className="text-muted-foreground mt-1"
          numberOfLines={1}
        >
          {filename}
        </Text>
      </View>

      <View className="flex-row gap-2 shrink-0">
        {onShare && (
          <TouchableOpacity
            onPress={onShare}
            className="p-2 bg-popover rounded-md active:bg-border"
          >
            <Icon as={IconShare} className="text-foreground" />
          </TouchableOpacity>
        )}
        {onOpen && (
          <TouchableOpacity
            onPress={onOpen}
            className="p-2 bg-popover rounded-md active:bg-border"
          >
            <Icon as={IconExternalLink} className="text-foreground" />
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}
