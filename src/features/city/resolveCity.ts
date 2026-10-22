// resolveCity.ts
// On-device city detection (plan 3.2): point in bbox, nearest centre as the tiebreak, and never a
// city whose centre is more than 50 km away. The location never leaves the phone for this.

import type { City } from "@/api/types"

export const MAX_CITY_DISTANCE_M = 50_000

export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
	const R = 6371000
	const toRad = (d: number) => (d * Math.PI) / 180
	const dLat = toRad(bLat - aLat)
	const dLon = toRad(bLon - aLon)
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function inBbox(lat: number, lon: number, [w, s, e, n]: City["bbox"]): boolean {
	return lon >= w && lon <= e && lat >= s && lat <= n
}

export function resolveCity(cities: readonly City[], lat: number, lon: number): City | null {
	let best: { city: City; d: number } | null = null
	for (const city of cities) {
		if (!inBbox(lat, lon, city.bbox)) continue
		const d = distanceM(lat, lon, city.centre[1], city.centre[0])
		if (d > MAX_CITY_DISTANCE_M) continue
		if (!best || d < best.d) best = { city, d }
	}
	return best?.city ?? null
}

/** Picker order: by distance when a fix exists, else alphabetically in the UI language. */
export function sortCities(cities: readonly City[], locale: "tr" | "en", fix?: { lat: number; lon: number } | null): City[] {
	const list = [...cities]
	if (fix) return list.sort((a, b) => distanceM(fix.lat, fix.lon, a.centre[1], a.centre[0]) - distanceM(fix.lat, fix.lon, b.centre[1], b.centre[0]))
	return list.sort((a, b) => a.name[locale].localeCompare(b.name[locale], locale))
}
