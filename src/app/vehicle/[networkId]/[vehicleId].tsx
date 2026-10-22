// Vehicle sheet (form sheet): route, heading, plate when the provider gives one, last seen,
// accessible flag, speed, today's trips, and Open route.

import { useQuery } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { Accessibility } from "lucide-react-native"
import { ScrollView, StyleSheet, View } from "react-native"
import { vehicleQuery } from "@/api/queries/transit"
import { useNetwork } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { clockIn, toMs } from "@/lib/time"
import { useAgoText } from "@/lib/useAgoText"
import { useNow } from "@/lib/useNow"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { LiveDot } from "@/ui/LiveDot"
import { RouteBadge } from "@/ui/RouteBadge"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState } from "@/ui/States"
import { Heading, Text } from "@/ui/Text"

export default function VehicleSheet() {
	const { networkId, vehicleId } = useLocalSearchParams<{ networkId: string; vehicleId: string }>()
	const { t } = useT()
	const theme = useTheme()
	const now = useNow(5_000)
	const agoText = useAgoText()
	const tz = useNetwork(networkId).data?.timezone ?? "Europe/Istanbul"
	const q = useQuery({ ...vehicleQuery(networkId, vehicleId), refetchInterval: 15_000 })
	const v = q.data

	if (q.isLoading) return <SkeletonRows count={5} />
	if (!v) return <EmptyState title={t("vehicle.notFound")} />

	const rows: { title: string; value: string }[] = []
	if (v.plate) rows.push({ title: t("vehicle.plate"), value: v.plate })
	rows.push({ title: t("vehicle.lastSeen"), value: agoText(v.position ? v.position.vehicleTs * 1000 : toMs(v.lastSeenAt), now) })
	if (v.position?.speedMs != null) rows.push({ title: t("vehicle.speed"), value: t("vehicle.speedValue", { value: Math.round(v.position.speedMs * 3.6) }) })
	const run = v.currentRun
	if (run) rows.push({ title: t("vehicle.runStarted", { time: clockIn(run.startedAt, tz) }), value: run.startDelayS == null ? "" : run.startDelayS >= 120 ? t("vehicle.late", { min: Math.round(run.startDelayS / 60) }) : t("vehicle.onTime") })

	return (
		<ScrollView contentContainerStyle={styles.content}>
			<View style={styles.header}>
				{v.route ? <RouteBadge shortName={v.route.shortName} color={v.route.color} textColor={v.route.textColor} mode={v.route.mode} /> : null}
				<View style={styles.flex}>
					<Heading level={3}>{v.label ?? t("vehicle.title")}</Heading>
					{v.route ? (
						<Text color="inkMuted" numberOfLines={1}>
							{v.route.longName}
						</Text>
					) : null}
				</View>
				{v.live && !v.position?.stale ? <LiveDot /> : null}
			</View>
			<Card padded={false}>
				{rows.map((r, i) => (
					<View key={r.title}>
						{i > 0 ? <Divider inset={16} /> : null}
						<ListRow title={r.title} trailing={<Text color="inkMuted">{r.value}</Text>} />
					</View>
				))}
				{v.accessible ? (
					<>
						<Divider inset={16} />
						<ListRow title={t("vehicle.accessible")} leading={<Accessibility size={20} color={theme.colors.accent} />} />
					</>
				) : null}
			</Card>
			{v.runsToday.length > 0 ? (
				<Text variant="caption" color="inkMuted">
					{t("vehicle.runsToday", { count: v.runsToday.length })}
				</Text>
			) : null}
			{v.route ? (
				<Button
					label={t("vehicle.openRoute")}
					fullWidth
					onPress={() =>
						router.push({
							pathname: "/route/[networkId]/[routeId]",
							params: { networkId, routeId: v.route!.id, ...(v.direction !== null ? { dir: String(v.direction) } : {}), vehicle: v.id },
						})
					}
				/>
			) : null}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	content: { padding: 16, gap: 12 },
	header: { flexDirection: "row", alignItems: "center", gap: 12 },
	flex: { flex: 1 },
})
