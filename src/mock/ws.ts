// ws.ts
// An in-process WebSocket for mock mode (ws_url "mock://ws"): speaks protocol v1 (backend 6.10)
// over the mock world. Snapshots on subscribe, deltas every 10 s, departures every 20 s, pings
// every 20 s. Lets the live map and live departures run with no backend.

import type { SocketLike } from "@/live/socket"
import { compactRow, filterVehicles, networkBySlug, vehiclesFor, wireDepartures, COMPACT_FIELDS } from "./data"

type Sub = { channel: string; params: Record<string, unknown>; seq: number; timer: ReturnType<typeof setInterval>; last: Map<string, string> }

export const MOCK_DELTA_MS = 10_000
export const MOCK_DEPARTURES_MS = 20_000

export class MockWebSocket implements SocketLike {
	readyState = 0
	onopen: SocketLike["onopen"] = null
	onmessage: SocketLike["onmessage"] = null
	onclose: SocketLike["onclose"] = null
	onerror: SocketLike["onerror"] = null
	private subs = new Map<string, Sub>()
	private ping: ReturnType<typeof setInterval> | null = null
	private openTimer: ReturnType<typeof setTimeout>

	constructor(
		readonly url: string,
		private readonly now: () => number = Date.now,
	) {
		this.openTimer = setTimeout(() => {
			this.readyState = 1
			this.onopen?.({})
			this.emit({ type: "hello", v: 1, heartbeat_s: 20, limits: { max_subs: 8, max_routes_per_sub: 12, max_bbox_span_deg: 0.5 } })
			this.ping = setInterval(() => this.emit({ type: "ping", t: this.now() }), 20_000)
		}, 30)
	}

	send(data: string) {
		const m = JSON.parse(data) as { type: string; id?: string; channel?: string; params?: Record<string, unknown> }
		if (m.type === "auth") this.emit({ type: "auth_ok", exp: Math.floor(this.now() / 1000) + 900 })
		else if (m.type === "subscribe" && m.id && m.channel && m.params) this.subscribe(m.id, m.channel, m.params)
		else if (m.type === "unsubscribe" && m.id) this.unsubscribe(m.id)
	}

	close(code = 1000) {
		clearTimeout(this.openTimer)
		if (this.ping) clearInterval(this.ping)
		for (const id of [...this.subs.keys()]) this.unsubscribe(id)
		if (this.readyState === 3) return
		this.readyState = 3
		setTimeout(() => this.onclose?.({ code }), 0)
	}

	private emit(m: unknown) {
		if (this.readyState !== 1) return
		const data = JSON.stringify(m)
		setTimeout(() => this.onmessage?.({ data }), 0)
	}

	private vehicles(params: Record<string, unknown>) {
		const net = networkBySlug(String(params.network))
		if (!net) return null
		const list = filterVehicles(vehiclesFor(net.slug, this.now()), {
			routes: params.routes as string[] | undefined,
			direction: params.direction as 0 | 1 | undefined,
			bbox: params.bbox as number[] | undefined,
		})
		return new Map(list.map((v) => [v.id, compactRow(v)]))
	}

	private subscribe(id: string, channel: string, params: Record<string, unknown>) {
		this.unsubscribe(id)
		const feedTs = () => Math.floor(this.now() / 1000) - 15
		if (channel === "vehicles") {
			const first = this.vehicles(params)
			if (!first) {
				this.emit({ type: "error", id, code: "NOT_FOUND", message: "unknown network" })
				return
			}
			const sub: Sub = { channel, params, seq: 1, last: new Map([...first].map(([k, v]) => [k, JSON.stringify(v)])), timer: setInterval(() => tick(), MOCK_DELTA_MS) }
			const tick = () => {
				const now = this.vehicles(params) ?? new Map()
				const upsert = [...now].filter(([k, v]) => sub.last.get(k) !== JSON.stringify(v)).map(([, v]) => v)
				const remove = [...sub.last.keys()].filter((k) => !now.has(k))
				sub.last = new Map([...now].map(([k, v]) => [k, JSON.stringify(v)]))
				if (upsert.length || remove.length) this.emit({ type: "delta", sub: id, seq: ++sub.seq, feed_ts: feedTs(), upsert, remove })
			}
			this.subs.set(id, sub)
			this.emit({ type: "snapshot", sub: id, seq: 1, feed_ts: feedTs(), fields: COMPACT_FIELDS, vehicles: [...first.values()] })
			return
		}
		if (channel === "departures") {
			const stop = String(params.stop)
			const limit = Math.min(30, Number(params.limit ?? 10))
			const send = (seq: number) => {
				const d = wireDepartures(stop, this.now(), limit)
				if (d) this.emit({ type: "departures", sub: id, seq, stop, generated_at: d.generated_at, items: d.items })
			}
			const sub: Sub = { channel, params, seq: 1, last: new Map(), timer: setInterval(() => send(++sub.seq), MOCK_DEPARTURES_MS) }
			this.subs.set(id, sub)
			send(1)
			return
		}
		this.emit({ type: "error", id, code: "VALIDATION_FAILED", message: `unknown channel ${channel}` })
	}

	private unsubscribe(id: string) {
		const s = this.subs.get(id)
		if (s) clearInterval(s.timer)
		this.subs.delete(id)
	}
}
