// types.ts
// camelCase domain types (plan 3.2) and snake_case wire -> domain mappers over the schema types.
// Screens only ever see these types.

import type { ManualSchemas as W, I18nText, Mode, NetworkStatus } from "./schema.manual"

export type { I18nText, Mode, NetworkStatus }

export interface NetworkSummary {
	id: string // slug, e.g. "kocaeli-bus"
	name: string
	modes: Mode[]
	color: string | null
	status: NetworkStatus
}

export interface City {
	id: string // slug, e.g. "kocaeli"
	name: I18nText
	country: string
	timezone: string
	centre: [number, number] // [lon, lat]
	bbox: [number, number, number, number] // [w, s, e, n]
	networks: NetworkSummary[]
}

export interface CardCapability {
	balance: boolean
	history: boolean
	requiresProviderAccount: boolean
	numberFormat: string
	label: I18nText
}

export interface Capabilities {
	stops: boolean
	routes: boolean
	timetables: boolean
	shapes: boolean
	realtimeVehicles: boolean
	realtimeDepartures: "none" | "estimated" | "live"
	tripUpdates: boolean
	alerts: boolean
	card: CardCapability | null
	tripPlanner: boolean
	bikeShare: boolean
}

export interface Network {
	id: string
	cityId: string
	name: string
	operatorName: string | null
	modes: Mode[]
	color: string | null
	status: NetworkStatus
	statusMessage: string | null
	timezone: string
	capabilities: Capabilities
	packVersion: string | null
	attribution: { text: string; url: string | null; licence: string | null; unofficial: boolean }
	privacy: { providers: { name: string; pulledData: { key: string; label: I18nText; canOptOut: boolean }[]; optOutUrl: string | null }[] }
	freshness: { staticSyncedAt: string | null; realtimeAt: string | null }
	map: { centre: [number, number]; zoom: number }
}

export interface RouteSummary {
	id: string
	networkId: string
	shortName: string
	longName: string
	mode: Mode
	color: string | null
	textColor: string | null
}

export interface StopSummary {
	id: string
	networkId: string
	name: string
	code: string | null
	lat: number
	lon: number
	distanceM?: number
}

export interface Stop extends StopSummary {
	modes: Mode[]
	routes: RouteSummary[]
}

export interface Departure {
	route: RouteSummary
	direction: 0 | 1
	headsign: string
	scheduledAt: string
	predictedAt: string | null
	vehicleId: string | null
	stopsAway: number | null
	source: "schedule" | "live" | "live_eta"
	cancelled: boolean
}

export interface Departures {
	stopId: string
	generatedAt: string
	items: Departure[]
}

export interface RouteStop {
	id: string
	name: string
	code: string | null
	lat: number
	lon: number
	offsetS: number | null
}

export interface RouteDirection {
	direction: 0 | 1
	headsign: string
	stops: RouteStop[]
}

export interface Route extends RouteSummary {
	agency: string | null
	directions: RouteDirection[]
}

export interface Shape {
	routeId: string
	direction: 0 | 1
	polyline: string
	precision: number
}

export type DayType = W["DayType"]

export interface Timetable {
	routeId: string
	direction: 0 | 1
	dayType: DayType
	dayTypes: { key: DayType; label: I18nText }[]
	timezone: string
	starts: string[]
	stopOffsets: { stopId: string; offsetS: number }[]
}

export interface Alert {
	id: string
	title: string
	body: string
	severity: "info" | "warning" | "severe"
	routeIds: string[]
	activeFrom: string
	activeTo: string | null
	url: string | null
}

export interface AppConfig {
	minSupportedVersion: string
	softUpdateVersion: string | null
	flags: Record<string, boolean>
	killSwitches: { cards: boolean; liveMap: boolean }
	announcement: { id: string; level: "info" | "warning"; title: I18nText; body: I18nText; url: string | null } | null
	tilesStyleUrl: { light: string; dark: string }
	wsUrl: string
}

export interface Me {
	id: string
	email: string
	displayName: string | null
	username: string | null
	avatarUrl: string | null
}

export interface VehicleDetail {
	id: string
	networkId: string
	route: RouteSummary | null
	direction: 0 | 1 | null
	headsign: string | null
	lat: number
	lon: number
	bearing: number | null
	speedMs: number | null
	plate: string | null
	accessible: boolean
	vehicleTs: number
	stopSeq: number | null
}

export interface PackStop {
	id: string
	name: string
	code: string | null
	lat: number
	lon: number
	modes: Mode[]
	routeIds: string[]
}

export interface PackRoute {
	id: string
	shortName: string
	longName: string
	mode: Mode
	color: string | null
	textColor: string | null
	directions: { direction: 0 | 1; headsign: string; stopIds: string[] }[]
}

export interface Pack {
	networkId: string
	version: string
	builtAt: string
	stops: PackStop[]
	routes: PackRoute[]
}

export interface CardBalance {
	balance: number
	currency: string
	asOf: string
	cardType: string | null
}

export interface CardTransaction {
	at: string
	kind: "boarding" | "topup" | "transfer" | "other"
	amount: number
	balanceAfter: number | null
	routeShortName: string | null
}

// ---- mappers ---------------------------------------------------------------------------------

const lngLat = (a: number[]): [number, number] => [a[0] ?? 0, a[1] ?? 0]
const bbox4 = (a: number[]): [number, number, number, number] => [a[0] ?? 0, a[1] ?? 0, a[2] ?? 0, a[3] ?? 0]

export const toNetworkSummary = (n: W["NetworkSummary"]): NetworkSummary => ({
	id: n.slug,
	name: n.name,
	modes: n.modes,
	color: n.colour,
	status: n.status,
})

export const toCity = (c: W["City"]): City => ({
	id: c.slug,
	name: c.name,
	country: c.country_code,
	timezone: c.timezone,
	centre: lngLat(c.centre),
	bbox: bbox4(c.bbox),
	networks: c.networks.map(toNetworkSummary),
})

export const toCapabilities = (c: W["Capabilities"]): Capabilities => ({
	stops: c.stops,
	routes: c.routes,
	timetables: c.timetables,
	shapes: c.shapes,
	realtimeVehicles: c.realtime_vehicles,
	realtimeDepartures: c.realtime_departures,
	tripUpdates: c.trip_updates,
	alerts: c.alerts,
	card: c.card
		? {
				balance: c.card.balance,
				history: c.card.history,
				requiresProviderAccount: c.card.requires_provider_account,
				numberFormat: c.card.number_format,
				label: c.card.label,
			}
		: null,
	tripPlanner: c.trip_planner,
	bikeShare: c.bike_share,
})

export const toNetwork = (n: W["Network"]): Network => ({
	id: n.slug,
	cityId: n.city_slug,
	name: n.name,
	operatorName: n.operator_name,
	modes: n.modes,
	color: n.colour,
	status: n.status,
	statusMessage: n.status_message,
	timezone: n.timezone,
	capabilities: toCapabilities(n.capabilities),
	packVersion: n.pack_version,
	attribution: n.attribution,
	privacy: {
		providers: n.privacy.providers.map((p) => ({
			name: p.name,
			optOutUrl: p.optout_url,
			pulledData: p.pulled_data.map((d) => ({ key: d.key, label: d.label, canOptOut: d.can_optout })),
		})),
	},
	freshness: { staticSyncedAt: n.freshness.static_synced_at, realtimeAt: n.freshness.realtime_at },
	map: { centre: lngLat(n.map.centre), zoom: n.map.zoom },
})

export const toRouteSummary = (r: W["RouteSummary"]): RouteSummary => ({
	id: r.id,
	networkId: r.network,
	shortName: r.short_name,
	longName: r.long_name,
	mode: r.mode,
	color: r.colour,
	textColor: r.text_colour,
})

export const toStopSummary = (s: W["StopSummary"]): StopSummary => ({
	id: s.id,
	networkId: s.network,
	name: s.name,
	code: s.code,
	lat: s.lat,
	lon: s.lon,
	distanceM: s.distance_m,
})

export const toStop = (s: W["Stop"]): Stop => ({
	...toStopSummary(s),
	modes: s.modes,
	routes: s.routes.map(toRouteSummary),
})

export const toDeparture = (d: W["Departure"]): Departure => ({
	route: toRouteSummary(d.route),
	direction: d.direction,
	headsign: d.headsign,
	scheduledAt: d.scheduled_at,
	predictedAt: d.predicted_at,
	vehicleId: d.vehicle_id,
	stopsAway: d.stops_away,
	source: d.source,
	cancelled: d.cancelled,
})

export const toDepartures = (d: W["Departures"]): Departures => ({
	stopId: d.stop,
	generatedAt: d.generated_at,
	items: d.items.map(toDeparture),
})

export const toRoute = (r: W["Route"]): Route => ({
	...toRouteSummary(r),
	agency: r.agency,
	directions: r.directions.map((d) => ({
		direction: d.direction,
		headsign: d.headsign,
		stops: d.stops.map((s) => ({ id: s.id, name: s.name, code: s.code, lat: s.lat, lon: s.lon, offsetS: s.offset_s })),
	})),
})

export const toShape = (s: W["Shape"]): Shape => ({
	routeId: s.route,
	direction: s.direction,
	polyline: s.polyline,
	precision: s.precision,
})

export const toTimetable = (t: W["Timetable"]): Timetable => ({
	routeId: t.route,
	direction: t.direction,
	dayType: t.day_type,
	dayTypes: t.day_types,
	timezone: t.timezone,
	starts: t.starts,
	stopOffsets: t.stop_offsets.map((o) => ({ stopId: o.stop_id, offsetS: o.offset_s })),
})

export const toAlert = (a: W["Alert"]): Alert => ({
	id: a.id,
	title: a.title,
	body: a.body,
	severity: a.severity,
	routeIds: a.route_ids,
	activeFrom: a.active_from,
	activeTo: a.active_to,
	url: a.url,
})

export const toAppConfig = (c: W["AppConfig"]): AppConfig => ({
	minSupportedVersion: c.min_supported_version,
	softUpdateVersion: c.soft_update_version,
	flags: c.flags,
	// A kill switch value of false means the feature is switched off.
	killSwitches: { cards: c.kill_switches.cards !== false, liveMap: c.kill_switches.live_map !== false },
	announcement: c.announcement,
	tilesStyleUrl: c.tiles_style_url,
	wsUrl: c.ws_url,
})

export const toMe = (m: W["Me"]): Me => ({
	id: m.public_id,
	email: m.email,
	displayName: m.display_name,
	username: m.username,
	avatarUrl: m.avatar_url,
})

export const toVehicleDetail = (v: W["Vehicle"]): VehicleDetail => ({
	id: v.id,
	networkId: v.network,
	route: v.route ? toRouteSummary(v.route) : null,
	direction: v.direction,
	headsign: v.headsign,
	lat: v.lat,
	lon: v.lon,
	bearing: v.bearing,
	speedMs: v.speed_ms,
	plate: v.plate,
	accessible: v.accessible,
	vehicleTs: v.vehicle_ts,
	stopSeq: v.stop_seq,
})

export const toPack = (p: W["Pack"]): Pack => ({
	networkId: p.network,
	version: p.pack_version,
	builtAt: p.built_at,
	stops: p.stops.map((s) => ({
		id: s.id,
		name: s.name,
		code: s.code,
		lat: s.lat,
		lon: s.lon,
		modes: s.modes,
		routeIds: s.route_ids,
	})),
	routes: p.routes.map((r) => ({
		id: r.id,
		shortName: r.short_name,
		longName: r.long_name,
		mode: r.mode,
		color: r.colour,
		textColor: r.text_colour,
		directions: r.directions.map((d) => ({ direction: d.direction, headsign: d.headsign, stopIds: d.stop_ids })),
	})),
})

export const toCardBalance = (c: W["CardLookup"]): CardBalance => ({
	balance: c.balance,
	currency: c.currency,
	asOf: c.as_of,
	cardType: c.card_type,
})

export const toCardTransaction = (t: W["CardTransaction"]): CardTransaction => ({
	at: t.at,
	kind: t.kind,
	amount: t.amount,
	balanceAfter: t.balance_after,
	routeShortName: t.route_short_name,
})
