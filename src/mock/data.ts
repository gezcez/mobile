// data.ts
// Wire-format (snake_case) responses computed from the mock world, shared by the mock fetch, the
// mock live feed and tests. Shapes follow src/api/schema.manual.ts.

import polyline from "@mapbox/polyline"
import type { ManualSchemas as W } from "@/api/schema.manual"
import {
	getWorld,
	hash,
	haversineM,
	hhmm,
	localClock,
	startsFor,
	tripDelayS,
	type MockDayType,
	type MockNetwork,
	type MockRoute,
	type MockStop,
} from "./world"

const iso = (ms: number) => new Date(ms).toISOString()

export function networkBySlug(slug: string): MockNetwork | undefined {
	return getWorld().networks.find((n) => n.slug === slug || String(n.id) === slug)
}

export function wireNetworkSummary(n: MockNetwork): W["NetworkSummary"] {
	return { id: n.id, slug: n.slug, name: n.name, modes: n.modes, colour: n.colour, status: n.status }
}

export function wireCity(slug: string): W["City"] | null {
	const w = getWorld()
	const c = w.cities.find((x) => x.slug === slug)
	if (!c) return null
	return {
		id: c.id,
		slug: c.slug,
		name: c.name,
		country_code: "TR",
		timezone: "Europe/Istanbul",
		centre: c.centre,
		bbox: c.bbox,
		networks: w.networks.filter((n) => n.city === c.slug).map(wireNetworkSummary),
	}
}

export function wireCities(): W["City"][] {
	return getWorld().cities.map((c) => wireCity(c.slug)!)
}

export function wireNetwork(n: MockNetwork, nowMs: number): W["Network"] {
	const city = getWorld().cities.find((c) => c.slug === n.city)!
	return {
		id: n.id,
		slug: n.slug,
		city_slug: n.city,
		name: n.name,
		operator_name: n.operator,
		modes: n.modes,
		colour: n.colour,
		status: n.status,
		status_message: n.statusMessage,
		timezone: "Europe/Istanbul",
		capabilities: {
			stops: true,
			routes: true,
			timetables: true,
			shapes: true,
			realtime_vehicles: n.realtime,
			realtime_departures: n.realtime ? "estimated" : "none",
			trip_updates: false,
			alerts: n.alerts,
			card: n.card
				? {
						balance: true,
						history: true,
						requires_provider_account: false,
						number_format: "^[0-9]{10,16}$",
						label: { tr: "Kent kartı", en: "City card" },
					}
				: null,
			trip_planner: false,
			bike_share: false,
		},
		pack_version: `mock-${n.slug}-1`,
		attribution: {
			text: n.realtime ? "Unofficial data. Not affiliated with the operator." : "Published timetables.",
			url: null,
			licence: null,
			unofficial: true,
		},
		privacy: {
			providers: [
				{
					name: n.operator,
					optout_url: null,
					pulled_data: [
						{ key: "card_trips", label: { tr: "Kartla yapılan yolculuklar", en: "Trips made with your card" }, can_optout: false },
						{ key: "card_photo", label: { tr: "Kişiselleştirilmiş kart fotoğrafı", en: "Personalised card photo" }, can_optout: true },
					],
				},
			],
		},
		freshness: { static_synced_at: iso(nowMs - 6 * 3600_000), realtime_at: n.realtime ? iso(nowMs - 20_000) : null },
		map: { centre: city.centre, zoom: 12 },
	}
}

export function wireManifest(citySlug: string, nowMs: number): W["CityManifest"] | null {
	const city = wireCity(citySlug)
	if (!city) return null
	return {
		city,
		networks: getWorld()
			.networks.filter((n) => n.city === citySlug)
			.map((n) => wireNetwork(n, nowMs)),
	}
}

export function wireRouteSummary(r: MockRoute): W["RouteSummary"] {
	return {
		id: r.id,
		network: r.network,
		short_name: r.shortName,
		long_name: r.longName,
		mode: r.mode,
		colour: r.colour.replace("#", ""),
		text_colour: r.textColour.replace("#", ""),
	}
}

export function wireStopSummary(s: MockStop, distance?: number): W["StopSummary"] {
	return {
		id: s.id,
		network: s.network,
		name: s.name,
		code: s.code,
		lat: s.lat,
		lon: s.lon,
		...(distance !== undefined ? { distance_m: Math.round(distance) } : {}),
	}
}

export function wireStop(id: string): W["Stop"] | null {
	const w = getWorld()
	const s = w.stops.get(id)
	if (!s) return null
	return {
		...wireStopSummary(s),
		modes: s.modes,
		routes: [...s.routeIds].map((r) => wireRouteSummary(w.routes.get(r)!)),
	}
}

export function wirePack(slug: string): W["Pack"] | null {
	const w = getWorld()
	const n = networkBySlug(slug)
	if (!n) return null
	return {
		network: n.slug,
		pack_version: `mock-${n.slug}-1`,
		built_at: "2026-10-01T03:00:00.000Z",
		stops: [...w.stops.values()]
			.filter((s) => s.network === n.slug)
			.map((s) => ({ id: s.id, name: s.name, code: s.code, lat: s.lat, lon: s.lon, modes: s.modes, route_ids: [...s.routeIds] })),
		routes: [...w.routes.values()]
			.filter((r) => r.network === n.slug)
			.map((r) => ({
				id: r.id,
				short_name: r.shortName,
				long_name: r.longName,
				mode: r.mode,
				colour: r.colour.replace("#", ""),
				text_colour: r.textColour.replace("#", ""),
				directions: ([0, 1] as const).map((d) => ({
					direction: d,
					headsign: w.stops.get(r.stops[d][r.stops[d].length - 1]!)!.name,
					stop_ids: r.stops[d],
				})),
			})),
	}
}

export function wireRoute(id: string): W["Route"] | null {
	const w = getWorld()
	const r = w.routes.get(id)
	if (!r) return null
	return {
		...wireRouteSummary(r),
		agency: networkBySlug(r.network)?.operator ?? null,
		directions: ([0, 1] as const).map((d) => ({
			direction: d,
			headsign: w.stops.get(r.stops[d][r.stops[d].length - 1]!)!.name,
			stops: r.stops[d].map((sid, i) => {
				const s = w.stops.get(sid)!
				return { id: s.id, name: s.name, code: s.code, lat: s.lat, lon: s.lon, offset_s: r.offsets[d][i]! }
			}),
		})),
	}
}

export function wireShape(id: string, direction: 0 | 1): W["Shape"] | null {
	const w = getWorld()
	const r = w.routes.get(id)
	if (!r) return null
	const pts: [number, number][] = []
	const list = r.stops[direction]
	for (let i = 0; i < list.length; i++) {
		const s = w.stops.get(list[i]!)!
		pts.push([s.lat, s.lon])
		const n = list[i + 1] ? w.stops.get(list[i + 1]!)! : null
		// a slight bend between stops so the line looks like a street, not a ruler
		if (n) pts.push([(s.lat + n.lat) / 2 + 0.0003, (s.lon + n.lon) / 2 - 0.0003])
	}
	return { route: r.id, direction, polyline: polyline.encode(pts, 6), precision: 6 }
}

export function wireTimetable(id: string, direction: 0 | 1, dayType: MockDayType): W["Timetable"] | null {
	const r = getWorld().routes.get(id)
	if (!r) return null
	return {
		route: r.id,
		direction,
		date: null,
		day_type: dayType,
		day_types: [
			{ key: "weekday", label: { tr: "Hafta içi", en: "Weekdays" } },
			{ key: "saturday", label: { tr: "Cumartesi", en: "Saturday" } },
			{ key: "sunday", label: { tr: "Pazar", en: "Sunday" } },
		],
		timezone: "Europe/Istanbul",
		starts: startsFor(r, direction, dayType).map(hhmm),
		stop_offsets: r.stops[direction].map((sid, i) => ({ stop_id: sid, offset_s: r.offsets[direction][i]! })),
	}
}

// ---- live ---------------------------------------------------------------------------------------

export interface MockTrip {
	tripId: string
	route: MockRoute
	direction: 0 | 1
	startS: number // local seconds of the scheduled start
	delayS: number
	progressS: number // seconds since the (delayed) start
}

function tripsInProgress(route: MockRoute, nowMs: number): MockTrip[] {
	const { seconds, dayType } = localClock(nowMs)
	const out: MockTrip[] = []
	for (const direction of [0, 1] as const) {
		const duration = route.offsets[direction][route.offsets[direction].length - 1]!
		for (const startMin of startsFor(route, direction, dayType)) {
			const tripId = `${route.id}:${direction}:${startMin}`
			const delayS = tripDelayS(tripId)
			const progressS = seconds - (startMin * 60 + delayS)
			if (progressS >= 0 && progressS < duration) out.push({ tripId, route, direction, startS: startMin * 60, delayS, progressS })
		}
	}
	return out
}

function bearingDeg(aLat: number, aLon: number, bLat: number, bLon: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180
	const y = Math.sin(toRad(bLon - aLon)) * Math.cos(toRad(bLat))
	const x = Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) - Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLon - aLon))
	return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

export interface MockVehicle {
	id: string
	lat: number
	lon: number
	bearing: number
	speedMs: number
	routeId: string
	direction: 0 | 1
	tripId: string
	stopSeq: number
	status: string
	vehicleTs: number
	flags: number
	plate: string
	stopId: string
	headsign: string
}

export function vehiclesFor(networkSlug: string, nowMs: number): MockVehicle[] {
	const w = getWorld()
	const n = networkBySlug(networkSlug)
	if (!n?.realtime) return []
	const out: MockVehicle[] = []
	const nowS = Math.floor(nowMs / 1000)
	for (const route of w.routes.values()) {
		if (route.network !== n.slug) continue
		for (const trip of tripsInProgress(route, nowMs)) {
			const offs = route.offsets[trip.direction]
			const list = route.stops[trip.direction]
			let i = 0
			while (i < offs.length - 2 && offs[i + 1]! <= trip.progressS) i++
			const a = w.stops.get(list[i]!)!
			const b = w.stops.get(list[i + 1]!)!
			const span = offs[i + 1]! - offs[i]!
			const t = span > 0 ? Math.min(1, (trip.progressS - offs[i]!) / span) : 0
			const h = hash(trip.tripId)
			const stale = h % 15 === 0
			const vehicleTs = nowS - (stale ? 240 : h % 50)
			out.push({
				id: `${n.binding}.v${1000 + (h % 9000)}`,
				lat: Math.round((a.lat + (b.lat - a.lat) * t) * 1e5) / 1e5,
				lon: Math.round((a.lon + (b.lon - a.lon) * t) * 1e5) / 1e5,
				bearing: bearingDeg(a.lat, a.lon, b.lat, b.lon),
				speedMs: Math.round((haversineM(a.lat, a.lon, b.lat, b.lon) / Math.max(span, 1)) * 10) / 10,
				routeId: route.id,
				direction: trip.direction,
				tripId: trip.tripId,
				stopSeq: i + 1,
				status: "in_transit",
				vehicleTs,
				flags: (stale ? 1 : 0) | (h % 3 === 0 ? 2 : 0) | (i + 1 === list.length - 1 && t > 0.9 ? 4 : 0),
				plate: `41 ${String.fromCharCode(65 + (h % 26))}${String.fromCharCode(65 + ((h >> 5) % 26))} ${100 + (h % 900)}`,
				stopId: b.id,
				headsign: w.stops.get(list[list.length - 1]!)!.name,
			})
		}
	}
	return out
}

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
]

export function compactRow(v: MockVehicle): W["VehicleRow"] {
	return [v.id, v.lat, v.lon, v.bearing, v.speedMs, v.routeId, v.direction, v.tripId, v.stopSeq, v.status, v.vehicleTs, v.flags]
}

export function filterVehicles(
	list: MockVehicle[],
	p: { routes?: string[]; direction?: 0 | 1; bbox?: number[] },
): MockVehicle[] {
	return list.filter((v) => {
		if (p.routes?.length && !p.routes.includes(v.routeId)) return false
		if (p.direction !== undefined && v.direction !== p.direction) return false
		if (p.bbox && p.bbox.length === 4) {
			const [w, s, e, n] = p.bbox as [number, number, number, number]
			if (v.lon < w || v.lon > e || v.lat < s || v.lat > n) return false
		}
		return true
	})
}

export function wireVehiclesSnapshot(
	networkSlug: string,
	nowMs: number,
	p: { routes?: string[]; direction?: 0 | 1; bbox?: number[] },
): W["VehiclesSnapshot"] {
	return {
		network: networkSlug,
		feed_ts: Math.floor(nowMs / 1000) - 15,
		fields: COMPACT_FIELDS,
		vehicles: filterVehicles(vehiclesFor(networkSlug, nowMs), p).map(compactRow),
	}
}

export function wireVehicle(id: string, nowMs: number): W["Vehicle"] | null {
	const w = getWorld()
	for (const n of w.networks) {
		const v = vehiclesFor(n.slug, nowMs).find((x) => x.id === id)
		if (!v) continue
		return {
			id: v.id,
			network: n.slug,
			route: wireRouteSummary(w.routes.get(v.routeId)!),
			direction: v.direction,
			headsign: v.headsign,
			lat: v.lat,
			lon: v.lon,
			bearing: v.bearing,
			speed_ms: v.speedMs,
			plate: v.plate,
			accessible: (v.flags & 2) !== 0,
			vehicle_ts: v.vehicleTs,
			stop_seq: v.stopSeq,
		}
	}
	return null
}

export function wireDepartures(stopId: string, nowMs: number, limit = 30): W["Departures"] | null {
	const w = getWorld()
	const stop = w.stops.get(stopId)
	if (!stop) return null
	const net = networkBySlug(stop.network)!
	const { seconds, dayType, midnightMs } = localClock(nowMs)
	const tomorrow: MockDayType = dayType === "saturday" ? "sunday" : dayType === "sunday" ? "weekday" : dayType
	const items: (W["Departure"] & { _t: number })[] = []
	for (const rid of stop.routeIds) {
		const route = w.routes.get(rid)!
		for (const direction of [0, 1] as const) {
			const list = route.stops[direction]
			const idx = list.indexOf(stopId)
			if (idx < 0 || idx === list.length - 1) continue
			const offset = route.offsets[direction][idx]!
			const headsign = w.stops.get(list[list.length - 1]!)!.name
			const duration = route.offsets[direction][list.length - 1]!
			const days: [number, MockDayType][] = [
				[0, dayType],
				[86400, tomorrow],
			]
			for (const [dayShift, dt] of days) {
				for (const startMin of startsFor(route, direction, dt)) {
					const startS = startMin * 60 + dayShift
					const schedS = startS + offset
					if (schedS < seconds - 60 || schedS > seconds + 18 * 3600) continue
					const tripId = `${route.id}:${direction}:${startMin}`
					const delayS = dayShift === 0 ? tripDelayS(tripId) : 0
					const progress = seconds - (startS + delayS)
					const live = net.realtime && dayShift === 0 && progress >= 0 && progress < duration
					const predictedS = live ? schedS + delayS : null
					if (predictedS !== null && predictedS < seconds) continue
					let stopsAway: number | null = null
					if (live) {
						let i = 0
						while (i < list.length - 1 && route.offsets[direction][i + 1]! <= progress) i++
						stopsAway = Math.max(0, idx - i)
					}
					items.push({
						route: wireRouteSummary(route),
						direction,
						headsign,
						scheduled_at: iso(midnightMs + schedS * 1000),
						predicted_at: predictedS !== null ? iso(midnightMs + predictedS * 1000) : null,
						vehicle_id: live ? `${net.binding}.v${1000 + (hash(tripId) % 9000)}` : null,
						stops_away: stopsAway,
						source: live ? "live_eta" : "schedule",
						cancelled: hash(tripId) % 41 === 0,
						_t: predictedS ?? schedS,
					})
				}
			}
		}
	}
	items.sort((a, b) => a._t - b._t)
	return {
		stop: stopId,
		generated_at: iso(nowMs),
		items: items.slice(0, limit).map(({ _t, ...d }) => d),
	}
}

export function wireAlerts(networkSlug: string, nowMs: number): W["Alert"][] {
	const n = networkBySlug(networkSlug)
	if (!n?.alerts) return []
	return [
		{
			id: "a1",
			title: "Line 120 diverted near Sekapark",
			body: "Road works on Cumhuriyet Caddesi until Sunday. Buses use the coast road; the Sekapark stop is moved 150 m east.",
			severity: "warning",
			route_ids: ["4.41120"],
			active_from: iso(nowMs - 2 * 86400_000),
			active_to: iso(nowMs + 3 * 86400_000),
			url: null,
		},
	]
}

/** Turkish-aware folding, kept local so the mock does not import app code. */
function fold(s: string): string {
	return s
		.toLocaleLowerCase("tr")
		.replace(/ç/g, "c")
		.replace(/ğ/g, "g")
		.replace(/ı/g, "i")
		.replace(/ö/g, "o")
		.replace(/ş/g, "s")
		.replace(/ü/g, "u")
}

export function wireSearch(q: string, scope: { city?: string; network?: string }): W["Search"] {
	const w = getWorld()
	const f = fold(q.trim())
	const nets = w.networks.filter((n) => (scope.network ? n.slug === scope.network : scope.city ? n.city === scope.city : true))
	const allowed = new Set(nets.map((n) => n.slug))
	const routes = [...w.routes.values()]
		.filter((r) => allowed.has(r.network) && (fold(r.shortName).startsWith(f) || fold(r.longName).includes(f)))
		.slice(0, 20)
		.map(wireRouteSummary)
	const stops = [...w.stops.values()]
		.filter((s) => allowed.has(s.network) && (fold(s.name).includes(f) || s.code === q.trim()))
		.slice(0, 20)
		.map((s) => wireStopSummary(s))
	return { routes, stops }
}

export function wireNearby(lat: number, lon: number, radius: number, network?: string): W["StopSummary"][] {
	return [...getWorld().stops.values()]
		.filter((s) => !network || s.network === network)
		.map((s) => ({ s, d: haversineM(lat, lon, s.lat, s.lon) }))
		.filter((x) => x.d <= Math.min(radius, 1500))
		.sort((a, b) => a.d - b.d)
		.slice(0, 30)
		.map((x) => wireStopSummary(x.s, x.d))
}

export function wireAppConfig(): W["AppConfig"] {
	return {
		min_supported_version: "26.1.0",
		soft_update_version: null,
		flags: {},
		kill_switches: { cards: true, live_map: true },
		announcement: {
			id: "mock-1",
			level: "info",
			title: { tr: "Demo verisi", en: "Demo data" },
			body: {
				tr: "Bu derlemede gösterilen hatlar ve otobüsler örnek veridir.",
				en: "Lines and buses in this build are sample data.",
			},
			url: null,
		},
		tiles_style_url: {
			light: "https://tiles.openfreemap.org/styles/positron",
			dark: "https://tiles.openfreemap.org/styles/positron",
		},
		ws_url: "mock://ws",
	}
}

export function wireCardLookup(cardNumber: string, nowMs: number): W["CardLookup"] | null {
	if (/^0+$/.test(cardNumber)) return null
	const h = hash(cardNumber)
	return { balance: Math.round((h % 50000) + 1500) / 100, currency: "TRY", as_of: iso(nowMs - 60_000), card_type: h % 4 === 0 ? "student" : "full" }
}

export function wireCardHistory(cardNumber: string, month: string, nowMs: number): W["CardHistory"] | null {
	const base = wireCardLookup(cardNumber, nowMs)
	if (!base) return null
	const h = hash(cardNumber + month)
	const [y, m] = month.split("-").map(Number) as [number, number]
	const items: W["CardTransaction"][] = []
	let balance = base.balance
	const count = 8 + (h % 10)
	for (let i = 0; i < count; i++) {
		const day = 1 + ((h >> (i % 16)) % 27)
		const hour = 7 + (i * 3) % 13
		const topup = i % 6 === 5
		const amount = topup ? 100 : -(17 + (i % 3) * 3)
		items.push({
			at: new Date(Date.UTC(y, m - 1, day, hour - 3, (i * 7) % 60)).toISOString(),
			kind: topup ? "topup" : i % 4 === 3 ? "transfer" : "boarding",
			amount,
			balance_after: Math.round(balance * 100) / 100,
			route_short_name: topup ? null : ["41C", "200", "9", "Ü1"][i % 4]!,
		})
		balance -= amount
	}
	items.sort((a, b) => (a.at < b.at ? 1 : -1))
	return { month, currency: "TRY", items }
}
