import fs from "node:fs";
import path from "node:path";
import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
} from "@expo/config-plugins";

// Keep in sync with the hardcoded `package` in ShareReceiverService.kt.
const PACKAGE_PATH = ["com", "karumelab", "yoink"];
const SERVICE_NAME = ".ShareReceiverService";
const SHARING_GENERATED_TAG = "expo-sharing-intent-filters";

const PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
  "android.permission.POST_NOTIFICATIONS",
] as const;

const withAndroidShareService: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Route ACTION_SEND shares to the background service instead of launching
    // the app. Drop the intent filters expo-sharing generates on MainActivity.
    const mainActivity = application.activity?.find(
      (activity) => activity.$["android:name"] === ".MainActivity",
    );
    if (mainActivity?.["intent-filter"]?.length) {
      mainActivity["intent-filter"] = mainActivity["intent-filter"].filter(
        (filter) =>
          (filter.$ as Record<string, string> | undefined)?.[
            SHARING_GENERATED_TAG
          ] !== "true",
      );
    }

    manifest.manifest["uses-permission"] = [
      ...(manifest.manifest["uses-permission"] ?? []),
      ...PERMISSIONS.filter(
        (permission) =>
          !(manifest.manifest["uses-permission"] ?? []).some(
            (entry) => entry.$["android:name"] === permission,
          ),
      ).map((name) => ({ $: { "android:name": name } })),
    ];

    application.service = application.service ?? [];
    if (
      !application.service.some(
        (service) => service.$["android:name"] === SERVICE_NAME,
      )
    ) {
      application.service.push({
        $: {
          "android:name": SERVICE_NAME,
          "android:exported": "true",
          "android:foregroundServiceType": "dataSync",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.SEND" } }],
            data: [{ $: { "android:mimeType": "text/*" } }],
            category: [
              { $: { "android:name": "android.intent.category.DEFAULT" } },
            ],
          },
        ],
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const source = path.join(__dirname, "ShareReceiverService.kt");
      const destination = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE_PATH,
        "ShareReceiverService.kt",
      );
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      return config;
    },
  ]);

  return config;
};

export default withAndroidShareService;
