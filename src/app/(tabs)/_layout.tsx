import { Tabs } from "expo-router";
import {
  IconClock,
  IconDownload,
  IconInfoCircle,
  IconLink,
} from "tabler-icons-react-native";
import { Icon } from "@/components/ui/icon";
import {
  BACKGROUND,
  BORDER,
  FOREGROUND,
  MUTED_FOREGROUND,
  PRIMARY,
} from "@/lib/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: MUTED_FOREGROUND,
        tabBarStyle: {
          backgroundColor: BACKGROUND,
          borderTopColor: BORDER,
        },
        headerStyle: {
          backgroundColor: BACKGROUND,
        },
        headerShadowVisible: false,
        headerTintColor: FOREGROUND,
        headerTitleStyle: {
          fontFamily: "SpaceGrotesk",
          fontSize: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Yoink",
          tabBarIcon: ({ color }) => (
            <Icon as={IconLink} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: "Queue",
          tabBarIcon: ({ color }) => (
            <Icon as={IconDownload} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <Icon as={IconClock} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "About",
          tabBarIcon: ({ color }) => (
            <Icon as={IconInfoCircle} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
