// packIndex.ts
// In-memory index over one or more network packs: kdbush + geokdbush for nearest stops, and a folded
// search index for routes (short-name prefix first, then name contains) and stops (name contains,
// exact code). Pure: no IO, so it is unit tested directly.

import { around, distance } from "geokdbush"
import KDBush from "kdbush"
import type { Mode, Pack, PackRoute, PackStop } from "@/api/types"
import { fold } from "./normalise"

export interface IndexedStop extends PackStop {
	networkId: string
	folded: string
}

export interface IndexedRoute extends PackRoute {
	networkId: string
	foldedShort: string
	foldedLong: string
}

export interface PackIndex {
	networkId: string
	version: string
	stops: IndexedStop[]
	routes: IndexedRoute[]
	stopById: Map<string, IndexedStop>
	routeById: Map<string, IndexedRoute>
	geo: KDBush
}

export function buildIndex(pack: Pack): PackIndex {
	const stops = pack.stops.map((s) => ({ ...s, networkId: pack.networkId, folded: fold(s.name) }))
	const routes = pack.routes.map((r) => ({
		...r,
		networkId: pack.networkId,
		foldedShort: fold(r.shortName),
		foldedLong: fold(r.longName),
	}))
	const geo = new KDBush(Math.max(1, stops.length))
	for (const s of stops) geo.add(s.lon, s.lat)
	if (stops.length === 0) geo.add(0, 0)
	geo.finish()
	return {
		networkId: pack.networkId,
		version: pack.version,
		stops,
		routes,
		stopById: new Map(stops.map((s) => [s.id, s])),
		routeById: new Map(routes.map((r) => [r.id, r])),
		geo,
	}
}

export interface NearbyStop {
	stop: IndexedStop
	distanceM: number
}

/** Nearest stops across indexes within radius, closest first. */
export function nearbyStops(indexes: readonly PackIndex[], lat: number, lon: number, radiusM: number, limit: number): NearbyStop[] {
	const out: NearbyStop[] = []
	for (const idx of indexes) {
		if (idx.stops.length === 0) continue
		for (const i of around(idx.geo, lon, lat, limit, radiusM / 1000)) {
			const stop = idx.stops[i]
			if (stop) out.push({ stop, distanceM: distance(lon, lat, stop.lon, stop.lat) * 1000 })
		}
	}
	return out.sort((a, b) => a.distanceM - b.distanceM).slice(0, limit)
}

/** Nearby with the plan's widening rule (5.2): 600 m, then 1.5 km. */
export function nearbyWithFallback(indexes: readonly PackIndex[], lat: number, lon: number, limit = 8): { items: NearbyStop[]; widened: boolean } {
	const near = nearbyStops(indexes, lat, lon, 600, limit)
	if (near.length > 0) return { items: near, widened: false }
	return { items: nearbyStops(indexes, lat, lon, 1500, limit), widened: true }
}

function rankRoute(r: IndexedRoute, q: string): number {
	if (r.foldedShort === q) return 0
	if (r.foldedShort.startsWith(q)) return 1
	if (r.foldedLong.includes(q)) return 2
	return -1
}

export function searchRoutes(indexes: readonly PackIndex[], query: string, opts: { modes?: Mode[]; limit?: number } = {}): IndexedRoute[] {
	const q = fold(query)
	const all = indexes.flatMap((i) => i.routes).filter((r) => !opts.modes?.length || opts.modes.includes(r.mode))
	if (!q) return all.sort(compareRoutes).slice(0, opts.limit ?? 500)
	return all
		.map((r) => ({ r, rank: rankRoute(r, q) }))
		.filter((x) => x.rank >= 0)
		.sort((a, b) => a.rank - b.rank || compareRoutes(a.r, b.r))
		.slice(0, opts.limit ?? 100)
		.map((x) => x.r)
}

/** Natural order for route short names: 9 < 15 < 41C < 120 < 200 < D1 < Ü1. */
export function compareRoutes(a: { shortName: string }, b: { shortName: string }): number {
	return a.shortName.localeCompare(b.shortName, "tr", { numeric: true, sensitivity: "base" })
}

export function searchStops(
	indexes: readonly PackIndex[],
	query: string,
	opts: { near?: { lat: number; lon: number } | null; limit?: number } = {},
): IndexedStop[] {
	const raw = query.trim()
	const q = fold(raw)
	if (!q) return []
	const hits = indexes.flatMap((i) => i.stops).filter((s) => s.code === raw || s.folded.includes(q))
	const near = opts.near
	if (near) hits.sort((a, b) => distance(near.lon, near.lat, a.lon, a.lat) - distance(near.lon, near.lat, b.lon, b.lat))
	else hits.sort((a, b) => (a.code === raw ? -1 : b.code === raw ? 1 : a.name.localeCompare(b.name, "tr")))
	return hits.slice(0, opts.limit ?? 50)
}
