// geometry.ts
// Route geometry helpers: decode shapes, fall back to straight segments between stops, find the
// stop nearest the rider, and place live vehicles between stops by stop_seq (GTFS-RT meaning: the
// stop the vehicle is heading to, or standing at when its status says so).

import polyline from "@mapbox/polyline"
import type { RouteStop, Shape } from "@/api/types"
import { distanceM } from "@/features/city/resolveCity"
import type { LiveVehicle } from "@/live/protocol"

export type LonLat = [number, number]

export function decodeShape(shape: Shape | null | undefined): LonLat[][] {
	if (!shape) return []
	return shape.polylines
		.map((p) => polyline.decode(p.polyline, shape.precision).map(([lat, lon]) => [lon, lat] as LonLat))
		.filter((l) => l.length >= 2)
}

/** "Approximate path" when the provider has no shape: straight lines through the stops. */
export function straightLine(stops: readonly RouteStop[]): LonLat[][] {
	return stops.length >= 2 ? [stops.map((s) => [s.lon, s.lat] as LonLat)] : []
}

export function nearestStopIndex(stops: readonly RouteStop[], at: { lat: number; lon: number } | null, maxM = 2000): number | null {
	if (!at || stops.length === 0) return null
	let best = -1
	let bestD = Infinity
	stops.forEach((s, i) => {
		const d = distanceM(at.lat, at.lon, s.lat, s.lon)
		if (d < bestD) {
			bestD = d
			best = i
		}
	})
	return best >= 0 && bestD <= maxM ? best : null
}

export function boundsOf(lines: readonly LonLat[][], stops: readonly RouteStop[]): [number, number, number, number] | null {
	const pts: LonLat[] = [...lines.flat(), ...stops.map((s) => [s.lon, s.lat] as LonLat)]
	if (pts.length === 0) return null
	let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity]
	for (const [lon, lat] of pts) {
		w = Math.min(w, lon)
		e = Math.max(e, lon)
		s = Math.min(s, lat)
		n = Math.max(n, lat)
	}
	return [w, s, e, n]
}

export interface PlacedVehicle {
	vehicle: LiveVehicle
	/** Index in `stops` the vehicle is at, or the index of the stop it is heading to. */
	index: number
	atStop: boolean
}

/** Vehicles in timeline order. Vehicles whose stop_seq is not on this pattern are left out. */
export function placeVehicles(stops: readonly RouteStop[], vehicles: readonly LiveVehicle[]): PlacedVehicle[] {
	const bySeq = new Map(stops.map((s, i) => [s.seq, i]))
	const out: PlacedVehicle[] = []
	for (const v of vehicles) {
		if (v.stopSeq === null) continue
		const index = bySeq.get(v.stopSeq)
		if (index === undefined) continue
		out.push({ vehicle: v, index, atStop: v.status === "stopped_at" || v.status === 1 || v.atTerminus })
	}
	return out.sort((a, b) => a.index - b.index)
}
