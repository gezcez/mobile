// location.ts
// Foreground location only: a permission state, one coarse fix (Balanced, 10 s timeout) and the
// cheap last-known position on foreground. Used on the device; never sent anywhere except the
// rounded fallback nearby request.

import * as Location from "expo-location"
import { create } from "zustand"

export type LocationPermission = "unknown" | "granted" | "denied"

export interface Fix {
	lat: number
	lon: number
	accuracy: number | null
	at: number
}

interface LocationState {
	permission: LocationPermission
	canAskAgain: boolean
	fix: Fix | null
	locating: boolean
}

export const useLocationStore = create<LocationState>(() => ({
	permission: "unknown",
	canAskAgain: true,
	fix: null,
	locating: false,
}))

export async function refreshPermission(): Promise<LocationPermission> {
	try {
		const r = await Location.getForegroundPermissionsAsync()
		const permission: LocationPermission = r.status === "granted" ? "granted" : r.status === "denied" ? "denied" : "unknown"
		useLocationStore.setState({ permission, canAskAgain: r.canAskAgain })
		return permission
	} catch {
		return "unknown"
	}
}

export async function requestPermission(): Promise<LocationPermission> {
	try {
		const r = await Location.requestForegroundPermissionsAsync()
		const permission: LocationPermission = r.status === "granted" ? "granted" : "denied"
		useLocationStore.setState({ permission, canAskAgain: r.canAskAgain })
		return permission
	} catch {
		useLocationStore.setState({ permission: "denied" })
		return "denied"
	}
}

function toFix(p: Location.LocationObject): Fix {
	return { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy ?? null, at: p.timestamp ?? Date.now() }
}

/** One fix with a timeout; resolves null instead of throwing. */
export async function getFix(timeoutMs = 10_000): Promise<Fix | null> {
	if (useLocationStore.getState().permission !== "granted") return null
	useLocationStore.setState({ locating: true })
	try {
		const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))
		const pos = await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeout])
		const fix = pos ? toFix(pos) : null
		if (fix) useLocationStore.setState({ fix })
		return fix
	} catch {
		return null
	} finally {
		useLocationStore.setState({ locating: false })
	}
}

/** Cheap: the OS cached position, no new fix (used on foreground for the city switch banner). */
export async function getLastKnown(): Promise<Fix | null> {
	if (useLocationStore.getState().permission !== "granted") return null
	try {
		const pos = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })
		const fix = pos ? toFix(pos) : null
		if (fix && !useLocationStore.getState().fix) useLocationStore.setState({ fix })
		return fix
	} catch {
		return null
	}
}
