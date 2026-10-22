// fetch.ts
// A fetch implementation that answers every gezcez endpoint from the mock world. Used in mock mode
// (EXPO_PUBLIC_MOCK=1, so screens work with no backend) and in tests. Same envelope, status codes
// and error codes as the real API.

import type { ManualSchemas as W } from "@/api/schema.manual"
import { base64UrlEncode, utf8Encode } from "@/auth/base64"
import {
	networkBySlug,
	wireAlerts,
	wireAppConfig,
	wireCardHistory,
	wireCardLookup,
	wireCities,
	wireDepartures,
	wireManifest,
	wireNearby,
	wireNetwork,
	wirePack,
	wireRoute,
	wireSearch,
	wireShape,
	wireStop,
	wireTimetable,
	wireVehicle,
	wireVehiclesSnapshot,
} from "./data"
import { localClock, type MockDayType } from "./world"

export interface MockOptions {
	now?: () => number
	latencyMs?: number
}

let requestSeq = 0

function ok(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
	return new Response(JSON.stringify({ ok: true, data }), {
		status: init.status ?? 200,
		headers: { "content-type": "application/json", "x-request-id": `mock-${++requestSeq}`, ...init.headers },
	})
}

function fail(status: number, code: string, message = code, details?: Record<string, unknown>): Response {
	const request_id = `mock-${++requestSeq}`
	return new Response(JSON.stringify({ ok: false, error: { code, message, request_id, ...(details ? { details } : {}) } }), {
		status,
		headers: { "content-type": "application/json", "x-request-id": request_id },
	})
}

function fakeJwt(sub: string, nowS: number): string {
	const enc = (o: unknown) => base64UrlEncode(utf8Encode(JSON.stringify(o)))
	return `${enc({ alg: "ES256", typ: "JWT" })}.${enc({ sub, sid: "mock-session", exp: nowS + 900, auth_time: nowS, scope: "openid profile email offline_access transit" })}.mock`
}

/** In-memory favourites document of the mock account (shared by the app's tests through reset). */
let favourites: W["FavouritesDoc"] = { version: 1, updated_at: new Date(0).toISOString(), groups: [], tombstones: [] }

export function resetMockState() {
	favourites = { version: 1, updated_at: new Date(0).toISOString(), groups: [], tombstones: [] }
}

export function createMockFetch(opts: MockOptions = {}): typeof fetch {
	const now = opts.now ?? Date.now
	const latency = opts.latencyMs ?? 0

	return async (input: RequestInfo | URL, init?: RequestInit) => {
		const req = input instanceof Request ? input : new Request(input instanceof URL ? input.href : input, init)
		if (latency > 0) await new Promise((r) => setTimeout(r, latency))
		const url = new URL(req.url)
		const path = url.pathname
		const q = url.searchParams
		const method = req.method.toUpperCase()
		const nowMs = now()
		const authed = (req.headers.get("authorization") ?? "").startsWith("Bearer ")

		// RFC endpoints (no envelope)
		if (path === "/v1/oauth/token" && method === "POST") {
			const body = new URLSearchParams(await req.text())
			if (body.get("grant_type") === "refresh_token" && body.get("refresh_token") === "revoked")
				return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
			return new Response(
				JSON.stringify({
					access_token: fakeJwt("01JMOCKUSER0000000000000000", Math.floor(nowMs / 1000)),
					refresh_token: "mock-refresh-token",
					token_type: "Bearer",
					expires_in: 900,
					scope: "openid profile email offline_access transit",
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			)
		}
		if (path === "/v1/oauth/revoke") return new Response(null, { status: 200 })

		let m: RegExpExecArray | null
		const route = (re: RegExp) => (m = re.exec(path)) !== null

		if (method === "GET") {
			if (path === "/v1/app/config") return ok(wireAppConfig())
			if (path === "/v1/cities") return ok(wireCities())
			if (route(/^\/v1\/cities\/([^/]+)\/manifest$/)) {
				const manifest = wireManifest(decodeURIComponent(m![1]!), nowMs)
				return manifest ? ok(manifest, { headers: { etag: '"mock"' } }) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/networks\/([^/]+)$/)) {
				const n = networkBySlug(decodeURIComponent(m![1]!))
				return n ? ok(wireNetwork(n, nowMs)) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/networks\/([^/]+)\/pack$/)) {
				const pack = wirePack(decodeURIComponent(m![1]!))
				if (!pack) return fail(404, "NOT_FOUND")
				const etag = `"${pack.pack_version}"`
				if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } })
				return ok(pack, { headers: { etag } })
			}
			if (route(/^\/v1\/networks\/([^/]+)\/alerts$/)) return ok(wireAlerts(decodeURIComponent(m![1]!), nowMs))
			if (route(/^\/v1\/networks\/([^/]+)\/vehicles$/)) {
				const slug = decodeURIComponent(m![1]!)
				const n = networkBySlug(slug)
				if (!n) return fail(404, "NOT_FOUND")
				if (!n.realtime) return fail(404, "CAPABILITY_UNSUPPORTED")
				const dir = q.get("direction")
				return ok(
					wireVehiclesSnapshot(n.slug, nowMs, {
						routes: q.get("routes")?.split(",").filter(Boolean),
						direction: dir === "0" ? 0 : dir === "1" ? 1 : undefined,
						bbox: q.get("bbox")?.split(",").map(Number),
					}),
				)
			}
			if (path === "/v1/search") return ok(wireSearch(q.get("q") ?? "", { city: q.get("city") ?? undefined, network: q.get("network") ?? undefined }))
			if (path === "/v1/stops/nearby") {
				const lat = Number(q.get("lat"))
				const lon = Number(q.get("lon"))
				if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fail(400, "VALIDATION_FAILED")
				return ok(wireNearby(lat, lon, Number(q.get("radius") ?? 500), q.get("network") ?? undefined))
			}
			if (route(/^\/v1\/stops\/([^/]+)\/departures$/)) {
				const d = wireDepartures(decodeURIComponent(m![1]!), nowMs, Math.min(50, Number(q.get("limit") ?? 20)))
				return d ? ok(d) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/stops\/([^/]+)$/)) {
				const s = wireStop(decodeURIComponent(m![1]!))
				return s ? ok(s) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/routes\/([^/]+)\/shape$/)) {
				const s = wireShape(decodeURIComponent(m![1]!), q.get("direction") === "1" ? 1 : 0)
				return s ? ok(s) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/routes\/([^/]+)\/timetable$/)) {
				const dt = (q.get("day_type") as MockDayType | null) ?? localClock(nowMs).dayType
				const t = wireTimetable(decodeURIComponent(m![1]!), q.get("direction") === "1" ? 1 : 0, dt)
				return t ? ok(t) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/routes\/([^/]+)$/)) {
				const r = wireRoute(decodeURIComponent(m![1]!))
				return r ? ok(r) : fail(404, "NOT_FOUND")
			}
			if (route(/^\/v1\/vehicles\/([^/]+)$/)) {
				const v = wireVehicle(decodeURIComponent(m![1]!), nowMs)
				return v ? ok(v) : fail(404, "NOT_FOUND")
			}
			if (path === "/v1/me") {
				if (!authed) return fail(401, "AUTH_REQUIRED")
				return ok({
					public_id: "01JMOCKUSER0000000000000000",
					email: "rider@test.gezcez.com",
					display_name: "Demo Rider",
					username: null,
					avatar_url: null,
				} satisfies W["Me"])
			}
			if (path === "/v1/me/favourites") {
				if (!authed) return fail(401, "AUTH_REQUIRED")
				return ok(favourites, { headers: { etag: `"${favourites.version}"` } })
			}
		}

		if (method === "PUT" && path === "/v1/me/favourites") {
			if (!authed) return fail(401, "AUTH_REQUIRED")
			const ifMatch = (req.headers.get("if-match") ?? "").replace(/"/g, "")
			if (ifMatch !== String(favourites.version)) return fail(412, "VERSION_CONFLICT")
			const doc = (await req.json()) as W["FavouritesDoc"]
			favourites = { ...doc, version: favourites.version + 1, updated_at: new Date(nowMs).toISOString() }
			return ok(favourites, { headers: { etag: `"${favourites.version}"` } })
		}

		if (method === "POST") {
			if (path === "/v1/telemetry/counters") return ok({ accepted: true })
			if (route(/^\/v1\/networks\/([^/]+)\/cards\/(lookup|history)$/)) {
				const n = networkBySlug(decodeURIComponent(m![1]!))
				if (!n) return fail(404, "NOT_FOUND")
				if (!n.card) return fail(404, "CAPABILITY_UNSUPPORTED")
				const body = (await req.json()) as { card_number?: string; month?: string }
				const number = (body.card_number ?? "").replace(/\s/g, "")
				if (!/^[0-9]{10,16}$/.test(number)) return fail(400, "VALIDATION_FAILED")
				if (m![2] === "lookup") {
					const r = wireCardLookup(number, nowMs)
					return r ? ok(r) : fail(404, "CARD_NOT_FOUND")
				}
				const h = wireCardHistory(number, body.month ?? new Date(nowMs).toISOString().slice(0, 7), nowMs)
				return h ? ok(h) : fail(404, "CARD_NOT_FOUND")
			}
		}

		return fail(404, "NOT_FOUND", `mock: no handler for ${method} ${path}`)
	}
}
