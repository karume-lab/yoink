import { TouchableOpacity, View } from "react-native";
import {
  IconAlertTriangle,
  IconCheck,
  IconRotateClockwise,
} from "tabler-icons-react-native";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { TapeProgress } from "@/components/ui/progress";
import { Text } from "@/components/ui/text";

export type DownloadStatus =
  | "queued"
  | "extracting"
  | "downloading"
  | "saving"
  | "complete"
  | "error";

interface DownloadCardProps {
  author?: string;
  platform: string;
  status: DownloadStatus;
  progress?: number; // 0 to 1
  error?: string;
  onRetry?: () => void;
}

export function DownloadCard({
  author,
  platform,
  status,
  progress = 0,
  error,
  onRetry,
}: DownloadCardProps) {
  const isInFlight = ["queued", "extracting", "downloading", "saving"].includes(
    status,
  );

  return (
    <Card className="flex-row items-center justify-between p-3 py-3 gap-0 shadow-none">
      <View className="flex-1 mr-4">
        <Text variant="title" numberOfLines={1}>
          {author || "Unknown"} - {platform}
        </Text>
        <Text
          variant="mono"
          className="text-muted-foreground mt-1"
          numberOfLines={1}
        >
          {error || status}
        </Text>
      </View>

      <View className="flex-row items-center gap-2 shrink-0">
        {isInFlight && <TapeProgress progress={progress} segments={15} />}
        {status === "complete" && (
          <Icon as={IconCheck} className="text-success" />
        )}
        {status === "error" && (
          <>
            <Icon as={IconAlertTriangle} className="text-destructive" />
            {onRetry && (
              <TouchableOpacity
                onPress={onRetry}
                className="p-2 bg-popover rounded-md active:bg-border"
              >
                <Icon as={IconRotateClockwise} className="text-foreground" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Card>
  );
}
