import { View } from "react-native";
import { IconCheck } from "tabler-icons-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export type PermissionSlideType = "notifications" | "gallery";

const PERMISSION_CONTENT: Record<
  PermissionSlideType,
  { why: string; without: string; grantedLabel: string }
> = {
  notifications: {
    why: "Notifications tell you the moment a download finishes — even when you shared a link without opening Yoink.",
    without:
      "Without them, you'll have to keep checking the Queue tab to see if your download is done.",
    grantedLabel: "Notifications enabled",
  },
  gallery: {
    why: "Gallery access lets Yoink save downloads to the Yoink album so they show up in your gallery and WhatsApp's media picker.",
    without: "Without it, downloads can't be saved to your gallery.",
    grantedLabel: "Gallery access granted",
  },
};

interface PermissionSlideProps {
  type: PermissionSlideType;
  granted: boolean;
}

// Explains a permission and reflects whether it has been granted. Approval is
// handled by the onboarding's Next button, not a button on this slide.
export const PermissionSlide: React.FC<PermissionSlideProps> = ({
  type,
  granted,
}) => {
  const content = PERMISSION_CONTENT[type];

  return (
    <View className="w-full">
      <View className="bg-card border border-border rounded-md p-4 mb-4">
        <Text variant="body" className="leading-5">
          <Text className="text-primary font-semibold">Why we need it: </Text>
          <Text className="text-muted-foreground">{content.why}</Text>
        </Text>
        <Text variant="body" className="mt-3 leading-5">
          <Text className="text-primary font-semibold">Without it: </Text>
          <Text className="text-muted-foreground">{content.without}</Text>
        </Text>
      </View>
      {granted ? (
        <View className="self-center flex-row items-center gap-2 rounded-full border border-border bg-white/5 px-4 py-2">
          <Icon as={IconCheck} size={16} className="text-primary" />
          <Text variant="body" className="font-semibold text-primary">
            {content.grantedLabel}
          </Text>
        </View>
      ) : (
        <Text
          variant="caption"
          className="text-center leading-5 text-muted-foreground"
        >
          Tap the button below to grant this permission.
        </Text>
      )}
    </View>
  );
};
