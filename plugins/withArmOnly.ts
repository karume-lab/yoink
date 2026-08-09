// Written in CommonJS form (require/module.exports, no ESM `import`/`export`):
// Node then treats this file as a CommonJS module instead of an ES module.
// The VS Code Expo tools extension loads config plugins with native `require()`
// racing an `import()`; requiring an ES module in that state throws
// "Cannot require() ES Module ... because it is not yet fully loaded". Keeping
// this file CJS sidesteps the ESM machinery entirely.
const { withGradleProperties } =
  require("@expo/config-plugins") as typeof import("@expo/config-plugins");

/**
 * Sets reactNativeArchitectures to arm64-v8a only in gradle.properties.
 * This survives `expo prebuild --clean` since it's applied via config plugin.
 *
 * Savings: ~40–60 MB (drops x86, x86_64, armeabi-v7a native lib copies).
 * Trade-off: app won't run on very old 32-bit Android devices (pre-2014)
 *             or on x86 emulators without ARM translation.
 */
const withArmOnly: import("@expo/config-plugins").ConfigPlugin = (config) => {
  return withGradleProperties(config, (mod) => {
    const props = mod.modResults;

    // Remove any existing reactNativeArchitectures entry
    const filtered = props.filter(
      (item) =>
        !(item.type === "property" && item.key === "reactNativeArchitectures"),
    );

    // Set arm64-v8a only
    filtered.push({
      type: "property",
      key: "reactNativeArchitectures",
      value: "arm64-v8a",
    });

    mod.modResults = filtered;
    return mod;
  });
};

module.exports = withArmOnly;
module.exports.default = withArmOnly;
