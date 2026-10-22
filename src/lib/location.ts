// location.ts
// Foreground location only: a permission state, one coarse fix (Balanced, 10 s timeout) and the
// cheap last-known position on foreground. Used on the device; never sent anywhere except the
// rounded fallback nearby request.

import * as Location from "expo-location"
import { create } from "zustand"

export type LocationPermission = "unknown" | "granted" | "denied"

/**
 * What the rider actually gave us (plan 7.3): precise, approximate only (iOS reduced accuracy or
 * Android coarse), denied (can ask again), blocked (the OS will not show the prompt again, only
 * Settings can change it), or device location services switched off.
 */
export type LocationAccess = "unknown" | "granted" | "approximate" | "denied" | "blocked" | "servicesOff"

type PermissionLike = {
	status: string
	canAskAgain: boolean
	ios?: { accuracy?: "full" | "reduced" }
	android?: { accuracy?: "fine" | "coarse" | "none" }
}

export function classifyAccess(r: PermissionLike, servicesOn: boolean): LocationAccess {
	if (r.status === "granted") {
		if (!servicesOn) return "servicesOff"
		return r.ios?.accuracy === "reduced" || r.android?.accuracy === "coarse" ? "approximate" : "granted"
	}
	if (r.status === "denied") return r.canAskAgain ? "denied" : "blocked"
	return r.canAskAgain ? "unknown" : "blocked"
}

export const hasLocation = (a: LocationAccess) => a === "granted" || a === "approximate"

async function servicesEnabled(): Promise<boolean> {
	try {
		return await Location.hasServicesEnabledAsync()
	} catch {
		return true
	}
}

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
	access: LocationAccess
}

export const useLocationStore = create<LocationState>(() => ({
	permission: "unknown",
	canAskAgain: true,
	fix: null,
	locating: false,
	access: "unknown",
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

/** The prompt plus the accuracy and services details, for onboarding. Never sends anything. */
export async function requestAccess(): Promise<LocationAccess> {
	try {
		const r = await Location.requestForegroundPermissionsAsync()
		const access = classifyAccess(r, r.status === "granted" ? await servicesEnabled() : true)
		useLocationStore.setState({ permission: r.status === "granted" ? "granted" : "denied", canAskAgain: r.canAskAgain, access })
		return access
	} catch {
		useLocationStore.setState({ permission: "denied", access: "denied" })
		return "denied"
	}
}

/** Re-reads the access without prompting (after the rider comes back from Settings). */
export async function refreshAccess(): Promise<LocationAccess> {
	try {
		const r = await Location.getForegroundPermissionsAsync()
		const access = classifyAccess(r, r.status === "granted" ? await servicesEnabled() : true)
		const permission: LocationPermission = r.status === "granted" ? "granted" : r.status === "denied" ? "denied" : "unknown"
		useLocationStore.setState({ permission, canAskAgain: r.canAskAgain, access })
		return access
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
