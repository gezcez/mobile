// DepartureGroupRow.tsx
// One route + headsign with its next departures: badge, "to Umuttepe", then up to three times.
// Live times show the pulsing amber dot and are read as "live"; cancelled ones are struck through.

import { Pressable, StyleSheet, View } from "react-native"
import { useT } from "@/i18n/useT"
import { useTheme } from "@/theme/theme"
import { LiveDot } from "@/ui/LiveDot"
import { RouteBadge } from "@/ui/RouteBadge"
import { Text } from "@/ui/Text"
import { departureTime, isLive, type DepartureGroup } from "./groupDepartures"
import { useCountdownText } from "./useCountdownText"

export function DepartureGroupRow({
	group,
	nowMs,
	timeZone,
	onPress,
	compact,
}: {
	group: DepartureGroup
	nowMs: number
	timeZone: string
	onPress?: () => void
	compact?: boolean
}) {
	const { t } = useT()
	const theme = useTheme()
	const text = useCountdownText(timeZone)
	const times = group.items.map((d) => ({ d, label: text(departureTime(d), nowMs), live: isLive(d) }))
	const a11y = times
		.map(({ d, label, live }) =>
			[label, live ? t("stop.a11yLive") : null, d.cancelled ? t("stop.a11yCancelled") : null].filter(Boolean).join(", "),
		)
		.join("; ")
	const body = (
		<View style={[styles.row, compact && styles.compact]}>
			<RouteBadge shortName={group.route.shortName} color={group.route.color} textColor={group.route.textColor} mode={group.route.mode} size={compact ? "sm" : "md"} />
			<Text variant={compact ? "caption" : "body"} numberOfLines={1} style={styles.headsign}>
				{t("stop.toHeadsign", { headsign: group.headsign })}
			</Text>
			<View style={styles.times}>
				{times.map(({ d, label, live }, i) => (
					<View key={`${d.scheduledAt}-${i}`} style={styles.time}>
						{live && !d.cancelled ? <LiveDot size={7} /> : null}
						<Text
							variant={i === 0 && !compact ? "bodyStrong" : "caption"}
							tabular
							color={d.cancelled ? "inkSubtle" : i === 0 ? "ink" : "inkMuted"}
							style={d.cancelled ? { textDecorationLine: "line-through" } : live ? { color: theme.colors.live } : null}
						>
							{label}
						</Text>
					</View>
				))}
			</View>
		</View>
	)
	const label = t("stop.a11yDeparture", { line: group.route.shortName, headsign: group.headsign, when: a11y })
	if (!onPress)
		return (
			<View accessible accessibilityLabel={label}>
				{body}
			</View>
		)
	return (
		<Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => pressed && { backgroundColor: theme.colors.surfaceMuted }}>
			{body}
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
	compact: { paddingHorizontal: 0, paddingVertical: 6, minHeight: 36, gap: 8 },
	headsign: { flex: 1 },
	times: { flexDirection: "row", alignItems: "center", gap: 10 },
	time: { flexDirection: "row", alignItems: "center", gap: 4 },
})
