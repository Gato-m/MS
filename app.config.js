const appJson = require("./app.json");

const expoConfig = appJson.expo;

module.exports = () => ({
  ...expoConfig,
  android: {
    ...expoConfig.android,
    config: {
      ...(expoConfig.android?.config ?? {}),
      googleMaps: {
        ...((expoConfig.android?.config ?? {}).googleMaps ?? {}),
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY || "",
      },
    },
  },
});
