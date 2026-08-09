// Written in CommonJS form (require/module.exports, no ESM `import`/`export`):
// Node then treats this file as a CommonJS module instead of an ES module.
// The VS Code Expo tools extension loads it with native `require()` racing an
// `import()`; requiring an ES module in that state throws
// "Cannot require() ES Module ... because it is not yet fully loaded". Keeping
// this file CJS sidesteps the ESM machinery entirely.
const fs = require("node:fs");
const path = require("node:path");
const { AndroidConfig, withAndroidManifest, withDangerousMod } =
  require("@expo/config-plugins") as typeof import("@expo/config-plugins");

// Keep in sync with the hardcoded `package` in the Kotlin files.
const PACKAGE_PATH = ["com", "karumelab", "yoink"];
const SERVICE_NAME = ".ShareReceiverService";
const ACTIVITY_NAME = ".ShareReceiverActivity";

const PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
  "android.permission.POST_NOTIFICATIONS",
];

const KOTLIN_SOURCES = ["ShareReceiverService.kt", "ShareReceiverActivity.kt"];

const withAndroidShareService: import("@expo/config-plugins").ConfigPlugin = (
  config,
) => {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Add foreground-service permissions at the manifest root.
    manifest.manifest["uses-permission"] = [
      ...(manifest.manifest["uses-permission"] ?? []),
      ...PERMISSIONS.filter(
        (permission) =>
          !(manifest.manifest["uses-permission"] ?? []).some(
            (entry) => entry.$["android:name"] === permission,
          ),
      ).map((name) => ({ $: { "android:name": name } })),
    ];

    // Transparent activity that owns the ACTION_SEND intent filter. Android's
    // share sheet resolves only to activities, so this is what gets picked —
    // it forwards the link to the service and finishes before any UI shows.
    application.activity = application.activity ?? [];
    if (
      !application.activity.some(
        (activity) => activity.$["android:name"] === ACTIVITY_NAME,
      )
    ) {
      application.activity.push({
        $: {
          "android:name": ACTIVITY_NAME,
          "android:exported": "true",
          "android:launchMode": "singleTop",
          "android:noHistory": "true",
          "android:excludeFromRecents": "true",
          "android:theme": "@android:style/Theme.NoDisplay",
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

    // Background download service (no intent-filter — started programmatically
    // by ShareReceiverActivity).
    application.service = application.service ?? [];
    if (
      !application.service.some(
        (service) => service.$["android:name"] === SERVICE_NAME,
      )
    ) {
      application.service.push({
        $: {
          "android:name": SERVICE_NAME,
          "android:exported": "false",
          "android:foregroundServiceType": "dataSync",
        },
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      for (const file of KOTLIN_SOURCES) {
        const source = path.join(__dirname, file);
        const destination = path.join(
          config.modRequest.platformProjectRoot,
          "app",
          "src",
          "main",
          "java",
          ...PACKAGE_PATH,
          file,
        );
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(source, destination);
      }
      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidShareService;
module.exports.default = withAndroidShareService;
