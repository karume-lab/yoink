// Written in CommonJS form (require/module.exports, no ESM `import`/`export`):
// Node then treats this file as a CommonJS module instead of an ES module.
// The VS Code Expo tools extension loads it with native `require()` racing an
// `import()`; requiring an ES module in that state throws
// "Cannot require() ES Module ... because it is not yet fully loaded". Keeping
// this file CJS sidesteps the ESM machinery entirely.
const fs = require("node:fs");
const path = require("node:path");
const {
  withMainApplication,
  withAndroidManifest,
  withAndroidStyles,
  withDangerousMod,
  AndroidConfig,
} = require("@expo/config-plugins") as typeof import("@expo/config-plugins");

// Keep in sync with the hardcoded `package` in the Kotlin files.
const PACKAGE_PATH = ["com", "karumelab", "yoink"];
const SERVICE_NAME = ".FloatingBubbleService";
const ACTIVITY_NAME = ".BubbleActivity";

// Fully transparent theme for BubbleActivity: nothing ever renders, and the
// window background is transparent so opening the activity doesn't flash black
// over the app the user is in.
const BUBBLE_THEME = "YoinkBubbleTheme";
const BUBBLE_THEME_PARENT = "@android:style/Theme.Translucent.NoTitleBar";
const BUBBLE_THEME_ITEMS: Record<string, string> = {
  "android:windowIsTranslucent": "true",
  "android:windowBackground": "@android:color/transparent",
  "android:windowNoTitle": "true",
  "android:backgroundDimEnabled": "false",
  "android:windowContentOverlay": "@null",
};

const PERMISSIONS = [
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_SPECIAL_USE",
  "android.permission.VIBRATE",
];

const KOTLIN_SOURCES = [
  "FloatingBubbleService.kt",
  "BubbleActivity.kt",
  "YoinkOverlayModule.kt",
  "YoinkOverlayPackage.kt",
];

const withFloatingBubble: import("@expo/config-plugins").ConfigPlugin = (
  config,
) => {
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application =
      AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Add overlay + foreground-service permissions at the manifest root.
    manifest.manifest["uses-permission"] = [
      ...(manifest.manifest["uses-permission"] ?? []),
      ...PERMISSIONS.filter(
        (permission) =>
          !(manifest.manifest["uses-permission"] ?? []).some(
            (entry) => entry.$["android:name"] === permission,
          ),
      ).map((name) => ({ $: { "android:name": name } })),
    ];

    // Transparent activity that reads the clipboard when the bubble is tapped.
    // It needs window focus to read the clipboard on Android 10+, which is why
    // it is an activity (translucent theme, transparent background) rather than
    // something done in the service itself.
    application.activity = application.activity ?? [];
    if (
      !application.activity.some(
        (activity) => activity.$["android:name"] === ACTIVITY_NAME,
      )
    ) {
      application.activity.push({
        $: {
          "android:name": ACTIVITY_NAME,
          "android:exported": "false",
          "android:launchMode": "singleTop",
          "android:noHistory": "true",
          "android:excludeFromRecents": "true",
          "android:theme": `@style/${BUBBLE_THEME}`,
        },
      });
    }

    // Overlay bubble service (no intent-filter - started programmatically via
    // the YoinkOverlay native module).
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
          "android:foregroundServiceType": "specialUse",
        },
      });
    }

    return config;
  });

  // Register the native module that lets JS start/stop the bubble and check
  // the overlay permission. Same package as MainApplication, so no import is
  // needed - just add the package to the generated package list.
  config = withMainApplication(config, (config) => {
    const contents = config.modResults.contents;
    const marker = "// add(MyReactNativePackage())";
    const replacement = "add(YoinkOverlayPackage())";
    if (contents.includes(marker)) {
      config.modResults.contents = contents.replace(marker, replacement);
    } else if (!contents.includes(replacement)) {
      const anchor = "PackageList(this).packages.apply {";
      if (contents.includes(anchor)) {
        config.modResults.contents = contents.replace(
          anchor,
          `${anchor}\n          ${replacement}`,
        );
      }
    }
    return config;
  });

  // Define the transparent theme BubbleActivity uses so opening it doesn't
  // flash black over the app the user is in.
  config = withAndroidStyles(config, (config) => {
    for (const [name, value] of Object.entries(BUBBLE_THEME_ITEMS)) {
      config.modResults = AndroidConfig.Styles.assignStylesValue(
        config.modResults,
        {
          add: true,
          value,
          name,
          parent: { name: BUBBLE_THEME, parent: BUBBLE_THEME_PARENT },
        },
      );
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

module.exports = withFloatingBubble;
module.exports.default = withFloatingBubble;
