// schema.manual.ts
// MANUAL TYPES for endpoints the backend has not published in openapi.json yet, typed by hand in
// the shape openapi-typescript emits. Empty now: every endpoint the app calls is generated. When a
// new endpoint is needed before the backend publishes it, add it to ManualPaths with the Op/Item
// helpers below (client.ts merges both; a duplicate key becomes a type error there).

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

/** Hand-typed wire schemas (none today). */
export type ManualSchemas = Record<never, never>

/** Hand-typed paths (none today). Example: "/v1/x": Item<Op<never, never, ManualSchemas["X"]>> */
export type ManualPaths = Record<never, never>

/** Keeps the helpers type-checked while no endpoint uses them. */
export type ManualOp<Q, P, R, B = never, H = never> = Item<Op<Q, P, R, B, H>>
