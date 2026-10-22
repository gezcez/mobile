// geojson.ts
// Map data built from live vehicles; pure, so it loads in Expo Go and in tests without MapLibre.

import type { LiveVehicle } from "@/live/protocol"
import { freshness } from "@/live/protocol"

export interface RouteStyle {
	shortName: string
	color: string
}

export function vehiclesGeoJSON(vehicles: readonly LiveVehicle[], routes: ReadonlyMap<string, RouteStyle>, nowMs: number, fallbackColor: string): GeoJSON.FeatureCollection {
	const features: GeoJSON.Feature[] = []
	for (const v of vehicles) {
		const f = freshness(v, nowMs)
		if (f === "hidden") continue
		const r = v.routeId ? routes.get(v.routeId) : undefined
		features.push({
			type: "Feature",
			id: v.id,
			geometry: { type: "Point", coordinates: [v.lon, v.lat] },
			properties: {
				id: v.id,
				bearing: v.bearing ?? 0,
				hasBearing: v.bearing !== null,
				color: r?.color ?? fallbackColor,
				label: r?.shortName ?? "",
				stale: f === "stale",
			},
		})
	}
	return { type: "FeatureCollection", features }
}
