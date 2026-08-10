import { ScrollView, View } from "react-native";
import {
  IconCloudDownload,
  IconDownload,
  IconLink,
  IconShare,
} from "tabler-icons-react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PRIMARY } from "@/lib/colors";

const FEATURES = [
  { icon: IconLink, label: "Share or paste any TikTok, Instagram or X link" },
  { icon: IconDownload, label: "Videos save to a Yoink album in your gallery" },
  { icon: IconShare, label: "Ready to repost to your WhatsApp status" },
];

interface WelcomeSlideProps {
  topInset: number;
}

// Step 1 of onboarding: introduces the app before the permission steps
// follow.
export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({ topInset }) => {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 32,
        paddingTop: topInset + 24,
        paddingBottom: 24,
        justifyContent: "center",
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-5 items-center">
        <View className="mb-4 size-20 items-center justify-center rounded-md bg-white/10">
          <IconCloudDownload size={40} color={PRIMARY} />
        </View>
        <Text
          variant="display"
          className="mb-2 text-center text-[26px] font-semibold leading-tight"
        >
          Welcome to Yoink
        </Text>
        <Text
          variant="body"
          className="text-center leading-5 text-muted-foreground"
        >
          Download reels, posts and videos from TikTok, Instagram and X.
          Everything lands in a Yoink album in your gallery, ready to repost
          anywhere.
        </Text>
      </View>

      <View className="gap-2.5 rounded-md border border-border bg-card p-4">
        {FEATURES.map(({ icon, label }) => (
          <View key={label} className="flex-row items-center gap-2">
            <Icon as={icon} size={14} className="text-primary" />
            <Text variant="body" className="flex-1">
              {label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
