// schema.manual.ts
// MANUAL TYPES. The backend rewrite has not published these endpoints in openapi.json yet (app
// config, card lookup and history), so they are typed by hand from backend.md in the same shape
// openapi-typescript emits. When an endpoint appears in schema.gen.ts, delete it here (client.ts merges both and a
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
	AppConfig: {
		min_supported_version: string
		soft_update_version: string | null
		flags: Record<string, boolean>
		kill_switches: { cards?: boolean; live_map?: boolean; [key: string]: boolean | undefined }
		announcement: { id: string; level: "info" | "warning"; title: I18nText; body: I18nText; url: string | null } | null
		tiles_style_url: { light: string; dark: string }
		ws_url: string
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
	// Community reports (mobile.md L6). Not in backend.md yet beyond `POST /v1/reports {kind, ref, text}`;
	// shaped here under /v1/me so the bearer token only goes to /v1/me* (security review).
	ReportInput: {
		kind: "crowding" | "delay" | "stop_issue"
		ref: { type: "stop" | "vehicle" | "route"; network_id: string; id: string }
		crowding?: "low" | "medium" | "high" | "full"
		delay_min?: number
		issue?: "damaged" | "shelter" | "sign" | "accessibility" | "dirty" | "other"
		text?: string
	}
	Report: ManualSchemas["ReportInput"] & {
		id: string
		/** pending until a moderator (dashboard) publishes or rejects it. */
		status: "pending" | "published" | "rejected"
		created_at: string
		label: string | null
	}
	ReportList: { items: ManualSchemas["Report"][] }
	/** Aggregated recent crowding reports on one vehicle; null when there are none in the window. */
	VehicleCrowding: {
		level: "low" | "medium" | "high" | "full"
		reports: number
		window_min: number
		updated_at: string
	} | null
}

type S = ManualSchemas
type NetworkPath = { networkId: string }

export type ManualPaths = {
	"/v1/app/config": Item<Op<{ platform: "ios" | "android"; version: string }, never, S["AppConfig"]>>
	"/v1/networks/{networkId}/cards/lookup": Item<never, Op<never, NetworkPath, S["CardLookup"], { card_number: string }>>
	"/v1/networks/{networkId}/cards/history": Item<
		never,
		Op<never, NetworkPath, S["CardHistory"], { card_number: string; month: string }>
	>
	"/v1/me/reports": Item<Op<never, never, S["ReportList"]>, Op<never, never, S["Report"], S["ReportInput"]>>
	"/v1/vehicles/{vehicleId}/crowding": Item<Op<never, { vehicleId: string }, S["VehicleCrowding"]>>
}
