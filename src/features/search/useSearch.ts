// useSearch.ts
// Search over the enabled networks' packs (offline). Without a pack (first launch, slow network)
// it falls back to GET /v1/search for the current city.

import { useQuery } from "@tanstack/react-query"
import { useDeferredValue, useMemo } from "react"
import { searchQuery } from "@/api/queries/transit"
import type { Mode, Network } from "@/api/types"
import { searchRoutes, searchStops } from "@/pack/packIndex"
import { usePackIndexes } from "@/pack/packStore"

export interface RouteHit {
	id: string
	networkId: string
	shortName: string
	longName: string
	mode: Mode
	color: string | null
	textColor: string | null
}

export interface StopHit {
	id: string
	networkId: string
	name: string
	code: string | null
	lat: number
	lon: number
}

export function useSearch(
	query: string,
	networks: readonly Network[],
	opts: { cityId: string | null; modes: Mode[]; near: { lat: number; lon: number } | null },
) {
	const q = useDeferredValue(query.trim())
	const { indexes, loading, failed } = usePackIndexes(networks)
	const offline = indexes.length > 0
	const server = useQuery({ ...searchQuery(q, { city: opts.cityId ?? undefined }), enabled: !offline && !loading && q.length > 0 })

	const routes = useMemo<RouteHit[]>(() => {
		if (offline) return searchRoutes(indexes, q, { modes: opts.modes, limit: q ? 100 : 0 })
		return (server.data?.routes ?? []).filter((r) => !opts.modes.length || opts.modes.includes(r.mode))
	}, [offline, indexes, q, opts.modes, server.data])

	const stops = useMemo<StopHit[]>(() => {
		if (offline) return searchStops(indexes, q, { near: opts.near })
		return server.data?.stops ?? []
	}, [offline, indexes, q, opts.near, server.data])

	const modes = useMemo(() => [...new Set(indexes.flatMap((i) => i.routes.map((r) => r.mode)))], [indexes])

	return {
		q,
		routes,
		stops,
		modes,
		loading: loading || (server.isFetching && !offline),
		usingServer: !offline && !loading,
		failed: failed && !!server.error,
		error: server.error,
	}
}
