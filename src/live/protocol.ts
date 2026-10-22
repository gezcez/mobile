// protocol.ts
// The realtime WS protocol, version 1 (backend 6.10). Server frames are typed from openapi.json's
// WsServerMessage; client frames stay narrower than WsClientMessage (whose subscribe params are an
// open record) so a subscription is checked per channel. The decoders turn compact rows into objects.

import type { W } from "@/api/wire"

export type VehiclesParams = {
	network: string
	routes?: string[]
	direction?: 0 | 1
	bbox?: [number, number, number, number]
	detail?: "compact" | "full"
}
export type DeparturesParams = { stop: string; limit?: number }

export type Subscription =
	| { channel: "vehicles"; params: VehiclesParams }
	| { channel: "departures"; params: DeparturesParams }

export type ClientMessage =
	| { type: "auth"; token: string }
	| ({ type: "subscribe"; id: string } & Subscription)
	| { type: "unsubscribe"; id: string }
	| { type: "pong"; t?: number }
	| { type: "ping"; t?: number }

export type VehicleRow = (string | number | null)[]

/** Server frames, from openapi.json (WsServerMessage). */
export type ServerMessage = W["WsServerMessage"]

export const LIMITS = { maxSubs: 8, maxRoutesPerSub: 12, maxBboxSpanDeg: 0.5 } as const

/** Vehicle row flags (backend 6.10). */
export const FLAGS = { stale: 1, accessible: 2, atTerminus: 4 } as const

export const COMPACT_FIELDS = [
	"id",
	"lat",
	"lon",
	"bearing",
	"speed_ms",
	"route_id",
	"direction",
	"trip_id",
	"stop_seq",
	"status",
	"vehicle_ts",
	"flags",
] as const

export interface LiveVehicle {
	id: string
	lat: number
	lon: number
	bearing: number | null
	speedMs: number | null
	routeId: string | null
	direction: 0 | 1 | null
	tripId: string | null
	stopSeq: number | null
	status: string | number | null
	/** unix seconds of the GPS fix */
	vehicleTs: number
	stale: boolean
	accessible: boolean
	atTerminus: boolean
	plate?: string | null
	stopId?: string | null
	headsign?: string | null
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null)
const str = (v: unknown): string | null => (typeof v === "string" ? v : typeof v === "number" ? String(v) : null)

/** Builds a row decoder for a `fields` list, so unknown or reordered fields never break the app. */
export function rowDecoder(fields: readonly string[]): (row: VehicleRow) => LiveVehicle | null {
	const at = (name: string) => fields.indexOf(name)
	const i = {
		id: at("id"),
		lat: at("lat"),
		lon: at("lon"),
		bearing: at("bearing"),
		speed: at("speed_ms"),
		route: at("route_id"),
		direction: at("direction"),
		trip: at("trip_id"),
		seq: at("stop_seq"),
		status: at("status"),
		ts: at("vehicle_ts"),
		flags: at("flags"),
		plate: at("plate"),
		stop: at("stop_id"),
		headsign: at("headsign"),
	}
	const get = (row: VehicleRow, idx: number) => (idx >= 0 ? row[idx] : undefined)
	return (row) => {
		const id = str(get(row, i.id))
		const lat = num(get(row, i.lat))
		const lon = num(get(row, i.lon))
		if (!id || lat === null || lon === null) return null
		const flags = num(get(row, i.flags)) ?? 0
		const d = num(get(row, i.direction))
		const v: LiveVehicle = {
			id,
			lat,
			lon,
			bearing: num(get(row, i.bearing)),
			speedMs: num(get(row, i.speed)),
			routeId: str(get(row, i.route)),
			direction: d === 0 || d === 1 ? d : null,
			tripId: str(get(row, i.trip)),
			stopSeq: num(get(row, i.seq)),
			status: (get(row, i.status) as string | number | null | undefined) ?? null,
			vehicleTs: num(get(row, i.ts)) ?? 0,
			stale: (flags & FLAGS.stale) !== 0,
			accessible: (flags & FLAGS.accessible) !== 0,
			atTerminus: (flags & FLAGS.atTerminus) !== 0,
		}
		if (i.plate >= 0) v.plate = str(get(row, i.plate))
		if (i.stop >= 0) v.stopId = str(get(row, i.stop))
		if (i.headsign >= 0) v.headsign = str(get(row, i.headsign))
		return v
	}
}

export function decodeRows(fields: readonly string[], rows: readonly VehicleRow[]): LiveVehicle[] {
	const dec = rowDecoder(fields)
	const out: LiveVehicle[] = []
	for (const r of rows) {
		const v = dec(r)
		if (v) out.push(v)
	}
	return out
}

/** Parses one text frame. Unknown or malformed messages return null and are ignored. */
export function parseServerMessage(text: string): ServerMessage | null {
	let m: unknown
	try {
		m = JSON.parse(text)
	} catch {
		return null
	}
	if (!m || typeof m !== "object" || typeof (m as { type?: unknown }).type !== "string") return null
	const o = m as Record<string, unknown>
	switch (o.type) {
		case "snapshot":
			return typeof o.sub === "string" && typeof o.seq === "number" && Array.isArray(o.fields) && Array.isArray(o.vehicles)
				? (o as ServerMessage)
				: null
		case "delta":
			return typeof o.sub === "string" && typeof o.seq === "number" && Array.isArray(o.upsert) && Array.isArray(o.remove)
				? (o as ServerMessage)
				: null
		case "departures":
			return typeof o.sub === "string" && typeof o.seq === "number" && Array.isArray(o.items) ? (o as ServerMessage) : null
		case "hello":
		case "auth_ok":
		case "status":
		case "error":
		case "ping":
		case "pong":
			return o as ServerMessage
		default:
			return null
	}
}

/** Freshness rule (plan 3.4): faded after 3 minutes, hidden after 10. */
export function freshness(v: Pick<LiveVehicle, "vehicleTs" | "stale">, nowMs: number): "fresh" | "stale" | "hidden" {
	const age = nowMs / 1000 - v.vehicleTs
	if (age > 600) return "hidden"
	if (v.stale || age > 180) return "stale"
	return "fresh"
}

/** Stable key for a subscription so equal views share one server subscription. */
export function subscriptionKey(s: Subscription): string {
	if (s.channel === "departures") return `departures:${s.params.stop}:${s.params.limit ?? 10}`
	const p = s.params
	return [
		"vehicles",
		p.network,
		p.routes ? [...p.routes].sort().join(",") : "",
		p.direction ?? "",
		p.bbox ? p.bbox.map((x) => x.toFixed(3)).join(",") : "",
		p.detail ?? "compact",
	].join(":")
}
