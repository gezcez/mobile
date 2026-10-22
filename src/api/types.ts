// types.ts
// camelCase domain types (plan 3.2) and snake_case wire -> domain mappers over the schema types.
// Screens only ever see these types.

import type { I18nText, WireMode } from "./schema.manual"
import type { W } from "./wire"

export type { I18nText }
/** The app's mode set; the backend's GTFS modes are folded into it by toMode(). */
export type Mode = "bus" | "tram" | "metro" | "rail" | "ferry" | "cable" | "other"
export type NetworkStatus = "active" | "degraded" | "disabled"

export interface NetworkSummary {
	id: string // slug, e.g. "kocaeli-bus"
	numericId: number
	name: string
	operatorName: string | null
	statusMessage: string | null
	modes: Mode[]
	color: string | null
	status: NetworkStatus
}

export interface City {
	id: string // slug, e.g. "kocaeli"
	numericId: number
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
	numberFormat: string | null
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
	id: string // slug
	numericId: number
	cityId: string // city slug ("" when not known yet)
	cityNumericId: number
	name: string
	operatorName: string | null
	modes: Mode[]
	color: string | null
	status: NetworkStatus
	statusMessage: string | null
	timezone: string
	capabilities: Capabilities
	packVersion: string | null
	attribution: { name: string; provider: string; url: string | null }[]
	privacy: { provider: string; pulledData: { key: string; details: string; isCollected: boolean; canOptOut: boolean }[] }[]
	freshness: { staticSyncedAt: string | null; realtimeAt: string | null; mayBeOutdated: boolean }
}

export interface CityManifest {
	city: City
	map: { centre: [number, number]; bbox: [number, number, number, number]; zoom: number }
	networks: Network[]
}

export interface RouteSummary {
	id: string
	networkId: string
	shortName: string
	longName: string
	mode: Mode
	color: string | null
	textColor: string | null
	agency?: string | null
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
	/** Not on the wire yet (backend DepartureSchema has no direction); null when unknown. */
	direction: 0 | 1 | null
	headsign: string
	tripId: string | null
	/** The schedule time, or the prediction when the trip has no scheduled time. */
	scheduledAt: string
	predictedAt: string | null
	vehicleId: string | null
	stopsAway: number | null
	source: "schedule" | "live" | "live_eta"
	cancelled: boolean
}

export interface Departures {
	stop: StopSummary
	stopId: string
	generatedAt: string
	items: Departure[]
}

export interface RouteStop {
	id: string
	name: string
	lat: number
	lon: number
	seq: number
	offsetS: number | null
}

export interface RoutePattern {
	id: string
	headsign: string
	lengthM: number
	stops: RouteStop[]
}

export interface RouteDirection {
	direction: 0 | 1
	headsign: string
	/** The main pattern's stops (the longest pattern of the direction). */
	stops: RouteStop[]
	patterns: RoutePattern[]
}

export interface Route extends RouteSummary {
	agency: string | null
	directions: RouteDirection[]
}

export interface Shape {
	routeId: string
	precision: number
	/** Encoded polylines, one per pattern of the requested direction. */
	polylines: { patternId: string; direction: 0 | 1; polyline: string }[]
}

export type DayType = W["DayType"]
export const DAY_TYPES: DayType[] = ["weekday", "saturday", "sunday"]

export interface TimetableDeparture {
	/** "HH:mm" at the origin, in the network timezone. */
	start: string
	startS: number
	headsign: string
	tripId: string
	patternId: string
}

export interface Timetable {
	routeId: string
	dayType: DayType
	date: string | null
	serviceLabels: string[]
	/** All patterns of the requested direction merged, sorted by start. */
	departures: TimetableDeparture[]
	/** Offsets along the main pattern. */
	stopOffsets: { stopId: string; name: string; offsetS: number | null }[]
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
	/** Masked by the API (r***@example.com); the full address only shows on the account pages. */
	emailMasked: string
	displayName: string
	username: string | null
	avatarInitials: string
}

export interface VehicleRun {
	routeId: string | null
	direction: 0 | 1 | null
	tripId: string | null
	startedAt: string
	endedAt: string | null
	scheduledStart: string | null
	startDelayS: number | null
}

export interface VehicleDetail {
	id: string
	networkId: string
	route: RouteSummary | null
	direction: 0 | 1 | null
	tripId: string | null
	stopId: string | null
	stopSeq: number | null
	plate: string | null
	label: string | null
	accessible: boolean | null
	live: boolean
	lastSeenAt: string
	position: { lat: number; lon: number; bearing: number | null; speedMs: number | null; vehicleTs: number; stale: boolean } | null
	currentRun: VehicleRun | null
	runsToday: VehicleRun[]
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
//
// The backend addresses networks by number in nested objects (network_id: 4) and by slug in URLs;
// the app keys everything by slug. Cities and manifests register the numbers they carry, so later
// mappers can turn a network_id back into a slug; callers that know the network pass it directly.

const networkSlugs = new Map<number, string>()
const cityByNumber = new Map<number, { slug: string; timezone: string }>()

export function rememberNetwork(id: number, slug: string) {
	networkSlugs.set(id, slug)
}

/** Slug for a numeric network id. The API accepts both, so the number is a usable fallback. */
export function networkSlug(id: number, known?: string): string {
	return known ?? networkSlugs.get(id) ?? String(id)
}

const DEFAULT_TZ = "Europe/Istanbul"

/**
 * Some nullable top-level fields of root DTOs are published in openapi.json as `string[]`
 * (a backend export bug; nested ones are correct). At runtime they are a string or null.
 */
function nullable<T extends string | boolean>(v: T | T[] | null | undefined): T | null {
	if (v === null || v === undefined) return null
	if (Array.isArray(v)) return v[0] ?? null
	return v
}

export function toMode(m: WireMode): Mode {
	switch (m) {
		case "bus":
		case "trolleybus":
			return "bus"
		case "tram":
			return "tram"
		case "metro":
		case "monorail":
			return "metro"
		case "rail":
			return "rail"
		case "ferry":
			return "ferry"
		case "cable_tram":
		case "aerial_lift":
		case "funicular":
			return "cable"
		default:
			return "other"
	}
}

const uniqModes = (ms: readonly WireMode[]): Mode[] => [...new Set(ms.map(toMode))]

type LngLat = [number, number]
type BBox4 = [number, number, number, number]

/** City geometry with the gaps filled: a centre from the bbox, or a bbox of ±0.3° around the centre. */
function geometry(c: number[] | null, b: number[] | null): { centre: LngLat; bbox: BBox4 } {
	const centre: LngLat | null = c && c.length >= 2 ? [c[0]!, c[1]!] : null
	const bbox: BBox4 | null = b && b.length >= 4 ? [b[0]!, b[1]!, b[2]!, b[3]!] : null
	if (centre && bbox) return { centre, bbox }
	if (bbox) return { centre: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2], bbox }
	if (centre) return { centre, bbox: [centre[0] - 0.3, centre[1] - 0.3, centre[0] + 0.3, centre[1] + 0.3] }
	return { centre: [0, 0], bbox: [0, 0, 0, 0] }
}

export const toNetworkSummary = (n: W["NetworkSummary"]): NetworkSummary => {
	rememberNetwork(n.id, n.slug)
	return {
		id: n.slug,
		numericId: n.id,
		name: n.name,
		operatorName: n.operator_name,
		statusMessage: n.status_message,
		modes: uniqModes(n.modes),
		color: n.colour,
		status: n.status,
	}
}

export const toCity = (c: W["City"]): City => {
	cityByNumber.set(c.id, { slug: c.slug, timezone: c.timezone })
	return {
		id: c.slug,
		numericId: c.id,
		name: c.name,
		country: c.country_code,
		timezone: c.timezone,
		...geometry(c.centre, c.bbox),
		networks: c.networks.map(toNetworkSummary),
	}
}

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

/** A network from the city manifest (city known) or from GET /v1/networks/:id (city looked up). */
export const toNetwork = (n: W["ManifestNetwork"] | W["Network"], city?: { slug: string; timezone: string }): Network => {
	rememberNetwork(n.id, n.slug)
	const c = city ?? cityByNumber.get(n.city_id)
	return {
		id: n.slug,
		numericId: n.id,
		cityId: c?.slug ?? "",
		cityNumericId: n.city_id,
		name: n.name,
		operatorName: nullable(n.operator_name),
		modes: uniqModes(n.modes),
		color: nullable(n.colour),
		status: n.status,
		statusMessage: nullable(n.status_message),
		timezone: c?.timezone ?? DEFAULT_TZ,
		capabilities: toCapabilities(n.capabilities),
		packVersion: nullable(n.pack_version),
		attribution: n.attribution.map((a) => ({ name: a.name, provider: a.provider, url: a.url })),
		privacy: n.privacy.map((p) => ({
			provider: p.provider,
			pulledData: p.pulled_data.map((d) => ({ key: d.key, details: d.details, isCollected: d.is_collected, canOptOut: d.can_optout })),
		})),
		freshness: {
			staticSyncedAt: n.freshness.static_synced_at,
			realtimeAt: n.freshness.realtime_feed_at,
			mayBeOutdated: n.freshness.static_may_be_outdated,
		},
	}
}

export const toManifest = (m: W["CityManifest"]): CityManifest => {
	const city = toCity({ ...m.city, networks: [] })
	const cityRef = { slug: city.id, timezone: city.timezone }
	const g = geometry(m.map.centre ?? m.city.centre, m.map.bbox ?? m.city.bbox)
	const networks = m.networks.map((n) => toNetwork(n, cityRef))
	return {
		city: {
			...city,
			networks: networks.map((n) => ({
				id: n.id,
				numericId: n.numericId,
				name: n.name,
				operatorName: n.operatorName,
				statusMessage: n.statusMessage,
				modes: n.modes,
				color: n.color,
				status: n.status,
			})),
		},
		map: { ...g, zoom: m.map.initial_zoom },
		networks,
	}
}

export const toRouteSummary = (r: W["RouteSummary"], networkId?: string): RouteSummary => ({
	id: r.id,
	networkId: networkSlug(r.network_id, networkId),
	shortName: r.short_name,
	longName: r.long_name,
	mode: toMode(r.mode),
	color: r.colour,
	textColor: r.text_colour,
	agency: r.agency,
})

export const toStopSummary = (s: W["StopSummary"] & { distance_m?: number }, networkId?: string): StopSummary => ({
	id: s.id,
	networkId: networkSlug(s.network_id, networkId),
	name: s.name,
	code: s.code,
	lat: s.lat,
	lon: s.lon,
	...(s.distance_m !== undefined ? { distanceM: s.distance_m } : {}),
})

export const toStop = (s: W["Stop"], networkId?: string): Stop => {
	const routes = s.routes.map((r) => toRouteSummary(r, networkId))
	return {
		id: s.id,
		networkId: networkSlug(s.network_id, networkId),
		name: s.name,
		code: nullable(s.code),
		lat: s.lat,
		lon: s.lon,
		modes: [...new Set(routes.map((r) => r.mode))],
		routes,
	}
}

/** Null when the departure has neither a scheduled nor a predicted time (nothing to show). */
export const toDeparture = (d: W["Departure"], networkId?: string): Departure | null => {
	const scheduledAt = d.scheduled_at ?? d.predicted_at
	if (!scheduledAt) return null
	const route = toRouteSummary(d.route, networkId)
	return {
		route,
		direction: null,
		headsign: d.headsign ?? route.longName,
		tripId: d.trip_id,
		scheduledAt,
		predictedAt: d.predicted_at,
		vehicleId: d.vehicle_id,
		stopsAway: d.stops_away,
		source: d.source,
		cancelled: d.cancelled,
	}
}

export const toDepartures = (d: W["Departures"], networkId?: string): Departures => ({
	stop: toStopSummary(d.stop, networkId),
	stopId: d.stop.id,
	generatedAt: d.generated_at,
	items: d.items.map((x) => toDeparture(x, networkId)).filter((x): x is Departure => x !== null),
})

const dir01 = (d: number | null | undefined): 0 | 1 | null => (d === 0 || d === 1 ? d : null)

export const toRoute = (r: W["Route"], networkId?: string): Route => {
	const net = networkSlug(r.network_id, networkId)
	return {
		id: r.id,
		networkId: net,
		shortName: r.short_name,
		longName: r.long_name,
		mode: toMode(r.mode),
		color: nullable(r.colour),
		textColor: nullable(r.text_colour),
		agency: nullable(r.agency),
		directions: r.directions
			.filter((d) => d.direction === 0 || d.direction === 1)
			.map((d) => {
				const patterns: RoutePattern[] = d.patterns.map((p) => ({
					id: p.id,
					headsign: p.headsign,
					lengthM: p.length_m,
					stops: [...p.stops]
						.sort((a, b) => a.seq - b.seq)
						.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, seq: s.seq, offsetS: s.offset_s })),
				}))
				const main = [...patterns].sort((a, b) => b.stops.length - a.stops.length || b.lengthM - a.lengthM)[0]
				return {
					direction: d.direction as 0 | 1,
					headsign: d.headsign ?? main?.headsign ?? r.long_name,
					stops: main?.stops ?? [],
					patterns,
				}
			}),
	}
}

export const toShape = (s: W["Shape"], direction?: 0 | 1): Shape => ({
	routeId: s.route_id,
	precision: s.precision,
	polylines: s.shapes
		.filter((x) => direction === undefined || x.direction === direction)
		.map((x) => ({ patternId: x.pattern_id, direction: (x.direction === 1 ? 1 : 0) as 0 | 1, polyline: x.polyline })),
})

export const toTimetable = (t: W["Timetable"], direction?: 0 | 1): Timetable => {
	const patterns = t.patterns.filter((p) => direction === undefined || p.direction === direction)
	const main = [...patterns].sort((a, b) => b.stops.length - a.stops.length)[0]
	return {
		routeId: t.route_id,
		dayType: t.day_type,
		date: nullable(t.date),
		serviceLabels: t.service_labels,
		departures: patterns
			.flatMap((p) =>
				p.departures.map((d) => ({ start: d.start, startS: d.start_s, headsign: d.headsign ?? p.headsign, tripId: d.trip_id, patternId: p.id })),
			)
			.sort((a, b) => a.startS - b.startS),
		stopOffsets: (main?.stops ?? []).map((s) => ({ stopId: s.id, name: s.name, offsetS: s.offset_s })),
	}
}

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
	id: m.user.id,
	emailMasked: m.user.email_masked,
	displayName: m.user.display_name,
	username: m.user.username,
	avatarInitials: m.user.avatar_initials,
})

const toRun = (r: W["VehicleRun"]): VehicleRun => ({
	routeId: r.route_id,
	direction: dir01(r.direction),
	tripId: r.trip_id,
	startedAt: r.started_at,
	endedAt: r.ended_at,
	scheduledStart: r.scheduled_start,
	startDelayS: r.start_delay_s,
})

export const toVehicleDetail = (v: W["Vehicle"], networkId?: string): VehicleDetail => ({
	id: v.id,
	networkId: networkSlug(v.network_id, networkId),
	route: v.route ? toRouteSummary(v.route, networkId) : null,
	direction: dir01(v.direction),
	tripId: nullable(v.trip_id),
	stopId: nullable(v.stop_id),
	stopSeq: v.stop_seq,
	plate: nullable(v.plate),
	label: nullable(v.label),
	accessible: nullable(v.accessible),
	live: v.live,
	lastSeenAt: v.last_seen_at,
	position: v.position
		? {
				lat: v.position.lat,
				lon: v.position.lon,
				bearing: v.position.bearing,
				speedMs: v.position.speed_ms,
				vehicleTs: v.position.vehicle_ts,
				stale: v.position.stale,
			}
		: null,
	currentRun: v.current_run ? toRun(v.current_run) : null,
	runsToday: v.runs_today.map(toRun),
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
		modes: uniqModes(s.modes),
		routeIds: s.route_ids,
	})),
	routes: p.routes.map((r) => ({
		id: r.id,
		shortName: r.short_name,
		longName: r.long_name,
		mode: toMode(r.mode),
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
