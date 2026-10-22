// Stop detail (plan 5.5): header with code, network and other-city chip; departures grouped by
// route + headsign; route filter chips when more than five routes serve the stop; save and share.

import { useQuery } from "@tanstack/react-query"
import { router, useIsFocused, useLocalSearchParams } from "expo-router"
import { Bookmark, BookmarkCheck, Share2 } from "lucide-react-native"
import { useMemo, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { departuresQuery, stopQuery } from "@/api/queries/transit"
import { useCityStore } from "@/features/city/useCityStore"
import { useSavedIn } from "@/features/favourites/useFavouritesStore"
import { capabilityOn, useCities, useCurrentCityId, useNetwork } from "@/features/network/hooks"
import { NetworkBadge } from "@/features/network/NetworkBadge"
import { NetworkStatusBanner, OfflineBanner } from "@/features/network/StatusBanners"
import { DepartureGroupRow } from "@/features/stops/DepartureGroupRow"
import { departureTime, groupDepartures, routesIn, soonest } from "@/features/stops/groupDepartures"
import { useCountdownText } from "@/features/stops/useCountdownText"
import { pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { deepLink, shareLink } from "@/lib/links"
import { clockIn } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import { useLiveDepartures } from "@/live/hooks"
import { useTheme } from "@/theme/theme"
import { IconButton } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Chip } from "@/ui/Chip"
import { Divider } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState, ErrorState } from "@/ui/States"
import { Text } from "@/ui/Text"

const DEFAULT_TZ = "Europe/Istanbul"

export default function StopScreen() {
	const { networkId, stopId } = useLocalSearchParams<{ networkId: string; stopId: string }>()
	const { t } = useT()
	const theme = useTheme()
	const focused = useIsFocused()
	const now = useNow()
	const network = useNetwork(networkId).data
	const tz = network?.timezone ?? DEFAULT_TZ
	const stop = useQuery(stopQuery(networkId, stopId))
	// WS `departures` channel when connected; REST polling every 20 s otherwise (plan 5.5).
	const live = useLiveDepartures(networkId, stopId, 30)
	const deps = useQuery({ ...departuresQuery(networkId, stopId), refetchInterval: focused && !live ? 20_000 : false })
	const [routeFilter, setRouteFilter] = useState<string | null>(null)
	const saved = useSavedIn("stop", networkId, stopId)
	const text = useCountdownText(tz)

	// Other-city chip: a shared stop from another city opens without switching (plan 3.2).
	const currentCity = useCurrentCityId()
	const cities = useCities().data
	const stopCity = network ? cities?.find((c) => c.id === network.cityId) : null
	const otherCity = stopCity && stopCity.id !== currentCity ? stopCity : null

	const items = useMemo(() => deps.data?.items ?? [], [deps.data])
	const routes = useMemo(() => routesIn(items), [items])
	const groups = useMemo(() => groupDepartures(items, { routeFilter }), [items, routeFilter])
	const { soon, nextLater } = useMemo(() => soonest(items, now), [items, now])
	const scheduledOnly = network ? !capabilityOn(network, "realtimeDepartures") : false

	const title = stop.data?.name ?? ""
	const toggleSave = () => {
		router.push({ pathname: "/save-to-group", params: { kind: "stop", networkId, refId: stopId, label: title } })
	}

	if (stop.error && !stop.data)
		return (
			<Screen back title={title}>
				<ErrorState error={stop.error} onRetry={() => void stop.refetch()} />
			</Screen>
		)

	return (
		<Screen
			back
			title={title}
			eyebrow={stop.data?.code ? t("stop.code", { code: stop.data.code }) : undefined}
			scroll={false}
			right={
				<View style={styles.actions}>
					<IconButton
						label={saved.length ? t("stop.unsave") : t("stop.save")}
						icon={saved.length ? <BookmarkCheck size={22} color={theme.colors.accent} /> : <Bookmark size={22} color={theme.colors.ink} />}
						onPress={toggleSave}
						disabled={!title}
					/>
					<IconButton
						label={t("stop.share")}
						icon={<Share2 size={20} color={theme.colors.ink} />}
						onPress={() => void shareLink(title, deepLink.stop(networkId, stopId))}
						disabled={!title}
					/>
				</View>
			}
		>
			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={<RefreshControl refreshing={deps.isRefetching} onRefresh={() => void deps.refetch()} tintColor={theme.colors.accent} />}
			>
				<View style={styles.meta}>
					{network ? <NetworkBadge name={network.name} color={network.color} /> : null}
					{otherCity ? (
						<Chip
							label={t("stop.switchCity", { city: pickName(otherCity.name) })}
							onPress={() => useCityStore.getState().setCity(otherCity.id)}
						/>
					) : null}
				</View>
				<NetworkStatusBanner network={network} />
				<OfflineBanner dataAt={deps.dataUpdatedAt || null} timeZone={tz} />

				{routes.length > 5 ? (
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
						<Chip label={t("stop.filterAll")} selected={!routeFilter} onPress={() => setRouteFilter(null)} />
						{routes.map((r) => (
							<Chip key={r.id} label={r.shortName} selected={routeFilter === r.id} onPress={() => setRouteFilter(routeFilter === r.id ? null : r.id)} />
						))}
					</ScrollView>
				) : null}

				<SectionHeader eyebrow={scheduledOnly ? t("stop.scheduledOnly") : undefined} title={t("stop.departures")} />
				<Card padded={false} style={styles.card}>
					{deps.isLoading ? (
						<SkeletonRows count={4} />
					) : deps.error && !deps.data ? (
						<ErrorState error={deps.error} onRetry={() => void deps.refetch()} />
					) : soon.length === 0 ? (
						<EmptyState
							title={t("stop.noneSoon")}
							body={nextLater ? t("stop.nextAt", { time: text(departureTime(nextLater), now) }) : undefined}
						/>
					) : (
						groups.map((g, i) => (
							<View key={g.key}>
								{i > 0 ? <Divider inset={16} /> : null}
								<DepartureGroupRow
									group={g}
									nowMs={now}
									timeZone={tz}
									onPress={() =>
										router.push({
											pathname: "/route/[networkId]/[routeId]",
											params: {
												networkId,
												routeId: g.route.id,
												...(g.direction !== null ? { dir: String(g.direction) } : { headsign: g.headsign }),
												...(g.next?.vehicleId ? { vehicle: g.next.vehicleId } : {}),
											},
										})
									}
								/>
							</View>
						))
					)}
				</Card>
				{deps.data ? (
					<Text variant="caption" color="inkSubtle" style={styles.footer}>
						{t("common:state.asOf", { time: clockIn(deps.data.generatedAt, tz) })}
					</Text>
				) : null}
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	actions: { flexDirection: "row" },
	content: { paddingBottom: 40 },
	meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingHorizontal: 16 },
	chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
	card: { marginHorizontal: 16 },
	footer: { paddingHorizontal: 16, paddingTop: 8 },
})
