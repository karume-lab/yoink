import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DOWNLOAD_CHANNEL_ID = "downloads";
const NOTIFICATION_PREFIX = "yoink-download";

let configured = false;

function notificationId(jobId: string): string {
  return `${NOTIFICATION_PREFIX}-${jobId}`;
}

function triggerForPlatform() {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: DOWNLOAD_CHANNEL_ID,
    };
  }
  return null;
}

export async function configureNotifications(): Promise<boolean> {
  await setupInfrastructure();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Sets up the notification handler/channel and requests POST_NOTIFICATIONS
 * only when the user has never been asked (Android 13+), so download
 * completion notifications aren't suppressed by the OS.
 */
export async function requestNotificationsIfNeeded(): Promise<boolean> {
  await setupInfrastructure();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.status !== "undetermined") return false;

  return (await Notifications.requestPermissionsAsync()).granted;
}

async function setupInfrastructure(): Promise<void> {
  if (configured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(DOWNLOAD_CHANNEL_ID, {
      name: "Downloads",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }

  configured = true;
}

export async function showDownloadComplete(
  jobId: string,
  label: string,
): Promise<void> {
  try {
    await configureNotifications();
  } catch {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(jobId),
    content: {
      title: "Download complete",
      body: `${label} — saved to the Yoink album`,
    },
    trigger: triggerForPlatform(),
  }).catch(() => {});
}

export async function showDownloadFailed(
  jobId: string,
  message: string,
): Promise<void> {
  try {
    await configureNotifications();
  } catch {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: notificationId(jobId),
    content: {
      title: "Download failed",
      body: message,
    },
    trigger: triggerForPlatform(),
  }).catch(() => {});
}
