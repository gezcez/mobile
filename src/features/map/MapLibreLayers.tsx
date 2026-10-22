// MapLibreLayers.tsx
// GeoJSON sources and layers drawn on MapLibreMap (import them through layers.tsx): vehicles (SDF marker tinted by route colour,
// rotated by bearing, clustered on the city map), route lines with a navy casing, and stops.

import { GeoJSONSource, Layer, type GeoJSONSourceRef } from "@maplibre/maplibre-react-native"
import type { NativeSyntheticEvent } from "react-native"
import type { Ref } from "react"
import { colorOr } from "@/lib/color"
import { palette } from "@/theme/tokens"
import { useTheme } from "@/theme/theme"
import { MAP_FONT } from "./style"

type PressEvent = NativeSyntheticEvent<{ features: GeoJSON.Feature[] }>

export function VehiclesLayer({
	data,
	clustered,
	onPressVehicle,
	onPressCluster,
	sourceRef,
	id = "vehicles",
	selectedId,
}: {
	data: GeoJSON.FeatureCollection
	clustered?: boolean
	onPressVehicle?: (id: string) => void
	onPressCluster?: (clusterId: number, coordinates: [number, number]) => void
	sourceRef?: Ref<GeoJSONSourceRef>
	id?: string
	selectedId?: string | null
}) {
	const t = useTheme()
	const onPress = (e: PressEvent) => {
		const f = e.nativeEvent.features[0]
		if (!f) return
		const p = f.properties ?? {}
		if (p.cluster && f.geometry.type === "Point") onPressCluster?.(p.cluster_id as number, f.geometry.coordinates as [number, number])
		else if (typeof p.id === "string") onPressVehicle?.(p.id)
	}
	return (
		<GeoJSONSource
			id={id}
			ref={sourceRef}
			data={data}
			cluster={clustered}
			clusterRadius={48}
			clusterMaxZoom={13}
			onPress={onPress}
			hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
		>
			{clustered ? (
				<>
					<Layer
						id={`${id}-clusters`}
						type="circle"
						filter={["has", "point_count"]}
						paint={{
							"circle-color": palette.amber500,
							"circle-radius": ["step", ["get", "point_count"], 16, 20, 20, 100, 26],
							"circle-stroke-width": 2,
							"circle-stroke-color": t.colors.bg,
						}}
					/>
					<Layer
						id={`${id}-cluster-count`}
						type="symbol"
						filter={["has", "point_count"]}
						layout={{ "text-field": ["get", "point_count_abbreviated"], "text-font": MAP_FONT, "text-size": 13, "text-allow-overlap": true }}
						paint={{ "text-color": palette.navy }}
					/>
				</>
			) : null}
			<Layer
				id={`${id}-marker`}
				type="symbol"
				filter={["!", ["has", "point_count"]]}
				layout={{
					"icon-image": "vehicle",
					"icon-size": ["case", ["==", ["get", "id"], selectedId ?? ""], 1.15, 0.8],
					"icon-rotate": ["get", "bearing"],
					"icon-rotation-alignment": "map",
					"icon-allow-overlap": true,
					"icon-ignore-placement": true,
				}}
				paint={{
					"icon-color": ["get", "color"],
					"icon-halo-color": t.colors.bg,
					"icon-halo-width": 1.5,
					"icon-opacity": ["case", ["get", "stale"], 0.45, 1],
				}}
			/>
			<Layer
				id={`${id}-label`}
				type="symbol"
				minzoom={14}
				filter={["!", ["has", "point_count"]]}
				layout={{
					"text-field": ["get", "label"],
					"text-font": MAP_FONT,
					"text-size": 11,
					"text-offset": [0, 1.5],
					"text-allow-overlap": false,
				}}
				paint={{ "text-color": t.colors.ink, "text-halo-color": t.colors.bg, "text-halo-width": 1.5 }}
			/>
		</GeoJSONSource>
	)
}

export function RouteLineLayer({ id, lines, color, dashed }: { id: string; lines: [number, number][][]; color: string; dashed?: boolean }) {
	const t = useTheme()
	const data: GeoJSON.FeatureCollection = {
		type: "FeatureCollection",
		features: lines.map((coordinates, i) => ({ type: "Feature", id: i, properties: {}, geometry: { type: "LineString", coordinates } })),
	}
	const line = colorOr(color, palette.amber600)
	return (
		<GeoJSONSource id={id} data={data}>
			<Layer
				id={`${id}-casing`}
				type="line"
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{ "line-color": t.scheme === "dark" ? palette.navyDeep : palette.navy, "line-width": 8 }}
			/>
			<Layer
				id={`${id}-line`}
				type="line"
				layout={{ "line-cap": "round", "line-join": "round" }}
				paint={{ "line-color": line, "line-width": 5, ...(dashed ? { "line-dasharray": [1.5, 1.5] } : {}) }}
			/>
		</GeoJSONSource>
	)
}

export function StopsLayer({
	id,
	stops,
	minzoom,
	onPressStop,
	highlightId,
}: {
	id: string
	stops: readonly { id: string; networkId: string; name: string; lat: number; lon: number }[]
	minzoom?: number
	onPressStop?: (networkId: string, stopId: string) => void
	highlightId?: string | null
}) {
	const t = useTheme()
	const data: GeoJSON.FeatureCollection = {
		type: "FeatureCollection",
		features: stops.map((s) => ({
			type: "Feature",
			id: `${s.networkId}:${s.id}`,
			properties: { id: s.id, networkId: s.networkId, name: s.name },
			geometry: { type: "Point", coordinates: [s.lon, s.lat] },
		})),
	}
	return (
		<GeoJSONSource
			id={id}
			data={data}
			hitbox={{ top: 10, right: 10, bottom: 10, left: 10 }}
			onPress={(e: PressEvent) => {
				const p = e.nativeEvent.features[0]?.properties
				if (p && typeof p.id === "string" && typeof p.networkId === "string") onPressStop?.(p.networkId, p.id)
			}}
		>
			<Layer
				id={`${id}-circle`}
				type="circle"
				{...(minzoom !== undefined ? { minzoom } : {})}
				paint={{
					"circle-radius": ["case", ["==", ["get", "id"], highlightId ?? ""], 7, 4.5],
					"circle-color": t.colors.surface,
					"circle-stroke-color": t.scheme === "dark" ? palette.amber400 : palette.navy,
					"circle-stroke-width": 2,
				}}
			/>
			<Layer
				id={`${id}-name`}
				type="symbol"
				minzoom={Math.max(minzoom ?? 0, 15.5)}
				layout={{ "text-field": ["get", "name"], "text-font": MAP_FONT, "text-size": 11, "text-offset": [0, 1.2], "text-anchor": "top", "text-optional": true }}
				paint={{ "text-color": t.colors.inkMuted, "text-halo-color": t.colors.bg, "text-halo-width": 1.5 }}
			/>
		</GeoJSONSource>
	)
}
