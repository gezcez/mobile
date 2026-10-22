import { api, unwrap } from "./client"
import { GezcezApiError } from "./errors"
import {
	citiesQuery,
	cityManifestQuery,
	departuresQuery,
	routeQuery,
	searchQuery,
	shapeQuery,
	stopQuery,
	timetableQuery,
} from "./queries/transit"
import type { Departures, Route, Shape, Timetable } from "./types"
import { networkSlug } from "./types"
import type { ServerErrorCode } from "./errors"
import { errors as en } from "@/i18n/en/errors"
import { errors as tr } from "@/i18n/tr/errors"
import { setTransportFetch } from "@/lib/transport"
import { createMockFetch } from "@/mock/fetch"

// Fixed clock: a Wednesday, 08:00 in Istanbul.
const NOW = Date.parse("2026-10-21T05:00:00Z")
setTransportFetch(createMockFetch({ now: () => NOW }))

const run = <T,>(o: { queryFn?: unknown }) => (o.queryFn as (ctx: unknown) => Promise<T>)({})

describe("api client over the mock backend", () => {
	it("unwraps the envelope and maps snake_case to domain types", async () => {
		const cities = await run<Awaited<ReturnType<NonNullable<ReturnType<typeof citiesQuery>["queryFn"]>>>>(citiesQuery())
		const kocaeli = cities.find((c) => c.id === "kocaeli")!
		expect(kocaeli.centre).toEqual([29.9408, 40.7655])
		expect(kocaeli.networks.map((n) => n.id)).toEqual(["kocaeli-bus", "kocaeli-ferry"])

		const manifest = await run<{ networks: { id: string; capabilities: { realtimeVehicles: boolean; card: unknown } }[] }>(
			cityManifestQuery("kocaeli"),
		)
		expect(manifest.networks[0]!.capabilities.realtimeVehicles).toBe(true)
		expect(manifest.networks[1]!.capabilities.card).toBeNull()
	})

	it("serves stops, routes and departures with stable ids", async () => {
		const route = await run<{ shortName: string; directions: { stops: { id: string }[] }[] }>(routeQuery("kocaeli-bus", "4.41265"))
		expect(route.shortName).toBe("41C")
		const firstStop = route.directions[0]!.stops[0]!.id
		const stop = await run<{ routes: { id: string }[] }>(stopQuery("kocaeli-bus", firstStop))
		expect(stop.routes.map((r) => r.id)).toContain("4.41265")
		const deps = await run<{ items: { source: string; scheduledAt: string }[] }>(departuresQuery("kocaeli-bus", firstStop, 10))
		expect(deps.items.length).toBeGreaterThan(0)
		expect(deps.items.length).toBeLessThanOrEqual(10)
	})

	it("maps the backend's numeric network ids back to slugs", async () => {
		await run(citiesQuery())
		expect(networkSlug(1)).toBe("kocaeli-bus")
		const found = await run<{ routes: { networkId: string; shortName: string }[] }>(searchQuery("41", { city: "kocaeli" }))
		expect(found.routes[0]!.networkId).toBe("kocaeli-bus")
	})

	it("picks the main pattern per direction and merges timetable patterns", async () => {
		const route = await run<Route>(routeQuery("kocaeli-bus", "4.41265"))
		const d0 = route.directions.find((d) => d.direction === 0)!
		expect(d0.stops.map((s) => s.seq)).toEqual(d0.stops.map((_, i) => i + 1))
		expect(d0.patterns).toHaveLength(1)
		const shape = await run<Shape>(shapeQuery("kocaeli-bus", "4.41265", 1))
		expect(shape.polylines.map((p) => p.direction)).toEqual([1])
		const tt = await run<Timetable>(timetableQuery("kocaeli-bus", "4.41265", 0, { dayType: "saturday" }))
		expect(tt.dayType).toBe("saturday")
		expect(tt.departures.length).toBeGreaterThan(10)
		expect(tt.departures[0]!.start).toMatch(/^\d\d:\d\d$/)
		expect(tt.stopOffsets[0]!.offsetS).toBe(0)
	})

	it("keeps departures without a direction and with a headsign", async () => {
		const deps = await run<Departures>(departuresQuery("kocaeli-bus", "4.41001", 5))
		expect(deps.stop.networkId).toBe("kocaeli-bus")
		for (const d of deps.items) {
			expect(d.direction).toBeNull()
			expect(d.headsign.length).toBeGreaterThan(0)
		}
	})

	it("throws GezcezApiError with the server code and request id", async () => {
		await expect(unwrap(api.GET("/v1/stops/{stopId}", { params: { path: { stopId: "nope" } } }))).rejects.toMatchObject({
			code: "NOT_FOUND",
			status: 404,
		})
		const e = await unwrap(api.GET("/v1/me")).catch((x: unknown) => x)
		expect(e).toBeInstanceOf(GezcezApiError)
		expect((e as GezcezApiError).requestId).toMatch(/^mock-/)
	})

	it("turns a failed fetch into NETWORK", async () => {
		setTransportFetch(async () => {
			throw new TypeError("Network request failed")
		})
		await expect(unwrap(api.GET("/v1/cities"))).rejects.toMatchObject({ code: "NETWORK" })
		setTransportFetch(createMockFetch({ now: () => NOW }))
	})
})

describe("error catalog", () => {
	it("has a tr and en message for every server error code", () => {
		// The list is the generated ErrorCode union; this object fails typecheck when a code is missing.
		const all: Record<ServerErrorCode, true> = {
			VALIDATION_FAILED: true, AUTH_REQUIRED: true, AUTH_SESSION_REQUIRED: true, AUTH_TOKEN_INVALID: true,
			AUTH_TOKEN_EXPIRED: true, AUTH_SESSION_REVOKED: true, AUTH_CODE_INVALID: true, AUTH_CODE_EXPIRED: true,
			AUTH_CODE_ATTEMPTS: true, AUTH_PASSWORD_INVALID: true, AUTH_PASSWORD_WEAK: true, AUTH_PASSWORD_BREACHED: true,
			AUTH_TURNSTILE_FAILED: true, AUTH_STEP_UP_REQUIRED: true, CSRF_INVALID: true, OAUTH_INVALID_CLIENT: true,
			OAUTH_INVALID_REDIRECT_URI: true, OAUTH_REQUEST_EXPIRED: true, OAUTH_REQUEST_NOT_FOUND: true, SCOPE_MISSING: true,
			PERMISSION_MISSING: true, ROLE_LEVEL_TOO_LOW: true, ROLE_IMMUTABLE: true, USER_BANNED: true,
			USER_PENDING_DELETION: true, USER_DELETED: true, EMAIL_TAKEN: true, USERNAME_TAKEN: true, NOT_FOUND: true,
			CONFLICT: true, VERSION_CONFLICT: true, RATE_LIMITED: true, PROVIDER_DISABLED: true, PROVIDER_UNAVAILABLE: true,
			CAPABILITY_UNSUPPORTED: true, CARD_NOT_FOUND: true, ANALYTICS_TIMEOUT: true, INTERNAL: true,
		}
		for (const code of Object.keys(all) as ServerErrorCode[]) {
			expect(en[code]).toBeTruthy()
			expect(tr[code]).toBeTruthy()
		}
	})
})
