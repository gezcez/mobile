// expoGo.ts
// Expo Go mode. Expo Go ships no MapLibre, no MMKV (Nitro) and cannot open our custom URL schemes,
// so the app degrades there: in-memory storage backed by AsyncStorage, a map placeholder, and an
// exp:// redirect URI for the mobile-dev OAuth client. Dev and store builds are unaffected.

import Constants, { ExecutionEnvironment } from "expo-constants"

/** True inside the Expo Go app ("storeClient"); false in dev client, standalone and bare builds. */
export function isExpoGo(constants: { executionEnvironment?: string } = Constants): boolean {
	return constants.executionEnvironment === ExecutionEnvironment.StoreClient
}

export const IS_EXPO_GO: boolean = isExpoGo()
