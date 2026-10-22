// updates.ts
// expo-updates helpers (plan 7.4). Launches never wait for the network (ON_LOAD, fallback 0); a
// downloaded update applies on the next cold start. An update published with
// EAS_UPDATE_CRITICAL=1 (app.config extra.critical) asks the rider to restart now instead.

import * as Updates from "expo-updates"
import { Linking, Platform } from "react-native"
import { env } from "./env"
import { compareVersions } from "./version"

type ManifestLike = { extra?: { critical?: unknown; expoClient?: { extra?: { critical?: unknown } } } } | undefined | null

/** True when a downloaded update was marked critical at publish time. */
export function isCriticalManifest(manifest: unknown): boolean {
	const m = manifest as ManifestLike
	return m?.extra?.critical === true || m?.extra?.expoClient?.extra?.critical === true
}

export async function restartIntoUpdate(): Promise<void> {
	try {
		await Updates.reloadAsync()
	} catch {
		// Dev client or updates disabled: nothing to restart into.
	}
}

/** Soft update: the store has a newer version than this binary. */
export function hasSoftUpdate(current: string, softUpdateVersion: string | null | undefined): boolean {
	return !!softUpdateVersion && compareVersions(current, softUpdateVersion) < 0
}

/** Store page for this variant (production ids; preview and dev builds point there too). */
export function storeUrl(os: string = Platform.OS): string {
	if (os === "ios") return env.iosAppStoreId ? `https://apps.apple.com/app/id${env.iosAppStoreId}` : "https://gezcez.com/app"
	return `https://play.google.com/store/apps/details?id=${env.androidPackage}`
}

export async function openStore(): Promise<void> {
	const url = storeUrl()
	if (Platform.OS === "android") {
		try {
			await Linking.openURL(`market://details?id=${env.androidPackage}`)
			return
		} catch {
			// No Play Store app: fall through to the web page.
		}
	}
	await Linking.openURL(url)
}
