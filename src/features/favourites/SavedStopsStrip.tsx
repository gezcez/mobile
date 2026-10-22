// SavedStopsStrip.tsx
// Home's saved stops (plan 5.2.3): each saved stop of the current city as a compact card with the
// next departures per route. Horizontal scroll when there are more than two.

import { useQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { useMemo } from "react"
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native"
import { departuresQuery } from "@/api/queries/transit"
import { HOME_DEPARTURES_LIMIT, HOME_POLL_MS, stopKey } from "@/features/home/liveBudget"
import { DepartureGroupRow } from "@/features/stops/DepartureGroupRow"
import { groupDepartures } from "@/features/stops/groupDepartures"
import { useT } from "@/i18n/useT"
import { useLiveDepartures } from "@/live/hooks"
import { LiveDot } from "@/ui/LiveDot"
import { Card } from "@/ui/Card"
import { Skeleton } from "@/ui/Skeleton"
import { Text } from "@/ui/Text"
import { GroupDot } from "./GroupDot"
import type { FavItem } from "./model"
import { itemKey } from "./model"
import { useFavouritesStore } from "./useFavouritesStore"
import type { GroupColor } from "@/theme/tokens"

export function useSavedStops(networkIds: readonly string[]): { item: FavItem; colour: GroupColor }[] {
	const groups = useFavouritesStore((s) => s.groups)
	return useMemo(() => {
		const seen = new Set<string>()
		const out: { item: FavItem; colour: GroupColor }[] = []
		for (const g of groups)
			for (const i of g.items)
				if (i.kind === "stop" && networkIds.includes(i.networkId) && !seen.has(itemKey(i))) {
					seen.add(itemKey(i))
					out.push({ item: i, colour: g.colour })
				}
		return out
	}, [groups, networkIds])
}

export function SavedStopsStrip({
	stops,
	nowMs,
	timeZone,
	liveKeys,
}: {
	stops: { item: FavItem; colour: GroupColor }[]
	nowMs: number
	timeZone: string
	/** Stops Home feeds over the realtime connection (liveBudget.ts); the rest poll. */
	liveKeys: ReadonlySet<string>
}) {
	const { width } = useWindowDimensions()
	if (stops.length === 0) return null
	const cardWidth = stops.length > 2 ? Math.min(320, width * 0.8) : undefined
	const cards = stops.map(({ item, colour }) => (
		<SavedStopCard key={item.id} item={item} colour={colour} nowMs={nowMs} timeZone={timeZone} width={cardWidth} live={liveKeys.has(stopKey({ networkId: item.networkId, stopId: item.refId }))} />
	))
	return stops.length > 2 ? (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} snapToInterval={(cardWidth ?? 0) + 12} decelerationRate="fast">
			{cards}
		</ScrollView>
	) : (
		<View style={styles.column}>{cards}</View>
	)
}

function SavedStopCard({ item, colour, nowMs, timeZone, width, live }: { item: FavItem; colour: GroupColor; nowMs: number; timeZone: string; width?: number; live: boolean }) {
	const { t } = useT()
	const fed = useLiveDepartures(item.networkId, item.refId, HOME_DEPARTURES_LIMIT, live)
	const deps = useQuery({ ...departuresQuery(item.networkId, item.refId, HOME_DEPARTURES_LIMIT), refetchInterval: fed ? false : HOME_POLL_MS })
	const groups = groupDepartures(deps.data?.items ?? [], { perGroup: 3 }).slice(0, 3)
	return (
		<Card
			style={[styles.card, width ? { width } : null]}
			onPress={() => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId: item.networkId, stopId: item.refId } })}
			accessibilityLabel={item.label}
		>
			<View style={styles.title}>
				<GroupDot colour={colour} size={10} />
				<Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
					{item.label}
				</Text>
				{fed ? <LiveDot size={7} /> : null}
			</View>
			{deps.isLoading ? (
				<Skeleton height={36} />
			) : groups.length === 0 ? (
				<Text variant="caption" color="inkMuted">
					{t("home.noDepartures")}
				</Text>
			) : (
				groups.map((g) => <DepartureGroupRow key={g.key} group={g} nowMs={nowMs} timeZone={timeZone} compact />)
			)}
		</Card>
	)
}

const styles = StyleSheet.create({
	row: { gap: 12, paddingHorizontal: 16 },
	column: { gap: 12, paddingHorizontal: 16 },
	card: { gap: 6 },
	title: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 2 },
	flex: { flex: 1 },
})
