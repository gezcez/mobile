// useNearby.ts
// Nearby stops for Home (plan 5.2): from the packs on the device (600 m, then 1.5 km). Without a
// pack, the rounded-coordinate server fallback per network. Location never leaves the phone
// otherwise.

import { useQueries } from "@tanstack/react-query"
import { useMemo } from "react"
import { nearbyFallbackQuery } from "@/api/queries/transit"
import type { Mode, Network, StopSummary } from "@/api/types"
import { distanceM } from "@/features/city/resolveCity"
import type { Fix } from "@/lib/location"
import { nearbyWithFallback } from "@/pack/packIndex"
import { usePackIndexes } from "@/pack/packStore"

export interface NearbyRoute {
	id: string
	shortName: string
	color: string | null
	textColor: string | null
	mode: Mode
}

export interface NearbyItem {
	stop: { id: string; networkId: string; name: string; code: string | null; lat: number; lon: number }
	distanceM: number
	routes: NearbyRoute[]
}

type FallbackResult = { data?: StopSummary[]; isLoading: boolean; isError: boolean }

/** Module-level so useQueries memoises the combined result between renders. */
function combineFallback(results: FallbackResult[]) {
	return {
		stops: results.flatMap((r) => r.data ?? []),
		loading: results.some((r) => r.isLoading),
		allFailed: results.length > 0 && results.every((r) => r.isError),
	}
}

export type NearbyState = "no-fix" | "loading" | "ready" | "empty" | "error"

export function useNearby(networks: readonly Network[], fix: Fix | null, limit = 8): { state: NearbyState; items: NearbyItem[]; widened: boolean } {
	const { indexes, loading, failed } = usePackIndexes(networks)
	const fallbackOn = !!fix && failed
	const fallback = useQueries({
		queries: networks
			.filter((n) => n.capabilities.stops)
			.map((n) => ({ ...nearbyFallbackQuery(fix?.lat ?? 0, fix?.lon ?? 0, n.id), enabled: fallbackOn })),
		combine: combineFallback,
	})

	const result = useMemo(() => {
		if (!fix) return { items: [] as NearbyItem[], widened: false }
		if (indexes.length) {
			const { items, widened } = nearbyWithFallback(indexes, fix.lat, fix.lon, limit)
			return {
				widened,
				items: items.map(({ stop, distanceM: d }) => {
					const idx = indexes.find((i) => i.networkId === stop.networkId)
					const routes = stop.routeIds
						.map((id) => idx?.routeById.get(id))
						.filter((r) => !!r)
						.map((r) => ({ id: r.id, shortName: r.shortName, color: r.color, textColor: r.textColor, mode: r.mode }))
					return { stop: { ...stop }, distanceM: d, routes }
				}),
			}
		}
		const items = fallback.stops
			.map((s) => ({ stop: s, distanceM: s.distanceM ?? distanceM(fix.lat, fix.lon, s.lat, s.lon), routes: [] }))
			.sort((a, b) => a.distanceM - b.distanceM)
			.slice(0, limit)
		return { items, widened: false }
	}, [fix, indexes, limit, fallback.stops])

	let state: NearbyState
	if (!fix) state = "no-fix"
	else if (result.items.length) state = "ready"
	else if (loading || fallback.loading) state = "loading"
	else if (fallbackOn && fallback.allFailed) state = "error"
	else state = "empty"
	return { state, ...result }
}
