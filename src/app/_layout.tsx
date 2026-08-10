import "../styles/global.css";

import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import { PortalHost } from "@rn-primitives/portal";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { DarkTheme, Stack, ThemeProvider, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { db } from "@/db/client";
import migrations from "@/db/migrations/migrations";
import { openVideoFile } from "@/features/downloads/services/openVideo";
import {
  BACKGROUND,
  BORDER,
  CARD,
  FOREGROUND,
  NOTIFICATION,
  PRIMARY,
} from "@/lib/colors";
import {
  registerBackgroundTasks,
  runStartupCleanup,
} from "@/services/BackgroundTasks";
import { reconcileNativeDownloads } from "@/services/NativeDownloadSync";
import { requestNotificationsIfNeeded } from "@/services/Notifications";
import { useOnboardingStore } from "@/stores/onboardingStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Register the background task. expo-task-manager can fire the background
// handler on cold start before this module registers it; registerTaskAsync is
// idempotent and this never blocks startup.
registerBackgroundTasks().catch(() => {});

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

function RouteGuard() {
  const router = useRouter();
  const hasSeenOnboarding = useOnboardingStore(
    (state) => state.hasSeenOnboarding,
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data && typeof data.localUri === "string") {
          openVideoFile(
            data.localUri,
            typeof data.assetId === "string" ? data.assetId : null,
          );
        }
      },
    );
    return () => subscription.remove();
  }, []);

  // Not-yet-onboarded users should only ever see the onboarding screen.
  useEffect(() => {
    (async () => {
      // Import native share downloads first, so the retention cleanup that
      // follows applies to them too.
      await reconcileNativeDownloads().catch(() => {});
      runStartupCleanup();
    })();
    if (hasSeenOnboarding) {
      // One-time prompt for users who onboarded before notifications were an
      // onboarding step; new users are asked on step 2 of onboarding.
      requestNotificationsIfNeeded().catch(() => {});
      return;
    }
    if (router.canGoBack()) router.replace("/");
  }, [hasSeenOnboarding, router]);

  // Reconcile native share downloads and purge expired ones whenever the app
  // returns to the foreground, so the Queue/History tabs stay fresh without a
  // full restart and we don't rely solely on the OS background task.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        reconcileNativeDownloads()
          .catch(() => {})
          .then(() => runStartupCleanup());
      }
    });
    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    SpaceGroteskMedium: SpaceGrotesk_500Medium,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    IBMPlexMono: IBMPlexMono_400Regular,
  });

  const { success: migrationSuccess, error: migrationError } = useMigrations(
    db,
    migrations,
  );

  const hasSeenOnboarding = useOnboardingStore(
    (state) => state.hasSeenOnboarding,
  );

  useEffect(() => {
    if (fontsLoaded && migrationSuccess) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, migrationSuccess]);

  if (migrationError) {
    console.error("Migration error:", migrationError);
  }

  if (!fontsLoaded || !migrationSuccess) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ThemeProvider value={NAV_THEME}>
        <RouteGuard />
        <Stack>
          <Stack.Protected guard={hasSeenOnboarding}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!hasSeenOnboarding}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Screen
            name="handle-share"
            options={{ headerShown: false, animation: "none" }}
          />
        </Stack>
      </ThemeProvider>
      <PortalHost />
    </GestureHandlerRootView>
  );
}
