// City live map (plan 5.3): every realtime network of the current city on one clustered map
// (whole network below zoom 12, a snapped bbox above), stops from the packs from zoom 15, mode
// chips, search pill, recentre, and a sheet with the vehicles in view or the selected vehicle.

import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import type { CameraRef, GeoJSONSourceRef } from "@maplibre/maplibre-react-native"
import { router } from "expo-router"
import { ChevronRight, Crosshair, LocateFixed, Search } from "lucide-react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { Mode } from "@/api/types"
import { feedBbox, inBounds, type Bounds } from "@/features/map/bbox"
import { StopsLayer, VehiclesLayer, vehiclesGeoJSON, type RouteStyle } from "@/features/map/layers"
import { TransitMap } from "@/features/map/TransitMap"
import { NetworkVehicles, useMapVehiclesStore, type MapVehicle } from "@/features/map/useMapVehicles"
import { capabilityOn, useAppConfig, useCurrentCity, useCurrentNetworks } from "@/features/network/hooks"
import { OfflineBanner } from "@/features/network/StatusBanners"
import { pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { colorOr } from "@/lib/color"
import { getFix, requestPermission, useLocationStore } from "@/lib/location"
import { useAgoText } from "@/lib/useAgoText"
import { useNow } from "@/lib/useNow"
import { LIMITS, type LiveVehicle } from "@/live/protocol"
import { useTweenedVehicles } from "@/live/tween"
import { usePackIndexes } from "@/pack/packStore"
import { useTheme } from "@/theme/theme"
import { Banner } from "@/ui/Banner"
import { Button, IconButton } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Chip } from "@/ui/Chip"
import { Divider, ListRow } from "@/ui/ListRow"
import { LiveDot, useReduceMotion } from "@/ui/LiveDot"
import { RouteBadge } from "@/ui/RouteBadge"
import { EmptyState } from "@/ui/States"
import { Heading, Text } from "@/ui/Text"

/** Vehicle and route keys are namespaced by network: two networks can reuse an id. */
const SEP = "|"
const keyOf = (networkId: string, id: string) => `${networkId}${SEP}${id}`
const splitKey = (key: string): [string, string] => {
	const i = key.indexOf(SEP)
	return [key.slice(0, i), key.slice(i + 1)]
}

const STOPS_MINZOOM = 15
const MAX_STOPS = 600
const MAX_LIST = 60

interface View2 {
	zoom: number
	bounds: Bounds | null
}

export default function MapScreen() {
	const { t } = useT()
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const now = useNow()
	const agoText = useAgoText()
	const reduceMotion = useReduceMotion()
	const city = useCurrentCity().data
	const { networks } = useCurrentNetworks()
	const config = useAppConfig().data
	const liveMapOn = config?.killSwitches.liveMap !== false
	const fix = useLocationStore((s) => s.fix)
	const camera = useRef<CameraRef>(null)
	const vehicleSource = useRef<GeoJSONSourceRef>(null)

	const [view, setView] = useState<View2>({ zoom: 11, bounds: null })
	const [modes, setModes] = useState<Mode[]>([])
	const [selected, setSelected] = useState<string | null>(null)
	const [follow, setFollow] = useState(false)

	const liveNetworks = useMemo(
		() => (liveMapOn ? networks.filter((n) => capabilityOn(n, "realtimeVehicles")).slice(0, LIMITS.maxSubs) : []),
		[networks, liveMapOn],
	)
	const noLive = networks.filter((n) => !capabilityOn(n, "realtimeVehicles"))
	const bbox = feedBbox(view.zoom, view.bounds)

	const { indexes } = usePackIndexes(networks)
	const routeInfo = useMemo(() => {
		const m = new Map<string, RouteStyle & { mode: Mode; textColor: string | null; rawColor: string | null; longName: string; directions: { direction: 0 | 1; headsign: string; stopIds: string[] }[] }>()
		for (const idx of indexes)
			for (const r of idx.routes)
				m.set(keyOf(idx.networkId, r.id), {
					shortName: r.shortName,
					color: colorOr(r.color, theme.colors.accent),
					rawColor: r.color,
					textColor: r.textColor,
					mode: r.mode,
					longName: r.longName,
					directions: r.directions,
				})
		return m
	}, [indexes, theme.colors.accent])
	const availableModes = useMemo(() => [...new Set([...routeInfo.values()].map((r) => r.mode))], [routeInfo])

	const byNetwork = useMapVehiclesStore((s) => s.byNetwork)
	const merged = useMemo(() => {
		const out: MapVehicle[] = []
		for (const n of liveNetworks) {
			const entry = byNetwork[n.id]
			if (!entry) continue
			for (const v of entry.vehicles) {
				const route = v.routeId ? routeInfo.get(keyOf(n.id, v.routeId)) : undefined
				if (modes.length && (!route || !modes.includes(route.mode))) continue
				out.push({ ...v, id: keyOf(n.id, v.id), routeId: v.routeId ? keyOf(n.id, v.routeId) : null })
			}
		}
		return out
	}, [liveNetworks, byNetwork, routeInfo, modes])
	const tweened = useTweenedVehicles(merged, reduceMotion)
	const geo = useMemo(() => vehiclesGeoJSON(tweened, routeInfo, now, theme.colors.accent), [tweened, routeInfo, now, theme.colors.accent])
	const receivedAt = Math.max(0, ...liveNetworks.map((n) => byNetwork[n.id]?.receivedAt ?? 0)) || null
	const emptyLive = liveNetworks.filter((n) => byNetwork[n.id]?.receivedAt && byNetwork[n.id]!.vehicles.length === 0)

	const inView = useMemo(
		() =>
			merged
				.filter((v) => inBounds(v, view.bounds))
				.sort((a, b) => (routeInfo.get(a.routeId ?? "")?.shortName ?? "~").localeCompare(routeInfo.get(b.routeId ?? "")?.shortName ?? "~", undefined, { numeric: true })),
		[merged, view.bounds, routeInfo],
	)
	const stops = useMemo(() => {
		if (view.zoom < STOPS_MINZOOM || !view.bounds) return []
		const out: { id: string; networkId: string; name: string; lat: number; lon: number }[] = []
		for (const idx of indexes)
			for (const s of idx.stops) {
				if (out.length >= MAX_STOPS) break
				if (inBounds(s, view.bounds)) out.push({ id: s.id, networkId: idx.networkId, name: s.name, lat: s.lat, lon: s.lon })
			}
		return out
	}, [indexes, view])

	const selectedVehicle = selected ? tweened.find((v) => v.id === selected) : undefined
	useEffect(() => {
		if (!follow || !selectedVehicle) return
		camera.current?.easeTo({ center: [selectedVehicle.lon, selectedVehicle.lat], zoom: Math.max(view.zoom, 15), duration: reduceMotion ? 0 : 800 })
		// Follow position changes only; zoom is read once per move.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [follow, selectedVehicle?.lat, selectedVehicle?.lon])

	const recentre = async () => {
		const permission = useLocationStore.getState().permission === "granted" ? "granted" : await requestPermission()
		if (permission !== "granted") return
		const f = (await getFix()) ?? useLocationStore.getState().fix
		if (f) camera.current?.easeTo({ center: [f.lon, f.lat], zoom: 15, duration: reduceMotion ? 0 : 600 })
	}

	const onCluster = async (clusterId: number, coordinates: [number, number]) => {
		const zoom = (await vehicleSource.current?.getClusterExpansionZoom(clusterId).catch(() => null)) ?? view.zoom + 2
		camera.current?.easeTo({ center: coordinates, zoom, duration: reduceMotion ? 0 : 500 })
	}

	const initial = fix ? { center: [fix.lon, fix.lat] as [number, number], zoom: 13 } : city ? { bounds: city.bbox } : { center: [29.94, 40.77] as [number, number], zoom: 11 }

	return (
		<View style={[styles.fill, { backgroundColor: theme.colors.mapLand }]}>
			<TransitMap
				initial={initial}
				cameraRef={camera}
				contentInset={{ top: insets.top + 110, bottom: 120, left: 16, right: 16 }}
				accessibilityLabel={t("map.a11ySummary", { count: merged.length })}
				onRegionDidChange={(e) => {
					const { zoom, bounds } = e.nativeEvent
					setView({ zoom, bounds: bounds ? [bounds[0], bounds[1], bounds[2], bounds[3]] : null })
					if (e.nativeEvent.userInteraction) setFollow(false)
				}}
				onPress={() => setSelected(null)}
			>
				<StopsLayer
					id="city-stops"
					stops={stops}
					minzoom={STOPS_MINZOOM}
					onPressStop={(networkId, stopId) => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId, stopId } })}
				/>
				<VehiclesLayer
					id="city-vehicles"
					data={geo}
					clustered
					sourceRef={vehicleSource}
					selectedId={selected}
					onPressVehicle={(id) => {
						setSelected(id)
						setFollow(false)
					}}
					onPressCluster={(id, c) => void onCluster(id, c)}
				/>
			</TransitMap>

			{liveNetworks.map((n) => (
				<NetworkVehicles key={n.id} networkId={n.id} bbox={bbox} />
			))}

			<View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
				<Pressable
					testID="map-search-pill"
					accessibilityRole="search"
					accessibilityLabel={t("map.searchPill")}
					onPress={() => router.push({ pathname: "/search", params: { focus: "1" } })}
					style={[styles.pill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
				>
					<Search size={18} color={theme.colors.inkMuted} />
					<Text color="inkMuted" numberOfLines={1} style={styles.flex}>
						{t("map.searchPill")}
					</Text>
				</Pressable>
				{availableModes.length > 1 ? (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
						<Chip label={t("search.allModes")} selected={modes.length === 0} onPress={() => setModes([])} />
						{availableModes.map((m) => (
							<Chip
								key={m}
								label={t(`common:modes.${m}`)}
								selected={modes.includes(m)}
								onPress={() => setModes(modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m])}
							/>
						))}
					</ScrollView>
				) : null}
				{!liveMapOn ? <Banner tone="warning" title={t("map.liveOff")} /> : null}
				<OfflineBanner dataAt={receivedAt} timeZone={city?.timezone ?? "Europe/Istanbul"} />
				<View style={styles.row} pointerEvents="box-none">
					{[...noLive, ...emptyLive].map((n) => (
						<Chip key={n.id} label={t("map.noLive", { network: pickName(n.name) })} />
					))}
				</View>
			</View>

			<View style={[styles.fab, { bottom: 130 }]} pointerEvents="box-none">
				{follow ? (
					<IconButton variant="surface" label={t("map.unfollow")} icon={<Crosshair size={20} color={theme.colors.accent} />} onPress={() => setFollow(false)} />
				) : null}
				<IconButton variant="surface" label={t("map.recentre")} icon={<LocateFixed size={20} color={theme.colors.ink} />} onPress={() => void recentre()} />
			</View>

			<BottomSheet
				snapPoints={["12%", "45%", "90%"]}
				index={selected ? 1 : 0}
				enableDynamicSizing={false}
				backgroundStyle={{ backgroundColor: theme.colors.bg }}
				handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
			>
				<BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
					{selectedVehicle ? (
						<SelectedVehicle
							vehicle={selectedVehicle}
							route={selectedVehicle.routeId ? routeInfo.get(selectedVehicle.routeId) : undefined}
							stopName={(net, id) => indexes.find((i) => i.networkId === net)?.stopById.get(id)?.name ?? null}
							lastSeen={agoText(selectedVehicle.vehicleTs * 1000, now)}
							follow={follow}
							onFollow={() => setFollow((f) => !f)}
						/>
					) : (
						<>
							<View style={styles.sheetHeader}>
								<Heading level={3} style={styles.flex}>
									{t("map.inView")}
								</Heading>
								<Text variant="caption" color="inkMuted" tabular>
									{[t("map.vehicles", { count: inView.length }), receivedAt ? agoText(receivedAt, now) : null].filter(Boolean).join(" · ")}
								</Text>
							</View>
							{view.zoom < STOPS_MINZOOM && indexes.length ? (
								<Text variant="caption" color="inkSubtle" style={styles.hint}>
									{t("map.zoomIn")}
								</Text>
							) : null}
							{inView.length === 0 ? (
								<EmptyState title={t("map.noneInView")} />
							) : (
								<Card padded={false} style={styles.card}>
									{inView.slice(0, MAX_LIST).map((v, i) => {
										const r = v.routeId ? routeInfo.get(v.routeId) : undefined
										return (
											<View key={v.id}>
												{i > 0 ? <Divider inset={16} /> : null}
												<ListRow
													title={r ? `${r.shortName} ${r.longName}` : splitKey(v.id)[1]}
													subtitle={[v.headsign, agoText(v.vehicleTs * 1000, now)].filter(Boolean).join(" · ")}
													leading={r ? <RouteBadge shortName={r.shortName} color={r.rawColor} textColor={r.textColor} mode={r.mode} size="sm" /> : v.stale ? null : <LiveDot />}
													trailing={<ChevronRight size={18} color={theme.colors.iconSubtle} />}
													onPress={() => {
														setSelected(v.id)
														setFollow(true)
													}}
												/>
											</View>
										)
									})}
								</Card>
							)}
						</>
					)}
				</BottomSheetScrollView>
			</BottomSheet>
		</View>
	)
}

function SelectedVehicle({
	vehicle,
	route,
	stopName,
	lastSeen,
	follow,
	onFollow,
}: {
	vehicle: LiveVehicle
	route: { shortName: string; longName: string; rawColor: string | null; textColor: string | null; mode: Mode; directions: { direction: 0 | 1; headsign: string; stopIds: string[] }[] } | undefined
	stopName: (networkId: string, stopId: string) => string | null
	lastSeen: string
	follow: boolean
	onFollow: () => void
}) {
	const { t } = useT()
	const [networkId, vehicleId] = splitKey(vehicle.id)
	const routeId = vehicle.routeId ? splitKey(vehicle.routeId)[1] : null
	const dir = route?.directions.find((d) => d.direction === vehicle.direction) ?? route?.directions[0]
	// stop_seq is the stop the vehicle is heading to (GTFS-RT); fall back to the stop id.
	const from = dir
		? vehicle.stopId && dir.stopIds.includes(vehicle.stopId)
			? dir.stopIds.indexOf(vehicle.stopId)
			: vehicle.stopSeq !== null
				? Math.min(Math.max(vehicle.stopSeq - 1, 0), dir.stopIds.length - 1)
				: -1
		: -1
	const next = dir && from >= 0 ? dir.stopIds.slice(from, from + 4).map((id) => ({ id, name: stopName(networkId, id) ?? id })) : []
	return (
		<View style={styles.selected}>
			<View style={styles.sheetHeaderInner}>
				{route ? <RouteBadge shortName={route.shortName} color={route.rawColor} textColor={route.textColor} mode={route.mode} /> : null}
				<View style={styles.flex}>
					<Heading level={3} numberOfLines={2}>
						{route ? (dir ? t("route.directionTo", { headsign: dir.headsign }) : route.longName) : vehicleId}
					</Heading>
					<Text variant="caption" color="inkMuted">
						{[t("route.lastSeen", { ago: lastSeen }), vehicle.accessible ? t("vehicle.accessible") : null].filter(Boolean).join(" · ")}
					</Text>
				</View>
			</View>
			{next.length ? (
				<Card style={styles.nextCard}>
					<Text variant="caption" color="inkMuted">
						{t("map.nextStops")}
					</Text>
					{next.map((s, i) => (
						<Pressable
							key={s.id}
							accessibilityRole="link"
							onPress={() => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId, stopId: s.id } })}
						>
							<Text variant={i === 0 ? "bodyStrong" : "body"} numberOfLines={1}>
								{s.name}
							</Text>
						</Pressable>
					))}
				</Card>
			) : null}
			<View style={styles.actions}>
				<Button label={follow ? t("map.unfollow") : t("map.follow")} variant="secondary" onPress={onFollow} />
				{routeId ? (
					<Button
						label={t("map.openRoute")}
						onPress={() =>
							router.push({
								pathname: "/route/[networkId]/[routeId]",
								params: { networkId, routeId, vehicle: vehicleId, ...(vehicle.direction !== null ? { dir: String(vehicle.direction) } : {}) },
							})
						}
					/>
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	flex: { flex: 1 },
	top: { position: "absolute", left: 12, right: 12, gap: 8 },
	pill: { flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 999, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth },
	chips: { gap: 8 },
	row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	fab: { position: "absolute", right: 12, gap: 8 },
	sheetHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
	sheetHeaderInner: { flexDirection: "row", alignItems: "center", gap: 10 },
	hint: { paddingHorizontal: 16, paddingBottom: 8 },
	card: { marginHorizontal: 16, marginBottom: 12 },
	selected: { paddingHorizontal: 16, gap: 12 },
	nextCard: { gap: 6 },
	actions: { flexDirection: "row", gap: 8 },
})
