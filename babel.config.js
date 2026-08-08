module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "~": "./",
          },
        },
      ],
      require.resolve("react-native-reanimated/plugin"),
    ],
  };
};
