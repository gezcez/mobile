// NearbyRow.tsx
// A nearby stop: name, distance and walking minutes, route badges and (for the closest few) the
// next departure inline. Long press saves the stop to a group.

import { useQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { Pressable, StyleSheet, View } from "react-native"
import { departuresQuery } from "@/api/queries/transit"
import { itemParams } from "@/features/favourites/params"
import { HOME_DEPARTURES_LIMIT, HOME_POLL_MS } from "@/features/home/liveBudget"
import { departureTime, groupDepartures, isLive } from "@/features/stops/groupDepartures"
import { useCountdownText } from "@/features/stops/useCountdownText"
import { useT } from "@/i18n/useT"
import { useLiveDepartures } from "@/live/hooks"
import { formatDistance, walkMinutes } from "@/lib/format"
import { useTheme } from "@/theme/theme"
import { LiveDot } from "@/ui/LiveDot"
import { RouteBadge } from "@/ui/RouteBadge"
import { Text } from "@/ui/Text"
import type { NearbyItem } from "./useNearby"

const MAX_BADGES = 5

export function NearbyRow({
	item,
	nowMs,
	timeZone,
	withDepartures,
	live = false,
	networkName,
}: {
	item: NearbyItem
	nowMs: number
	timeZone: string
	withDepartures: boolean
	/** Fed over the realtime connection (Home's budget, liveBudget.ts) instead of polling. */
	live?: boolean
	networkName?: string | null
}) {
	const { t, i18n } = useT()
	const theme = useTheme()
	const text = useCountdownText(timeZone)
	const { stop } = item
	const fed = useLiveDepartures(stop.networkId, stop.id, HOME_DEPARTURES_LIMIT, withDepartures && live)
	const deps = useQuery({
		...departuresQuery(stop.networkId, stop.id, HOME_DEPARTURES_LIMIT),
		enabled: withDepartures,
		refetchInterval: withDepartures && !fed ? HOME_POLL_MS : false,
	})
	const next = withDepartures ? groupDepartures(deps.data?.items ?? [], { perGroup: 1 })[0]?.next : null
	const d = formatDistance(item.distanceM, i18n.language)
	const distance = t("home.walk", { distance: t(`common:distance.${d.unit}`, { value: d.value }), minutes: walkMinutes(item.distanceM) })
	const nextText = next ? text(departureTime(next), nowMs) : null
	const extra = item.routes.length - MAX_BADGES

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={[stop.name, distance, next && nextText ? t("stop.a11yDeparture", { line: next.route.shortName, headsign: next.headsign, when: nextText }) : null]
				.filter(Boolean)
				.join(", ")}
			accessibilityHint={t("stop.save")}
			onPress={() => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId: stop.networkId, stopId: stop.id } })}
			onLongPress={() => router.push({ pathname: "/save-to-group", params: itemParams({ kind: "stop", networkId: stop.networkId, refId: stop.id, label: stop.name }) })}
			style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surfaceMuted }]}
		>
			<View style={styles.main}>
				<Text variant="bodyStrong" numberOfLines={1}>
					{stop.name}
				</Text>
				<Text variant="caption" color="inkMuted" numberOfLines={1}>
					{networkName ? `${distance} · ${networkName}` : distance}
				</Text>
				{item.routes.length ? (
					<View style={styles.badges}>
						{item.routes.slice(0, MAX_BADGES).map((r) => (
							<RouteBadge key={r.id} shortName={r.shortName} color={r.color} textColor={r.textColor} mode={r.mode} size="sm" />
						))}
						{extra > 0 ? (
							<Text variant="caption" color="inkMuted">
								{`+${extra}`}
							</Text>
						) : null}
					</View>
				) : null}
			</View>
			{next && nextText ? (
				<View style={styles.next}>
					<RouteBadge shortName={next.route.shortName} color={next.route.color} textColor={next.route.textColor} mode={next.route.mode} size="sm" />
					<View style={styles.time}>
						{isLive(next) ? <LiveDot size={7} /> : null}
						<Text variant="bodyStrong" tabular style={isLive(next) ? { color: theme.colors.live } : null}>
							{nextText}
						</Text>
					</View>
				</View>
			) : null}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64 },
	main: { flex: 1, gap: 4 },
	badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, paddingTop: 2 },
	next: { alignItems: "flex-end", gap: 4 },
	time: { flexDirection: "row", alignItems: "center", gap: 4 },
})
