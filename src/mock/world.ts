// world.ts
// A small, deterministic transit world for mock mode and tests: Kocaeli (bus with live data,
// ferry with schedules only) and Bursa (bus, degraded). Coordinates are approximate real places;
// stop ids follow the backend's stable public id shape ("4.41003"). No operator artwork or data.

export type MockMode = "bus" | "ferry"

export interface Place {
	name: string
	lat: number
	lon: number
}

export interface MockStop {
	id: string
	name: string
	code: string
	lat: number
	lon: number
	network: string
	modes: MockMode[]
	routeIds: Set<string>
}

export interface MockRoute {
	id: string
	network: string
	shortName: string
	longName: string
	mode: MockMode
	colour: string
	textColour: string
	headwayMin: number
	firstMin: number
	lastMin: number
	/** [direction 0 stop ids, direction 1 stop ids] */
	stops: [string[], string[]]
	/** cumulative seconds from the first stop, per direction */
	offsets: [number[], number[]]
}

export interface MockNetwork {
	slug: string
	id: number
	city: string
	name: string
	operator: string
	modes: MockMode[]
	colour: string
	status: "active" | "degraded" | "disabled"
	statusMessage: string | null
	realtime: boolean
	alerts: boolean
	card: boolean
	binding: number
}

export interface MockCity {
	slug: string
	id: number
	name: { tr: string; en: string }
	centre: [number, number]
	bbox: [number, number, number, number]
}

const P = (name: string, lat: number, lon: number): Place => ({ name, lat, lon })

const KOCAELI = {
	merkez: P("İzmit Merkez", 40.7656, 29.9175),
	gar: P("Tren Garı", 40.766, 29.9245),
	sekapark: P("Sekapark", 40.7625, 29.931),
	dogukisla: P("Doğu Kışla", 40.768, 29.938),
	hastane: P("Seka Hastanesi", 40.764, 29.95),
	otogar: P("İzmit Otogar", 40.7735, 29.9528),
	yahyakaptan: P("Yahya Kaptan", 40.7703, 29.969),
	kurucesme: P("Kuruçeşme", 40.772, 29.99),
	alikahya: P("Alikahya", 40.785, 30.011),
	kartepe: P("Kartepe Merkez", 40.752, 30.035),
	yenidogan: P("Yenidoğan", 40.774, 29.935),
	tavsantepe: P("Tavşantepe", 40.781, 29.93),
	umuttepe: P("Umuttepe Kampüsü", 40.823, 29.923),
	bekirdere: P("Bekirdere", 40.779, 29.903),
	derince: P("Derince", 40.756, 29.815),
	korfez: P("Körfez", 40.77, 29.74),
	dilovasi: P("Dilovası", 40.78, 29.54),
	gebze: P("Gebze Merkez", 40.802, 29.43),
	basiskele: P("Başiskele", 40.715, 29.93),
	golcuk: P("Gölcük", 40.717, 29.82),
	iskele: P("İzmit İskele", 40.7605, 29.9235),
	golcukIskele: P("Gölcük İskelesi", 40.7205, 29.8255),
	degirmendere: P("Değirmendere", 40.723, 29.782),
	karamursel: P("Karamürsel", 40.693, 29.615),
	hereke: P("Hereke", 40.786, 29.626),
} satisfies Record<string, Place>

const BURSA = {
	heykel: P("Heykel", 40.1835, 29.0645),
	kent: P("Kent Meydanı", 40.1925, 29.0505),
	otogar: P("Bursa Terminal", 40.2675, 29.0625),
	gorukle: P("Görükle Kampüsü", 40.226, 28.8705),
	nilufer: P("Nilüfer", 40.2155, 28.975),
	yildirim: P("Yıldırım", 40.191, 29.105),
} satisfies Record<string, Place>

export const CITIES: MockCity[] = [
	{
		slug: "kocaeli",
		id: 1,
		name: { tr: "Kocaeli", en: "Kocaeli" },
		centre: [29.9408, 40.7655],
		bbox: [29.3, 40.5, 30.4, 41.25],
	},
	{
		slug: "bursa",
		id: 2,
		name: { tr: "Bursa", en: "Bursa" },
		centre: [29.0610, 40.1885],
		bbox: [28.6, 39.9, 29.6, 40.45],
	},
]

export const NETWORKS: MockNetwork[] = [
	{
		slug: "kocaeli-bus",
		id: 1,
		city: "kocaeli",
		name: "Kocaeli Otobüs",
		operator: "Kocaeli Büyükşehir Belediyesi",
		modes: ["bus"],
		colour: "#0e7490",
		status: "active",
		statusMessage: null,
		realtime: true,
		alerts: true,
		card: true,
		binding: 4,
	},
	{
		slug: "kocaeli-ferry",
		id: 2,
		city: "kocaeli",
		name: "Kocaeli Deniz",
		operator: "Kocaeli Büyükşehir Belediyesi",
		modes: ["ferry"],
		colour: "#1d4ed8",
		status: "active",
		statusMessage: null,
		realtime: false,
		alerts: false,
		card: false,
		binding: 5,
	},
	{
		slug: "bursa-bus",
		id: 3,
		city: "bursa",
		name: "Bursa Otobüs",
		operator: "Burulaş",
		modes: ["bus"],
		colour: "#15803d",
		status: "degraded",
		statusMessage: "Live positions are delayed by a few minutes.",
		realtime: true,
		alerts: false,
		card: false,
		binding: 7,
	},
]

interface RouteDef {
	network: string
	code: string
	shortName: string
	colour: string
	textColour: string
	mode: MockMode
	headwayMin: number
	path: Place[]
}

const k = KOCAELI
const b = BURSA

const ROUTE_DEFS: RouteDef[] = [
	{ network: "kocaeli-bus", code: "41265", shortName: "41C", colour: "#d97706", textColour: "#ffffff", mode: "bus", headwayMin: 12, path: [k.umuttepe, k.tavsantepe, k.yenidogan, k.dogukisla, k.sekapark, k.merkez] },
	{ network: "kocaeli-bus", code: "41200", shortName: "200", colour: "#1d4ed8", textColour: "#ffffff", mode: "bus", headwayMin: 20, path: [k.gebze, k.dilovasi, k.korfez, k.derince, k.merkez, k.gar] },
	{ network: "kocaeli-bus", code: "41120", shortName: "120", colour: "#be123c", textColour: "#ffffff", mode: "bus", headwayMin: 15, path: [k.derince, k.bekirdere, k.merkez, k.sekapark, k.hastane, k.yahyakaptan, k.kurucesme, k.kartepe] },
	{ network: "kocaeli-bus", code: "41009", shortName: "9", colour: "#fbbf24", textColour: "#ffffff", mode: "bus", headwayMin: 10, path: [k.yahyakaptan, k.otogar, k.dogukisla, k.gar, k.merkez] },
	{ network: "kocaeli-bus", code: "41015", shortName: "15", colour: "#15803d", textColour: "#ffffff", mode: "bus", headwayMin: 18, path: [k.bekirdere, k.tavsantepe, k.otogar, k.yahyakaptan, k.alikahya] },
	{ network: "kocaeli-bus", code: "41501", shortName: "Ü1", colour: "#6d28d9", textColour: "#ffffff", mode: "bus", headwayMin: 8, path: [k.gar, k.merkez, k.bekirdere, k.tavsantepe, k.umuttepe] },
	{ network: "kocaeli-bus", code: "41500", shortName: "500", colour: "#0f766e", textColour: "#ffffff", mode: "bus", headwayMin: 25, path: [k.golcuk, k.basiskele, k.hastane, k.sekapark, k.merkez] },
	{ network: "kocaeli-ferry", code: "51001", shortName: "D1", colour: "#1d4ed8", textColour: "#ffffff", mode: "ferry", headwayMin: 60, path: [k.karamursel, k.degirmendere, k.golcukIskele, k.iskele] },
	{ network: "kocaeli-ferry", code: "51002", shortName: "D2", colour: "#0369a1", textColour: "#ffffff", mode: "ferry", headwayMin: 90, path: [k.hereke, k.karamursel] },
	{ network: "bursa-bus", code: "71001", shortName: "1/C", colour: "#15803d", textColour: "#ffffff", mode: "bus", headwayMin: 10, path: [b.gorukle, b.nilufer, b.kent, b.heykel, b.yildirim] },
	{ network: "bursa-bus", code: "71038", shortName: "38", colour: "#b45309", textColour: "#ffffff", mode: "bus", headwayMin: 15, path: [b.otogar, b.kent, b.heykel] },
]

const STREET_NAMES = [
	"Atatürk Bulvarı",
	"Cumhuriyet Caddesi",
	"Belediye",
	"Okul",
	"Sağlık Ocağı",
	"PTT",
	"Pazar Yeri",
	"Spor Salonu",
	"Lise",
	"Kavşak",
	"Sanayi Sitesi",
	"Park",
	"Çarşı",
	"Köprü",
	"Meydan",
	"Cami",
	"İstasyon Yolu",
	"Fabrika",
]

export const BUS_SPEED_MS = 6.5
export const FERRY_SPEED_MS = 5
export const DWELL_S = 20

export function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
	const R = 6371000
	const toRad = (d: number) => (d * Math.PI) / 180
	const dLat = toRad(bLat - aLat)
	const dLon = toRad(bLon - aLon)
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
	return 2 * R * Math.asin(Math.sqrt(h))
}

export function hash(s: string): number {
	let h = 2166136261
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}

export interface World {
	cities: MockCity[]
	networks: MockNetwork[]
	stops: Map<string, MockStop>
	routes: Map<string, MockRoute>
}

function buildWorld(): World {
	const stops = new Map<string, MockStop>()
	const byKey = new Map<string, string>()
	const counters = new Map<number, number>()
	const routes = new Map<string, MockRoute>()

	const networkOf = (slug: string) => NETWORKS.find((n) => n.slug === slug)!

	function stopAt(network: MockNetwork, key: string, name: string, lat: number, lon: number, mode: MockMode): string {
		const existing = byKey.get(`${network.slug}|${key}`)
		if (existing) return existing
		const n = (counters.get(network.binding) ?? 0) + 1
		counters.set(network.binding, n)
		const id = `${network.binding}.${network.binding}${String(1000 + n)}`
		stops.set(id, {
			id,
			name,
			code: String(1000 + n),
			lat: Math.round(lat * 1e5) / 1e5,
			lon: Math.round(lon * 1e5) / 1e5,
			network: network.slug,
			modes: [mode],
			routeIds: new Set(),
		})
		byKey.set(`${network.slug}|${key}`, id)
		return id
	}

	for (const def of ROUTE_DEFS) {
		const net = networkOf(def.network)
		const id = `${net.binding}.${def.code}`
		const ids: string[] = []
		for (let i = 0; i < def.path.length; i++) {
			const a = def.path[i]!
			ids.push(stopAt(net, a.name, a.name, a.lat, a.lon, def.mode))
			const c = def.path[i + 1]
			if (!c || def.mode === "ferry") continue
			// intermediate stops every ~700 m, shared by any route on the same segment
			const dist = haversineM(a.lat, a.lon, c.lat, c.lon)
			const between = Math.min(6, Math.max(0, Math.round(dist / 700) - 1))
			const segKey = [a.name, c.name].sort().join("~")
			for (let j = 1; j <= between; j++) {
				const forward = a.name < c.name
				const jj = forward ? j : between + 1 - j
				const lo = a.name < c.name ? a : c
				const hi = a.name < c.name ? c : a
				const t = jj / (between + 1)
				const lat = lo.lat + (hi.lat - lo.lat) * t + Math.sin(jj * 1.7) * 0.0006
				const lon = lo.lon + (hi.lon - lo.lon) * t + Math.cos(jj * 1.3) * 0.0006
				const street = STREET_NAMES[hash(`${segKey}${jj}`) % STREET_NAMES.length]!
				const near = t < 0.5 ? lo.name : hi.name
				ids.push(stopAt(net, `${segKey}#${jj}`, `${near} ${street}`, lat, lon, def.mode))
			}
		}
		const dir0 = ids
		const dir1 = [...ids].reverse()
		const speed = def.mode === "ferry" ? FERRY_SPEED_MS : BUS_SPEED_MS
		const offsetsFor = (list: string[]) => {
			const out = [0]
			for (let i = 1; i < list.length; i++) {
				const p = stops.get(list[i - 1]!)!
				const q = stops.get(list[i]!)!
				out.push(Math.round(out[i - 1]! + haversineM(p.lat, p.lon, q.lat, q.lon) / speed + DWELL_S))
			}
			return out
		}
		for (const sid of ids) stops.get(sid)!.routeIds.add(id)
		const first = def.path[0]!
		const last = def.path[def.path.length - 1]!
		routes.set(id, {
			id,
			network: def.network,
			shortName: def.shortName,
			longName: `${first.name} - ${last.name}`,
			mode: def.mode,
			colour: def.colour,
			textColour: def.textColour,
			headwayMin: def.headwayMin,
			firstMin: def.mode === "ferry" ? 7 * 60 : 6 * 60,
			lastMin: def.mode === "ferry" ? 21 * 60 : 23 * 60 + 30,
			stops: [dir0, dir1],
			offsets: [offsetsFor(dir0), offsetsFor(dir1)],
		})
	}
	return { cities: CITIES, networks: NETWORKS, stops, routes }
}

let world: World | null = null
export function getWorld(): World {
	world ??= buildWorld()
	return world
}

// ---- time in the network timezone (Europe/Istanbul is UTC+3 all year) ---------------------------

export const TZ_OFFSET_MIN = 180

export type MockDayType = "weekday" | "saturday" | "sunday"

/** Minutes since local midnight and the local day type for a UTC epoch in ms. */
export function localClock(nowMs: number): { minutes: number; seconds: number; dayType: MockDayType; midnightMs: number } {
	const local = new Date(nowMs + TZ_OFFSET_MIN * 60_000)
	const seconds = local.getUTCHours() * 3600 + local.getUTCMinutes() * 60 + local.getUTCSeconds()
	const dow = local.getUTCDay()
	const dayType: MockDayType = dow === 0 ? "sunday" : dow === 6 ? "saturday" : "weekday"
	const midnightMs = nowMs - seconds * 1000 - local.getUTCMilliseconds()
	return { minutes: Math.floor(seconds / 60), seconds, dayType, midnightMs }
}

export function headwayFor(route: MockRoute, dayType: MockDayType): number {
	return Math.round(route.headwayMin * (dayType === "weekday" ? 1 : dayType === "saturday" ? 1.5 : 2))
}

/** Trip start times at the origin, minutes since local midnight. */
export function startsFor(route: MockRoute, direction: 0 | 1, dayType: MockDayType): number[] {
	const h = headwayFor(route, dayType)
	const shift = direction === 1 ? Math.round(h / 2) : 0
	const out: number[] = []
	for (let m = route.firstMin + shift; m <= route.lastMin; m += h) out.push(m)
	return out
}

export function hhmm(minutes: number): string {
	const m = ((minutes % 1440) + 1440) % 1440
	return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/** Delay in seconds for a trip, stable per trip: -60 to +240. */
export function tripDelayS(tripId: string): number {
	return (hash(tripId) % 6) * 60 - 60
}
