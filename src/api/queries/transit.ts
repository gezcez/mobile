// queryOptions factories for the public transit endpoints. Keys always start with the network
// (['net', networkId, ...]) so switching cities never mixes caches.

import { queryOptions } from "@tanstack/react-query"
import { Platform } from "react-native"
import { env } from "@/lib/env"
import { api, unwrap } from "../client"
import {
	toAlert,
	toAppConfig,
	toCity,
	toDepartures,
	toManifest,
	toNetwork,
	toRoute,
	toShape,
	toStop,
	toStopSummary,
	toRouteSummary,
	toTimetable,
	toVehicleDetail,
	type DayType,
} from "../types"

const MIN = 60_000
const HOUR = 60 * MIN

export const appConfigQuery = () =>
	queryOptions({
		queryKey: ["app", "config"],
		queryFn: async () =>
			toAppConfig(
				await unwrap(
					api.GET("/v1/app/config", {
						params: { query: { platform: Platform.OS === "ios" ? "ios" : "android", version: env.appVersion } },
					}),
				),
			),
		staleTime: 15 * MIN,
		meta: { persist: true },
	})

export const citiesQuery = () =>
	queryOptions({
		queryKey: ["cities"],
		queryFn: async () => (await unwrap(api.GET("/v1/cities"))).map(toCity),
		staleTime: 24 * HOUR,
		meta: { persist: true },
	})

export const cityManifestQuery = (citySlug: string) =>
	queryOptions({
		queryKey: ["city", citySlug, "manifest"],
		queryFn: async () => {
			return toManifest(await unwrap(api.GET("/v1/cities/{slug}/manifest", { params: { path: { slug: citySlug } } })))
		},
		staleTime: HOUR,
		meta: { persist: true },
	})

export const networkQuery = (networkId: string) =>
	queryOptions({
		queryKey: ["net", networkId],
		queryFn: async () =>
			toNetwork(await unwrap(api.GET("/v1/networks/{networkId}", { params: { path: { networkId } } }))),
		staleTime: HOUR,
		meta: { persist: true },
	})

export const stopQuery = (networkId: string, stopId: string) =>
	queryOptions({
		queryKey: ["net", networkId, "stop", stopId],
		queryFn: async () => toStop(await unwrap(api.GET("/v1/stops/{stopId}", { params: { path: { stopId } } })), networkId),
		staleTime: 6 * HOUR,
		meta: { persist: true },
	})

export const departuresQuery = (networkId: string, stopId: string, limit = 30) =>
	queryOptions({
		queryKey: ["net", networkId, "stop", stopId, "departures", limit],
		queryFn: async () =>
			toDepartures(
				await unwrap(
					api.GET("/v1/stops/{stopId}/departures", { params: { path: { stopId }, query: { limit } } }),
				),
				networkId,
			),
		staleTime: 15_000,
		// The last answer is kept on disk for the offline "as of" display.
		meta: { persist: true },
	})

export const routeQuery = (networkId: string, routeId: string) =>
	queryOptions({
		queryKey: ["net", networkId, "route", routeId],
		queryFn: async () => toRoute(await unwrap(api.GET("/v1/routes/{routeId}", { params: { path: { routeId } } })), networkId),
		staleTime: 6 * HOUR,
		meta: { persist: true },
	})

export const shapeQuery = (networkId: string, routeId: string, direction: 0 | 1) =>
	queryOptions({
		queryKey: ["net", networkId, "route", routeId, "shape", direction],
		queryFn: async () =>
			toShape(
				await unwrap(
					api.GET("/v1/routes/{routeId}/shape", { params: { path: { routeId }, query: { direction } } }),
				),
				direction,
			),
		staleTime: 7 * 24 * HOUR,
		meta: { persist: true },
	})

export const timetableQuery = (
	networkId: string,
	routeId: string,
	direction: 0 | 1,
	sel: { date?: string; dayType?: DayType },
) =>
	queryOptions({
		queryKey: ["net", networkId, "route", routeId, "timetable", direction, sel.dayType ?? sel.date ?? "today"],
		queryFn: async () =>
			toTimetable(
				await unwrap(
					api.GET("/v1/routes/{routeId}/timetable", {
						params: { path: { routeId }, query: { direction, date: sel.date, day_type: sel.dayType } },
					}),
				),
				direction,
			),
		staleTime: 6 * HOUR,
		meta: { persist: true },
	})

export const alertsQuery = (networkId: string) =>
	queryOptions({
		queryKey: ["net", networkId, "alerts"],
		queryFn: async () =>
			(await unwrap(api.GET("/v1/networks/{networkId}/alerts", { params: { path: { networkId } } }))).map(toAlert),
		staleTime: 5 * MIN,
		meta: { persist: true },
	})

export const vehicleQuery = (networkId: string, vehicleId: string) =>
	queryOptions({
		queryKey: ["net", networkId, "vehicle", vehicleId],
		queryFn: async () =>
			toVehicleDetail(await unwrap(api.GET("/v1/vehicles/{vehicleId}", { params: { path: { vehicleId } } })), networkId),
		staleTime: 5_000,
	})

export const searchQuery = (q: string, scope: { city?: string; network?: string }) =>
	queryOptions({
		queryKey: ["search", scope.city ?? "", scope.network ?? "", q],
		queryFn: async () => {
			const r = await unwrap(api.GET("/v1/search", { params: { query: { q, ...scope } } }))
			return { routes: r.routes.map((x) => toRouteSummary(x)), stops: r.stops.map((x) => toStopSummary(x)) }
		},
		staleTime: 5 * MIN,
		enabled: q.trim().length > 0,
	})

/** Fallback nearby (pack missing). Coordinates are rounded to 3 decimals (~100 m) before they leave. */
export const nearbyFallbackQuery = (lat: number, lon: number, network: string, radius = 600) => {
	const rLat = Math.round(lat * 1000) / 1000
	const rLon = Math.round(lon * 1000) / 1000
	return queryOptions({
		queryKey: ["net", network, "nearby", rLat, rLon, radius],
		queryFn: async () =>
			(
				await unwrap(api.GET("/v1/stops/nearby", { params: { query: { lat: rLat, lon: rLon, radius, network } } }))
			).items.map((s) => toStopSummary(s, network)),
		staleTime: 5 * MIN,
	})
}
