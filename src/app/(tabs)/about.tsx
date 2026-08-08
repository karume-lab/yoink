import Constants from "expo-constants";
import {
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { IconWorld } from "tabler-icons-react-native";
import {
  GithubIcon,
  LinkedinIcon,
  TwitterIcon,
} from "@/components/ui/brand-icons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { PRIMARY } from "@/lib/colors";

import {
  GITHUB_URL,
  LINKEDIN_URL,
  PORTFOLIO_URL,
  TWITTER_URL,
} from "@/lib/constants";

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center mb-8">
        <View className="size-20 rounded-2xl bg-primary/15 items-center justify-center mb-4">
          <Image
            source={require("@/../assets/images/icon.png")}
            className="w-full h-full rounded-2xl"
            resizeMode="contain"
          />
        </View>
        <Text className="text-2xl font-bold text-foreground">Yoink</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          Version {version}
        </Text>
      </View>

      <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        About the App
      </Text>
      <View className="bg-card border border-border/50 rounded-md p-5 mb-6">
        <Text className="text-sm text-muted-foreground leading-6">
          Yoink is a personal media downloader that lets you download clean,
          watermark-free videos from TikTok and Instagram directly to your
          device. It processes everything locally on your device.
        </Text>
      </View>

      <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Developer
      </Text>
      <View className="bg-card border border-border/50 rounded-md p-5 mb-6">
        <Text className="text-sm text-muted-foreground leading-6">
          Powered by{" "}
          <Text className="line-through">coffee and sleepless nights</Text>{" "}
          <Text className="underline">karume-lab.</Text>
        </Text>
      </View>

      <Text className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Links
      </Text>
      <View className="bg-card border border-border/50 rounded-md overflow-hidden">
        <TouchableOpacity
          onPress={() => Linking.openURL(PORTFOLIO_URL)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-5 border-b border-border/10"
        >
          <View className="flex-row items-center gap-4">
            <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
              <Icon as={IconWorld} className="text-primary" size={20} />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground">
                Portfolio
              </Text>
              <Text className="text-xs text-muted-foreground">
                karume.vercel.app
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(GITHUB_URL)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-5 border-b border-border/10"
        >
          <View className="flex-row items-center gap-4">
            <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
              <GithubIcon color={PRIMARY} size={20} />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground">
                GitHub
              </Text>
              <Text className="text-xs text-muted-foreground">@Karume-lab</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(LINKEDIN_URL)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-5 border-b border-border/10"
        >
          <View className="flex-row items-center gap-4">
            <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
              <LinkedinIcon color={PRIMARY} size={20} />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground">
                LinkedIn
              </Text>
              <Text className="text-xs text-muted-foreground">
                Daniel Karume
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(TWITTER_URL)}
          activeOpacity={0.7}
          className="flex-row items-center justify-between p-5"
        >
          <View className="flex-row items-center gap-4">
            <View className="size-10 rounded-md bg-primary/10 items-center justify-center">
              <TwitterIcon color={PRIMARY} size={20} />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground">
                Twitter
              </Text>
              <Text className="text-xs text-muted-foreground">@karume_lab</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
