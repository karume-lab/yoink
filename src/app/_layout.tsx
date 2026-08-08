import "../styles/global.css";

import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import { PortalHost } from "@rn-primitives/portal";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  BACKGROUND,
  BORDER,
  CARD,
  FOREGROUND,
  NOTIFICATION,
  PRIMARY,
} from "@/lib/colors";

SplashScreen.preventAutoHideAsync().catch(() => {});

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    background: BACKGROUND,
    card: CARD,
    text: FOREGROUND,
    border: BORDER,
    primary: PRIMARY,
    notification: NOTIFICATION,
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    SpaceGroteskMedium: SpaceGrotesk_500Medium,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    IBMPlexMono: IBMPlexMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ThemeProvider value={NAV_THEME}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="about"
            options={{ headerShown: false, presentation: "modal" }}
          />
        </Stack>
      </ThemeProvider>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
