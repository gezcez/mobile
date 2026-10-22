// schema.manual.ts
// MANUAL TYPES. The backend rewrite has not published these endpoints in openapi.json yet, so they
// are typed by hand from backend.md (6.5, 6.10, 6.11, 7.3, 7.4) in the same shape openapi-typescript
// emits. When an endpoint appears in schema.gen.ts, delete it here (client.ts merges both and a
// duplicate key becomes a type error in schema.check.ts).
//
// Wire format is snake_case; src/api/types.ts maps to the camelCase domain types.

import type { components as gen } from "./schema.gen"

type ApiError = gen["schemas"]["ApiError"]

type Ok<T> = { ok: true; data: T }
type ErrorResponses = {
	default: { headers: { [name: string]: unknown }; content: { "application/json": { ok: false; error: ApiError } } }
}
type JsonOk<T> = {
	200: { headers: { [name: string]: unknown }; content: { "application/json": Ok<T> } }
}
type Params<Q, P, H = never> = ([Q] extends [never]
	? { query?: never }
	: undefined extends Q
		? { query?: Exclude<Q, undefined> }
		: { query: Q }) &
	([P] extends [never] ? { path?: never } : { path: P }) &
	([H] extends [never] ? { header?: never } : { header?: H }) & { cookie?: never }
type Op<Q, P, R, B = never, H = never> = {
	parameters: Params<Q, P, H>
	responses: JsonOk<R> & ErrorResponses
} & ([B] extends [never] ? { requestBody?: never } : { requestBody: { content: { "application/json": B } } })
type Method<M> = [M] extends [never] ? never : M
type Item<Get = never, Post = never, Put = never> = {
	parameters: { query?: never; header?: never; path?: never; cookie?: never }
	delete?: never
	options?: never
	head?: never
	patch?: never
	trace?: never
} & ([Get] extends [never] ? { get?: never } : { get: Method<Get> }) &
	([Post] extends [never] ? { post?: never } : { post: Method<Post> }) &
	([Put] extends [never] ? { put?: never } : { put: Method<Put> })

export type I18nText = { tr: string; en: string }
export type Mode = "bus" | "tram" | "metro" | "rail" | "ferry" | "cable" | "other"
export type NetworkStatus = "active" | "degraded" | "disabled"
export type LngLatTuple = [number, number]
export type BBox = [number, number, number, number]

export interface ManualSchemas {
	NetworkSummary: {
		id: number
		slug: string
		name: string
		modes: Mode[]
		colour: string | null
		status: NetworkStatus
	}
	City: {
		id: number
		slug: string
		name: I18nText
		country_code: string
		timezone: string
		centre: LngLatTuple
		bbox: BBox
		networks: ManualSchemas["NetworkSummary"][]
	}
	CardCapability: {
		balance: boolean
		history: boolean
		requires_provider_account: boolean
		number_format: string
		label: I18nText
	}
	Capabilities: {
		stops: boolean
		routes: boolean
		timetables: boolean
		shapes: boolean
		realtime_vehicles: boolean
		realtime_departures: "none" | "estimated" | "live"
		trip_updates: boolean
		alerts: boolean
		card: ManualSchemas["CardCapability"] | null
		trip_planner: boolean
		bike_share: boolean
	}
	PulledData: { key: string; label: I18nText; can_optout: boolean }
	Network: {
		id: number
		slug: string
		city_slug: string
		name: string
		operator_name: string | null
		modes: Mode[]
		colour: string | null
		status: NetworkStatus
		status_message: string | null
		timezone: string
		capabilities: ManualSchemas["Capabilities"]
		pack_version: string | null
		attribution: { text: string; url: string | null; licence: string | null; unofficial: boolean }
		privacy: { providers: { name: string; pulled_data: ManualSchemas["PulledData"][]; optout_url: string | null }[] }
		freshness: { static_synced_at: string | null; realtime_at: string | null }
		map: { centre: LngLatTuple; zoom: number }
	}
	CityManifest: {
		city: ManualSchemas["City"]
		networks: ManualSchemas["Network"][]
	}
	PackStop: { id: string; name: string; code: string | null; lat: number; lon: number; modes: Mode[]; route_ids: string[] }
	PackDirection: { direction: 0 | 1; headsign: string; stop_ids: string[] }
	PackRoute: {
		id: string
		short_name: string
		long_name: string
		mode: Mode
		colour: string | null
		text_colour: string | null
		directions: ManualSchemas["PackDirection"][]
	}
	Pack: {
		network: string
		pack_version: string
		built_at: string
		stops: ManualSchemas["PackStop"][]
		routes: ManualSchemas["PackRoute"][]
	}
	RouteSummary: {
		id: string
		network: string
		short_name: string
		long_name: string
		mode: Mode
		colour: string | null
		text_colour: string | null
	}
	StopSummary: {
		id: string
		network: string
		name: string
		code: string | null
		lat: number
		lon: number
		distance_m?: number
	}
	Stop: ManualSchemas["StopSummary"] & {
		modes: Mode[]
		routes: ManualSchemas["RouteSummary"][]
	}
	Departure: {
		route: ManualSchemas["RouteSummary"]
		direction: 0 | 1
		headsign: string
		scheduled_at: string
		predicted_at: string | null
		vehicle_id: string | null
		stops_away: number | null
		source: "schedule" | "live" | "live_eta"
		cancelled: boolean
	}
	Departures: { stop: string; generated_at: string; items: ManualSchemas["Departure"][] }
	RouteStop: { id: string; name: string; code: string | null; lat: number; lon: number; offset_s: number | null }
	RouteDirection: { direction: 0 | 1; headsign: string; stops: ManualSchemas["RouteStop"][] }
	Route: ManualSchemas["RouteSummary"] & {
		agency: string | null
		directions: ManualSchemas["RouteDirection"][]
	}
	Shape: { route: string; direction: 0 | 1; polyline: string; precision: number }
	DayType: "weekday" | "saturday" | "sunday"
	Timetable: {
		route: string
		direction: 0 | 1
		date: string | null
		day_type: ManualSchemas["DayType"]
		day_types: { key: ManualSchemas["DayType"]; label: I18nText }[]
		timezone: string
		/** Start times at the origin stop, "HH:mm" in the network timezone. */
		starts: string[]
		stop_offsets: { stop_id: string; offset_s: number }[]
	}
	/** Compact vehicle row, order given by `fields` (backend 6.10). */
	VehicleRow: [
		id: string,
		lat: number,
		lon: number,
		bearing: number | null,
		speed_ms: number | null,
		route_id: string | null,
		direction: 0 | 1 | null,
		trip_id: string | null,
		stop_seq: number | null,
		status: string | null,
		vehicle_ts: number,
		flags: number,
		...full: (string | null)[],
	]
	VehiclesSnapshot: {
		network: string
		feed_ts: number
		fields: string[]
		vehicles: ManualSchemas["VehicleRow"][]
	}
	Vehicle: {
		id: string
		network: string
		route: ManualSchemas["RouteSummary"] | null
		direction: 0 | 1 | null
		headsign: string | null
		lat: number
		lon: number
		bearing: number | null
		speed_ms: number | null
		plate: string | null
		accessible: boolean
		vehicle_ts: number
		stop_seq: number | null
	}
	Alert: {
		id: string
		title: string
		body: string
		severity: "info" | "warning" | "severe"
		route_ids: string[]
		active_from: string
		active_to: string | null
		url: string | null
	}
	Search: { routes: ManualSchemas["RouteSummary"][]; stops: ManualSchemas["StopSummary"][] }
	AppConfig: {
		min_supported_version: string
		soft_update_version: string | null
		flags: Record<string, boolean>
		kill_switches: { cards?: boolean; live_map?: boolean; [key: string]: boolean | undefined }
		announcement: { id: string; level: "info" | "warning"; title: I18nText; body: I18nText; url: string | null } | null
		tiles_style_url: { light: string; dark: string }
		ws_url: string
	}
	Me: {
		public_id: string
		email: string
		display_name: string | null
		username: string | null
		avatar_url: string | null
	}
	FavouriteItem: {
		id: string
		kind: "stop" | "route"
		network_id: string
		ref_id: string
		label: string
		direction?: 0 | 1
		added_at: string
		updated_at?: string
	}
	FavouriteGroup: {
		id: string
		name: string
		colour: "amber" | "navy" | "teal" | "rose" | "violet" | "green" | "orange" | "slate"
		position: number
		updated_at?: string
		items: ManualSchemas["FavouriteItem"][]
	}
	FavouritesDoc: {
		version: number
		updated_at: string
		groups: ManualSchemas["FavouriteGroup"][]
		tombstones: { id: string; deleted_at: string }[]
	}
	TelemetryCounters: {
		day: string
		platform: "ios" | "android"
		app_version: string
		city: string | null
		counters: Record<string, number>
	}
	CardLookup: { balance: number; currency: string; as_of: string; card_type: string | null }
	CardTransaction: {
		at: string
		kind: "boarding" | "topup" | "transfer" | "other"
		amount: number
		balance_after: number | null
		route_short_name: string | null
	}
	CardHistory: { month: string; currency: string; items: ManualSchemas["CardTransaction"][] }
}

type S = ManualSchemas
type NetworkPath = { networkId: string }

export type ManualPaths = {
	"/v1/app/config": Item<Op<{ platform: "ios" | "android"; version: string }, never, S["AppConfig"]>>
	"/v1/cities": Item<Op<never, never, S["City"][]>>
	"/v1/cities/{slug}/manifest": Item<Op<never, { slug: string }, S["CityManifest"]>>
	"/v1/networks/{networkId}": Item<Op<never, NetworkPath, S["Network"]>>
	"/v1/networks/{networkId}/pack": Item<Op<never, NetworkPath, S["Pack"], never, { "If-None-Match"?: string }>>
	"/v1/networks/{networkId}/alerts": Item<Op<never, NetworkPath, S["Alert"][]>>
	"/v1/networks/{networkId}/vehicles": Item<
		Op<{ routes?: string; direction?: 0 | 1; bbox?: string } | undefined, NetworkPath, S["VehiclesSnapshot"]>
	>
	"/v1/search": Item<Op<{ city?: string; network?: string; q: string }, never, S["Search"]>>
	"/v1/stops/nearby": Item<
		Op<{ lat: number; lon: number; radius?: number; network?: string }, never, S["StopSummary"][]>
	>
	"/v1/stops/{stopId}": Item<Op<never, { stopId: string }, S["Stop"]>>
	"/v1/stops/{stopId}/departures": Item<Op<{ limit?: number } | undefined, { stopId: string }, S["Departures"]>>
	"/v1/routes/{routeId}": Item<Op<never, { routeId: string }, S["Route"]>>
	"/v1/routes/{routeId}/shape": Item<Op<{ direction: 0 | 1 }, { routeId: string }, S["Shape"]>>
	"/v1/routes/{routeId}/timetable": Item<
		Op<{ direction: 0 | 1; date?: string; day_type?: S["DayType"] }, { routeId: string }, S["Timetable"]>
	>
	"/v1/vehicles/{vehicleId}": Item<Op<never, { vehicleId: string }, S["Vehicle"]>>
	"/v1/me": Item<Op<never, never, S["Me"]>>
	"/v1/me/favourites": Item<
		Op<never, never, S["FavouritesDoc"]>,
		never,
		Op<never, never, S["FavouritesDoc"], S["FavouritesDoc"], { "If-Match": string }>
	>
	"/v1/telemetry/counters": Item<never, Op<never, never, { accepted: boolean }, S["TelemetryCounters"]>>
	"/v1/networks/{networkId}/cards/lookup": Item<never, Op<never, NetworkPath, S["CardLookup"], { card_number: string }>>
	"/v1/networks/{networkId}/cards/history": Item<
		never,
		Op<never, NetworkPath, S["CardHistory"], { card_number: string; month: string }>
	>
}
