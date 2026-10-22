// Route detail (plan 5.7): map with the shape of the selected direction (route colour on a navy
// casing), stops and live vehicles; a bottom sheet with direction switch, save/share, and Stops,
// Vehicles and Timetable tabs.

import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import type { CameraRef } from "@maplibre/maplibre-react-native"
import { useQuery } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight, Crosshair, Share2 } from "lucide-react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { routeQuery, shapeQuery, timetableQuery } from "@/api/queries/transit"
import { itemParams } from "@/features/favourites/params"
import { useSavedIn } from "@/features/favourites/useFavouritesStore"
import { RouteLineLayer, StopsLayer, VehiclesLayer, vehiclesGeoJSON } from "@/features/map/layers"
import { TransitMap } from "@/features/map/TransitMap"
import { capabilityOn, useAppConfig, useNetwork } from "@/features/network/hooks"
import { NetworkStatusBanner } from "@/features/network/StatusBanners"
import { boundsOf, decodeShape, nearestStopIndex, placeVehicles, straightLine } from "@/features/routes/geometry"
import { RouteStopsTimeline } from "@/features/routes/RouteStopsTimeline"
import { useT } from "@/i18n/useT"
import { colorOr } from "@/lib/color"
import { deepLink, shareLink } from "@/lib/links"
import { useLocationStore } from "@/lib/location"
import { clockIn, dateIn } from "@/lib/time"
import { useAgoText } from "@/lib/useAgoText"
import { useNow } from "@/lib/useNow"
import { useVehicles } from "@/live/hooks"
import { useTweenedVehicles } from "@/live/tween"
import { useTheme } from "@/theme/theme"
import { Button, IconButton } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Chip } from "@/ui/Chip"
import { Divider, ListRow } from "@/ui/ListRow"
import { LiveDot, useReduceMotion } from "@/ui/LiveDot"
import { RouteBadge } from "@/ui/RouteBadge"
import { SegmentedControl } from "@/ui/SegmentedControl"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState, ErrorState } from "@/ui/States"
import { Heading, Text } from "@/ui/Text"

type Tab = "stops" | "vehicles" | "timetable"

export default function RouteScreen() {
	const params = useLocalSearchParams<{ networkId: string; routeId: string; dir?: string; headsign?: string; vehicle?: string }>()
	const { networkId, routeId } = params
	const { t } = useT()
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const { height } = useWindowDimensions()
	const now = useNow()
	const agoText = useAgoText()
	const reduceMotion = useReduceMotion()
	const network = useNetwork(networkId).data
	const config = useAppConfig().data
	const tz = network?.timezone ?? "Europe/Istanbul"
	const route = useQuery(routeQuery(networkId, routeId))
	const fix = useLocationStore((s) => s.fix)
	const camera = useRef<CameraRef>(null)

	// Direction: from ?dir=, else the direction whose headsign matches ?headsign= (departures have
	// no direction on the wire yet), else the first.
	const directions = useMemo(() => route.data?.directions ?? [], [route.data])
	const initialDir = useMemo<0 | 1>(() => {
		if (params.dir === "0" || params.dir === "1") return Number(params.dir) as 0 | 1
		const byHeadsign = directions.find((d) => params.headsign && d.headsign === params.headsign)
		return byHeadsign?.direction ?? directions[0]?.direction ?? 0
	}, [params.dir, params.headsign, directions])
	const [dirOverride, setDir] = useState<0 | 1 | null>(null)
	const dir = dirOverride ?? initialDir
	const [tab, setTab] = useState<Tab>("stops")
	const [selected, setSelected] = useState<string | null>(params.vehicle ?? null)
	const [follow, setFollow] = useState(!!params.vehicle)

	const direction = directions.find((d) => d.direction === dir) ?? directions[0]
	const stops = useMemo(() => direction?.stops ?? [], [direction])
	const shape = useQuery({ ...shapeQuery(networkId, routeId, dir), enabled: !!network?.capabilities.shapes || !network })
	const lines = useMemo(() => decodeShape(shape.data), [shape.data])
	const approximate = lines.length === 0 && !shape.isLoading
	const drawn = useMemo(() => (approximate ? straightLine(stops) : lines), [approximate, stops, lines])
	const bounds = useMemo(() => boundsOf(drawn, stops), [drawn, stops])

	const liveOn = !!network && capabilityOn(network, "realtimeVehicles") && config?.killSwitches.liveMap !== false
	const feed = useVehicles(liveOn ? { network: networkId, routes: [routeId], direction: dir } : null)
	const vehicles = useTweenedVehicles(feed.vehicles, reduceMotion)
	const placed = useMemo(() => placeVehicles(stops, feed.vehicles), [stops, feed.vehicles])
	const nearest = useMemo(() => nearestStopIndex(stops, fix), [stops, fix])
	const color = colorOr(route.data?.color ?? null, theme.colors.accent)
	const routeStyles = useMemo(
		() => new Map(route.data ? [[route.data.id, { shortName: route.data.shortName, color }]] : []),
		[route.data, color],
	)
	const geo = useMemo(() => vehiclesGeoJSON(vehicles, routeStyles, now, color), [vehicles, routeStyles, now, color])
	const saved = useSavedIn("route", networkId, routeId)

	const today = dateIn(now, tz)
	const tt = useQuery({ ...timetableQuery(networkId, routeId, dir, { date: today }), enabled: tab === "timetable" || feed.vehicles.length === 0 })
	const nowClock = clockIn(now, tz)
	const nextStart = tt.data?.departures.find((d) => d.start >= nowClock) ?? null

	// Camera follows the selected vehicle (with its bearing) while "follow" is on.
	const followed = follow && selected ? vehicles.find((v) => v.id === selected) : undefined
	useEffect(() => {
		if (!followed) return
		camera.current?.easeTo({ center: [followed.lon, followed.lat], zoom: 15, bearing: followed.bearing ?? 0, duration: 800 })
	}, [followed])

	const sheetTop = Math.round(height * 0.45)

	if (route.error && !route.data)
		return (
			<View style={[styles.fill, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
				<BackButton />
				<ErrorState error={route.error} onRetry={() => void route.refetch()} />
			</View>
		)

	return (
		<View style={[styles.fill, { backgroundColor: theme.colors.bg }]}>
			{bounds ? (
				<TransitMap initial={{ bounds }} cameraRef={camera} contentInset={{ top: insets.top + 56, bottom: height - sheetTop + 16, left: 24, right: 24 }} accessibilityLabel={t("map.a11ySummary", { count: vehicles.length })}>
					<RouteLineLayer id="route" lines={drawn} color={color} dashed={approximate} />
					<StopsLayer
						id="route-stops"
						stops={stops.map((s) => ({ ...s, networkId }))}
						highlightId={nearest !== null ? stops[nearest]?.id : null}
						onPressStop={(net, stop) => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId: net, stopId: stop } })}
					/>
					<VehiclesLayer id="route-vehicles" data={geo} selectedId={selected} onPressVehicle={(id) => (setSelected(id), setFollow(true))} />
				</TransitMap>
			) : (
				<View style={[styles.fill, { backgroundColor: theme.colors.mapLand }]} />
			)}

			<View style={[styles.topBar, { top: insets.top + 8 }]}>
				<BackButton />
				{approximate && stops.length > 1 ? <Chip label={t("route.approximatePath")} /> : null}
				{follow && selected ? (
					<IconButton
						variant="surface"
						label={t("map.unfollow")}
						icon={<Crosshair size={20} color={theme.colors.accent} />}
						onPress={() => setFollow(false)}
					/>
				) : null}
			</View>

			<BottomSheet
				snapPoints={["45%", "90%"]}
				index={0}
				enableDynamicSizing={false}
				backgroundStyle={{ backgroundColor: theme.colors.bg }}
				handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}
			>
				<BottomSheetScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
					{route.isLoading || !route.data ? (
						<SkeletonRows count={6} />
					) : (
						<>
							<View style={styles.header}>
								<RouteBadge shortName={route.data.shortName} color={route.data.color} textColor={route.data.textColor} mode={route.data.mode} />
								<Heading level={3} style={styles.flex} numberOfLines={2}>
									{route.data.longName}
								</Heading>
								<IconButton
									label={saved.length ? t("route.unsave") : t("route.save")}
									icon={saved.length ? <BookmarkCheck size={22} color={theme.colors.accent} /> : <Bookmark size={22} color={theme.colors.ink} />}
									onPress={() =>
										router.push({
											pathname: "/save-to-group",
											params: itemParams({ kind: "route", networkId, refId: routeId, label: `${route.data.shortName} ${route.data.longName}`, direction: dir }),
										})
									}
								/>
								<IconButton
									label={t("route.share")}
									icon={<Share2 size={20} color={theme.colors.ink} />}
									onPress={() => void shareLink(`${route.data.shortName} ${route.data.longName}`, deepLink.route(networkId, routeId, dir))}
								/>
							</View>
							<NetworkStatusBanner network={network} />
							{directions.length > 1 ? (
								<View style={styles.pad}>
									<SegmentedControl
										accessibilityLabel={t("route.switchDirection")}
										options={directions.map((d) => ({ value: d.direction, label: t("route.directionTo", { headsign: d.headsign }) }))}
										value={dir}
										onChange={(d) => {
											setDir(d)
											setSelected(null)
										}}
									/>
								</View>
							) : null}
							<View style={styles.pad}>
								<SegmentedControl
									options={[
										{ value: "stops", label: t("route.stops") },
										...(liveOn ? [{ value: "vehicles" as const, label: t("route.vehicles") }] : []),
										...(network?.capabilities.timetables !== false ? [{ value: "timetable" as const, label: t("route.timetable") }] : []),
									]}
									value={tab}
									onChange={setTab}
								/>
							</View>

							{liveOn && feed.vehicles.length === 0 && feed.source ? (
								<Card tone="muted" style={styles.card}>
									<Text variant="bodyStrong">{t("route.noVehicles")}</Text>
									{nextStart ? (
										<Text color="inkMuted">{t("route.nextScheduled", { time: nextStart.start })}</Text>
									) : null}
								</Card>
							) : null}

							{tab === "stops" ? (
								<RouteStopsTimeline
									networkId={networkId}
									stops={stops}
									color={route.data.color}
									placed={placed}
									nearestIndex={nearest}
									onPressVehicle={(id) => (setSelected(id), setFollow(true))}
								/>
							) : tab === "vehicles" ? (
								<Card padded={false} style={styles.card}>
									{placed.length === 0 ? (
										<EmptyState title={t("route.noVehicles")} />
									) : (
										placed.map((p, i) => (
											<View key={p.vehicle.id}>
												{i > 0 ? <Divider inset={16} /> : null}
												<ListRow
													title={t("route.atStop", { stop: stops[p.index]?.name ?? "" })}
													subtitle={[
														t("route.lastSeen", { ago: agoText(p.vehicle.vehicleTs * 1000, now) }),
														p.vehicle.accessible ? t("vehicle.accessible") : null,
													]
														.filter(Boolean)
														.join(" · ")}
													leading={p.vehicle.stale ? null : <LiveDot />}
													trailing={<ChevronRight size={18} color={theme.colors.inkSubtle} />}
													onPress={() => {
														setSelected(p.vehicle.id)
														setFollow(true)
													}}
													onLongPress={() => router.push({ pathname: "/vehicle/[networkId]/[vehicleId]", params: { networkId, vehicleId: p.vehicle.id } })}
												/>
											</View>
										))
									)}
								</Card>
							) : (
								<View style={styles.card}>
									<Text variant="caption" color="inkMuted">
										{t("route.departuresFrom", { stop: stops[0]?.name ?? "" })}
									</Text>
									{tt.isLoading ? (
										<SkeletonRows count={3} />
									) : tt.error && !tt.data ? (
										<ErrorState error={tt.error} onRetry={() => void tt.refetch()} />
									) : !tt.data?.departures.some((d) => d.start >= nowClock) ? (
										<EmptyState title={t("route.noMoreToday")} />
									) : (
										<View style={styles.times}>
											{tt.data.departures
												.filter((d) => d.start >= nowClock)
												.slice(0, 24)
												.map((d) => (
													<View
														key={d.tripId}
														style={[
															styles.time,
															{ borderColor: theme.colors.border, backgroundColor: d === nextStart ? theme.colors.cta : theme.colors.surface },
														]}
													>
														<Text variant="bodyStrong" tabular style={d === nextStart ? { color: theme.colors.onCta } : null}>
															{d.start}
														</Text>
													</View>
												))}
										</View>
									)}
									<Button
										label={t("route.fullTimetable")}
										variant="secondary"
										onPress={() => router.push({ pathname: "/route/[networkId]/[routeId]/timetable", params: { networkId, routeId, dir: String(dir) } })}
									/>
								</View>
							)}
						</>
					)}
				</BottomSheetScrollView>
			</BottomSheet>
		</View>
	)
}

function BackButton() {
	const { t } = useT()
	const theme = useTheme()
	return (
		<IconButton
			variant="surface"
			label={t("common:actions.back")}
			icon={<ArrowLeft size={22} color={theme.colors.ink} />}
			onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
		/>
	)
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	topBar: { position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 },
	header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
	flex: { flex: 1 },
	pad: { paddingHorizontal: 16, paddingBottom: 12 },
	card: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
	times: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
	time: { paddingHorizontal: 12, height: 36, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, justifyContent: "center" },
})
