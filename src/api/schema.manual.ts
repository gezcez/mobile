// schema.manual.ts
// MANUAL TYPES. The backend rewrite has not published these endpoints in openapi.json yet (app
// config, network pack, alerts, favourites, telemetry, card lookup), so they are typed by hand from
// backend.md (6.5, 6.11) in the same shape openapi-typescript emits. When an endpoint appears in schema.gen.ts, delete it here (client.ts merges both and a
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
/** Route modes as the backend sends them (GTFS route_type names). */
export type WireMode = gen["schemas"]["RouteDetailDto"]["mode"]

export interface ManualSchemas {
	PackStop: { id: string; name: string; code: string | null; lat: number; lon: number; modes: WireMode[]; route_ids: string[] }
	PackDirection: { direction: 0 | 1; headsign: string; stop_ids: string[] }
	PackRoute: {
		id: string
		short_name: string
		long_name: string
		mode: WireMode
		colour: string | null
		text_colour: string | null
		directions: ManualSchemas["PackDirection"][]
	}
	/** backend 6.5: the offline pack of one network (stops, routes, route-stop patterns). */
	Pack: {
		network: string
		pack_version: string
		built_at: string
		stops: ManualSchemas["PackStop"][]
		routes: ManualSchemas["PackRoute"][]
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
	AppConfig: {
		min_supported_version: string
		soft_update_version: string | null
		flags: Record<string, boolean>
		kill_switches: { cards?: boolean; live_map?: boolean; [key: string]: boolean | undefined }
		announcement: { id: string; level: "info" | "warning"; title: I18nText; body: I18nText; url: string | null } | null
		tiles_style_url: { light: string; dark: string }
		ws_url: string
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
	"/v1/networks/{networkId}/pack": Item<Op<never, NetworkPath, S["Pack"], never, { "If-None-Match"?: string }>>
	"/v1/networks/{networkId}/alerts": Item<Op<never, NetworkPath, S["Alert"][]>>
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
