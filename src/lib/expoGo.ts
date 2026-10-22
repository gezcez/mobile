// expoGo.ts
// True inside the Expo Go store client, which ships none of our extra native modules (MapLibre,
// MMKV/Nitro). Those are loaded lazily and swapped for stand-ins there so the rest of the app can
// be tried in Expo Go; the dev client and store builds are unaffected.

import Constants, { ExecutionEnvironment } from "expo-constants"

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient
