// Full timetable (plan 5.8): day type and direction, start times at the origin in rows by hour.

import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import { routeQuery, timetableQuery } from "@/api/queries/transit"
import { DAY_TYPES, type DayType } from "@/api/types"
import { useNetwork } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { clockIn } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import { useTheme } from "@/theme/theme"
import { Card } from "@/ui/Card"
import { Divider } from "@/ui/ListRow"
import { RouteBadge } from "@/ui/RouteBadge"
import { Screen } from "@/ui/Screen"
import { SegmentedControl } from "@/ui/SegmentedControl"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState, ErrorState } from "@/ui/States"
import { Text } from "@/ui/Text"

function todayType(nowMs: number, tz: string): DayType {
	const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }).format(nowMs)
	return day === "Sat" ? "saturday" : day === "Sun" ? "sunday" : "weekday"
}

export default function TimetableScreen() {
	const { networkId, routeId, dir } = useLocalSearchParams<{ networkId: string; routeId: string; dir?: string }>()
	const { t } = useT()
	const theme = useTheme()
	const now = useNow(60_000)
	const tz = useNetwork(networkId).data?.timezone ?? "Europe/Istanbul"
	const route = useQuery(routeQuery(networkId, routeId))
	const [direction, setDirection] = useState<0 | 1>(dir === "1" ? 1 : 0)
	const [dayType, setDayType] = useState<DayType>(() => todayType(Date.now(), tz))
	const tt = useQuery(timetableQuery(networkId, routeId, direction, { dayType }))
	const isToday = dayType === todayType(now, tz)
	const nowClock = clockIn(now, tz)

	const rows = useMemo(() => {
		const byHour = new Map<string, string[]>()
		for (const d of tt.data?.departures ?? []) {
			const h = d.start.slice(0, 2)
			byHour.set(h, [...(byHour.get(h) ?? []), d.start.slice(3)])
		}
		return [...byHour.entries()]
	}, [tt.data])
	const next = isToday ? tt.data?.departures.find((d) => d.start >= nowClock)?.start : undefined

	return (
		<Screen
			back
			title={t("timetable.title")}
			right={route.data ? <RouteBadge shortName={route.data.shortName} color={route.data.color} textColor={route.data.textColor} mode={route.data.mode} /> : null}
		>
			<View style={styles.controls}>
				<SegmentedControl
					accessibilityLabel={t("timetable.dayType")}
					options={DAY_TYPES.map((d) => ({ value: d, label: t(`timetable.dayTypes.${d}`) }))}
					value={dayType}
					onChange={setDayType}
				/>
				{route.data && route.data.directions.length > 1 ? (
					<SegmentedControl
						accessibilityLabel={t("route.switchDirection")}
						options={route.data.directions.map((d) => ({ value: d.direction, label: t("route.directionTo", { headsign: d.headsign }) }))}
						value={direction}
						onChange={setDirection}
					/>
				) : null}
				{tt.data?.serviceLabels.length ? (
					<Text variant="caption" color="inkMuted">
						{tt.data.serviceLabels.join(" · ")}
					</Text>
				) : null}
			</View>
			<Card padded={false} style={styles.card}>
				{tt.isLoading ? (
					<SkeletonRows count={8} />
				) : tt.error && !tt.data ? (
					<ErrorState error={tt.error} onRetry={() => void tt.refetch()} />
				) : rows.length === 0 ? (
					<EmptyState title={t("timetable.noService")} />
				) : (
					rows.map(([hour, minutes], i) => (
						<View key={hour}>
							{i > 0 ? <Divider /> : null}
							<View style={styles.row} accessible accessibilityLabel={`${hour}: ${minutes.join(", ")}`}>
								<Text variant="bodyStrong" tabular style={styles.hour}>
									{hour}
								</Text>
								<View style={styles.minutes}>
									{minutes.map((m) => {
										const isNext = next === `${hour}:${m}`
										return (
											<Text
												key={m}
												tabular
												variant={isNext ? "bodyStrong" : "body"}
												style={[styles.minute, isNext && { backgroundColor: theme.colors.cta, color: theme.colors.onCta }]}
											>
												{m}
											</Text>
										)
									})}
								</View>
							</View>
						</View>
					))
				)}
			</Card>
		</Screen>
	)
}

const styles = StyleSheet.create({
	controls: { paddingHorizontal: 16, gap: 12, paddingBottom: 12 },
	card: { marginHorizontal: 16 },
	row: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 16 },
	hour: { width: 28 },
	minutes: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 12 },
	minute: { borderRadius: 6, paddingHorizontal: 4, overflow: "hidden" },
})
