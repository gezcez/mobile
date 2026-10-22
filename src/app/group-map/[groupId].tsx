// Group live map: the live vehicles of a saved group's routes (up to 12 routes per network, one
// feed per network) and its saved stops, framed on everything in the group.

import { router, useLocalSearchParams } from "expo-router"
import { ArrowLeft } from "lucide-react-native"
import { useMemo } from "react"
import { StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useFavouritesStore } from "@/features/favourites/useFavouritesStore"
import { StopsLayer, VehiclesLayer, vehiclesGeoJSON, type RouteStyle } from "@/features/map/layers"
import { TransitMap } from "@/features/map/TransitMap"
import { capabilityOn, useAppConfig, useCurrentNetworks } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { colorOr } from "@/lib/color"
import { useNow } from "@/lib/useNow"
import { useVehicles } from "@/live/hooks"
import { LIMITS } from "@/live/protocol"
import { useTweenedVehicles } from "@/live/tween"
import type { PackIndex } from "@/pack/packIndex"
import { usePackIndexes } from "@/pack/packStore"
import { useTheme } from "@/theme/theme"
import { Banner } from "@/ui/Banner"
import { IconButton } from "@/ui/Button"
import { useReduceMotion } from "@/ui/LiveDot"
import { EmptyState } from "@/ui/States"
import { Heading } from "@/ui/Text"

export default function GroupMapScreen() {
	const { groupId } = useLocalSearchParams<{ groupId: string }>()
	const { t } = useT()
	const theme = useTheme()
	const insets = useSafeAreaInsets()
	const group = useFavouritesStore((s) => s.groups.find((g) => g.id === groupId))
	const { all } = useCurrentNetworks()
	const config = useAppConfig().data
	const { indexes } = usePackIndexes(all)

	const routesByNetwork = useMemo(() => {
		const m = new Map<string, string[]>()
		for (const i of group?.items ?? []) if (i.kind === "route") m.set(i.networkId, [...new Set([...(m.get(i.networkId) ?? []), i.refId])])
		return m
	}, [group])
	const tooMany = [...routesByNetwork.values()].some((r) => r.length > LIMITS.maxRoutesPerSub)
	const liveOn = config?.killSwitches.liveMap !== false

	const stops = useMemo(() => {
		const out: { id: string; networkId: string; name: string; lat: number; lon: number }[] = []
		for (const i of group?.items ?? []) {
			if (i.kind !== "stop") continue
			const s = indexes.find((x) => x.networkId === i.networkId)?.stopById.get(i.refId)
			if (s) out.push({ id: s.id, networkId: i.networkId, name: s.name, lat: s.lat, lon: s.lon })
		}
		return out
	}, [group, indexes])

	const bounds = useMemo(() => {
		const pts: [number, number][] = stops.map((s) => [s.lon, s.lat])
		for (const [net, ids] of routesByNetwork) {
			const idx = indexes.find((x) => x.networkId === net)
			for (const id of ids)
				for (const d of idx?.routeById.get(id)?.directions ?? [])
					for (const sid of d.stopIds) {
						const s = idx?.stopById.get(sid)
						if (s) pts.push([s.lon, s.lat])
					}
		}
		if (!pts.length) return null
		const lons = pts.map((p) => p[0])
		const lats = pts.map((p) => p[1])
		const pad = 0.005
		return [Math.min(...lons) - pad, Math.min(...lats) - pad, Math.max(...lons) + pad, Math.max(...lats) + pad] as [number, number, number, number]
	}, [stops, routesByNetwork, indexes])

	return (
		<View style={[styles.fill, { backgroundColor: theme.colors.mapLand }]}>
			{bounds ? (
				<TransitMap initial={{ bounds }} contentInset={{ top: insets.top + 64, bottom: 48, left: 24, right: 24 }}>
					<StopsLayer
						id="group-stops"
						stops={stops}
						onPressStop={(networkId, stopId) => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId, stopId } })}
					/>
					{liveOn
						? [...routesByNetwork].map(([net, ids]) => {
								const n = all.find((x) => x.id === net)
								if (!n || !capabilityOn(n, "realtimeVehicles")) return null
								return <GroupVehicles key={net} networkId={net} routeIds={ids.slice(0, LIMITS.maxRoutesPerSub)} index={indexes.find((x) => x.networkId === net)} />
							})
						: null}
				</TransitMap>
			) : (
				<View style={[styles.fill, styles.center, { paddingTop: insets.top }]}>
					<EmptyState title={t("saved.groupEmpty")} />
				</View>
			)}
			<View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
				<View style={styles.row}>
					<IconButton
						variant="surface"
						label={t("common:actions.back")}
						icon={<ArrowLeft size={22} color={theme.colors.ink} />}
						onPress={() => (router.canGoBack() ? router.back() : router.replace("/saved"))}
					/>
					<View style={[styles.title, { backgroundColor: theme.colors.surface }]}>
						<Heading level={3} numberOfLines={1}>
							{group?.name ?? ""}
						</Heading>
					</View>
				</View>
				{!liveOn ? <Banner tone="warning" title={t("map.liveOff")} /> : null}
				{tooMany ? <Banner tone="info" title={t("saved.tooManyRoutes")} /> : null}
			</View>
		</View>
	)
}

function GroupVehicles({ networkId, routeIds, index }: { networkId: string; routeIds: string[]; index: PackIndex | undefined }) {
	const theme = useTheme()
	const now = useNow()
	const reduceMotion = useReduceMotion()
	const feed = useVehicles({ network: networkId, routes: routeIds })
	const vehicles = useTweenedVehicles(feed.vehicles, reduceMotion)
	const routeStyles = useMemo(() => {
		const m = new Map<string, RouteStyle>()
		for (const id of routeIds) {
			const r = index?.routeById.get(id)
			if (r) m.set(id, { shortName: r.shortName, color: colorOr(r.color, theme.colors.accent) })
		}
		return m
	}, [routeIds, index, theme.colors.accent])
	const geo = useMemo(() => vehiclesGeoJSON(vehicles, routeStyles, now, theme.colors.accent), [vehicles, routeStyles, now, theme.colors.accent])
	return (
		<VehiclesLayer
			id={`group-vehicles-${networkId}`}
			data={geo}
			onPressVehicle={(vehicleId) => router.push({ pathname: "/vehicle/[networkId]/[vehicleId]", params: { networkId, vehicleId } })}
		/>
	)
}

const styles = StyleSheet.create({
	fill: { flex: 1 },
	center: { justifyContent: "center" },
	top: { position: "absolute", left: 12, right: 12, gap: 8 },
	row: { flexDirection: "row", alignItems: "center", gap: 8 },
	title: { flex: 1, height: 44, borderRadius: 999, justifyContent: "center", paddingHorizontal: 16 },
})
