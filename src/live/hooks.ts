// hooks.ts
// React side of the live feed. Subscriptions follow screen focus (a route map in the back stack does
// not keep streaming) and equal requests share one feed.

import { useQueryClient } from "@tanstack/react-query"
import { useIsFocused } from "expo-router"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { departuresQuery } from "@/api/queries/transit"
import { toDepartures, type Departures } from "@/api/types"
import type { W } from "@/api/wire"
import { liveSocket } from "./index"
import { subscriptionKey, type VehiclesParams } from "./protocol"
import type { LiveStatus } from "./socket"
import { VehicleFeed, type FeedSnapshot } from "./vehicleFeed"

const feeds = new Map<string, VehicleFeed>()

function feedFor(params: VehiclesParams): VehicleFeed {
	const key = subscriptionKey({ channel: "vehicles", params })
	let f = feeds.get(key)
	if (!f) {
		f = new VehicleFeed(params, liveSocket())
		feeds.set(key, f)
	}
	return f
}

const IDLE: FeedSnapshot = { vehicles: [], feedTs: null, receivedAt: null, source: null, network: "ok", message: null, error: null }
const noop = () => () => undefined

/** Live vehicles for a network, optionally narrowed to routes, a direction or a bbox. null = off. */
export function useVehicles(params: VehiclesParams | null): FeedSnapshot {
	const focused = useIsFocused()
	const key = params ? subscriptionKey({ channel: "vehicles", params }) : null
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const feed = useMemo(() => (params && focused ? feedFor(params) : null), [key, focused])
	return useSyncExternalStore(
		feed ? (cb) => feed.subscribe(cb) : noop,
		() => feed?.snapshot ?? IDLE,
		() => IDLE,
	)
}

export function useLiveStatus(): LiveStatus {
	const socket = liveSocket()
	return useSyncExternalStore(
		(cb) => socket.onStatus(cb),
		() => socket.status,
		() => socket.status,
	)
}

/**
 * Live departures for a stop over the WS `departures` channel, written into the same query cache
 * entry the REST call fills, so screens render one source. Returns whether the socket is feeding
 * it (the screen then stops polling; otherwise it polls every 20 s).
 */
export function useLiveDepartures(networkId: string, stopId: string, limit: number, enabled = true): boolean {
	const qc = useQueryClient()
	const focused = useIsFocused()
	const [live, setLive] = useState(false)
	const status = useLiveStatus()
	useEffect(() => {
		if (!enabled || !focused) return
		const key = departuresQuery(networkId, stopId, limit).queryKey
		const off = liveSocket().subscribe({ channel: "departures", params: { stop: stopId, limit: Math.min(limit, 30) } }, (m) => {
			if (m.type !== "departures") return
			const prev = qc.getQueryData<Departures>(key)
			const stop: W["StopSummary"] = prev
				? { id: prev.stop.id, network_id: 0, name: prev.stop.name, code: prev.stop.code, lat: prev.stop.lat, lon: prev.stop.lon }
				: { id: m.stop, network_id: 0, name: "", code: null, lat: 0, lon: 0 }
			qc.setQueryData(key, toDepartures({ stop, generated_at: m.generated_at, items: m.items }, networkId))
			setLive(true)
		})
		return () => {
			off()
			setLive(false)
		}
	}, [enabled, focused, networkId, stopId, limit, qc])
	return live && status.state === "open"
}
