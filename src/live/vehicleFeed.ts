// vehicleFeed.ts
// Live vehicles for one subscription (a route, a bbox or a whole network). Shared by every screen
// that asks for the same thing. First paint from the REST snapshot, then the WS snapshot and deltas;
// after 3 failed connections it polls REST every 15 s while the socket keeps retrying.

import { api, unwrap } from "@/api/client"
import { decodeRows, type LiveVehicle, type ServerMessage, type VehiclesParams } from "./protocol"
import type { LiveSocket, LiveStatus } from "./socket"

export const REST_POLL_MS = 15_000

export type FeedSource = "ws" | "rest" | null
export type NetworkLiveState = "ok" | "degraded" | "paused"

export interface FeedSnapshot {
	vehicles: LiveVehicle[]
	/** unix seconds of the provider poll behind the data */
	feedTs: number | null
	receivedAt: number | null
	source: FeedSource
	network: NetworkLiveState
	message: string | null
	error: unknown
}

const EMPTY: FeedSnapshot = { vehicles: [], feedTs: null, receivedAt: null, source: null, network: "ok", message: null, error: null }

export async function fetchVehicles(p: VehiclesParams) {
	return unwrap(
		api.GET("/v1/networks/{networkId}/vehicles", {
			params: {
				path: { networkId: p.network },
				query: {
					...(p.routes?.length ? { routes: p.routes.join(",") } : {}),
					...(p.direction !== undefined ? { direction: p.direction } : {}),
					...(p.bbox ? { bbox: p.bbox.join(",") } : {}),
				},
			},
		}),
	)
}

export class VehicleFeed {
	private map = new Map<string, LiveVehicle>()
	private snap: FeedSnapshot = EMPTY
	private listeners = new Set<() => void>()
	private offSocket: (() => void) | null = null
	private offStatus: (() => void) | null = null
	private poll: ReturnType<typeof setInterval> | null = null
	private wsSeen = false
	private fields: string[] = []

	constructor(
		readonly params: VehiclesParams,
		private readonly socket: LiveSocket,
		private readonly fetcher: typeof fetchVehicles = fetchVehicles,
		private readonly now: () => number = Date.now,
	) {}

	get snapshot(): FeedSnapshot {
		return this.snap
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener)
		if (this.listeners.size === 1) this.start()
		return () => {
			this.listeners.delete(listener)
			if (this.listeners.size === 0) this.stop()
		}
	}

	private publish(patch: Partial<FeedSnapshot>) {
		this.snap = { ...this.snap, ...patch, vehicles: [...this.map.values()] }
		for (const l of this.listeners) l()
	}

	private start() {
		void this.rest()
		this.offSocket = this.socket.subscribe({ channel: "vehicles", params: this.params }, (m) => this.onMessage(m))
		this.offStatus = this.socket.onStatus((s) => this.onStatus(s))
		this.onStatus(this.socket.status)
	}

	private stop() {
		this.offSocket?.()
		this.offStatus?.()
		this.offSocket = this.offStatus = null
		if (this.poll) clearInterval(this.poll)
		this.poll = null
		this.wsSeen = false
	}

	private onStatus(s: LiveStatus) {
		if (s.fallback && !this.poll) {
			this.poll = setInterval(() => void this.rest(), REST_POLL_MS)
			void this.rest()
		} else if (!s.fallback && this.poll) {
			clearInterval(this.poll)
			this.poll = null
		}
	}

	private onMessage(m: ServerMessage) {
		if (m.type === "snapshot") {
			this.wsSeen = true
			this.fields = m.fields
			this.map = new Map(decodeRows(m.fields, m.vehicles).map((v) => [v.id, v]))
			this.publish({ feedTs: m.feed_ts, receivedAt: this.now(), source: "ws", error: null })
		} else if (m.type === "delta") {
			for (const v of decodeRows(this.fields, m.upsert)) this.map.set(v.id, v)
			for (const id of m.remove) this.map.delete(id)
			this.publish({ feedTs: m.feed_ts, receivedAt: this.now(), source: "ws" })
		} else if (m.type === "status") {
			const network: NetworkLiveState = m.state === "ok" ? "ok" : m.state === "degraded" ? "degraded" : "paused"
			this.publish({ network, message: m.message ?? null })
		} else if (m.type === "error") {
			this.publish({ error: m })
		}
	}

	private async rest() {
		try {
			const r = await this.fetcher(this.params)
			// A WS snapshot is fresher than a REST answer that raced it, unless we are polling.
			if (this.wsSeen && !this.poll) return
			this.map = new Map(decodeRows(r.fields, r.vehicles).map((v) => [v.id, v]))
			const message = Array.isArray(r.message) ? (r.message[0] ?? null) : (r.message as string | null)
			this.publish({
				feedTs: r.feed_ts,
				receivedAt: this.now(),
				source: "rest",
				network: r.status === "disabled" ? "paused" : r.status === "degraded" ? "degraded" : "ok",
				message,
				error: null,
			})
		} catch (e) {
			if (!this.wsSeen) this.publish({ error: e })
		}
	}
}
