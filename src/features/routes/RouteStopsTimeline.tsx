// RouteStopsTimeline.tsx
// Ordered stops on a vertical line in the route colour, live vehicles placed between stops by
// stop_seq, the stop nearest the rider highlighted.

import { router } from "expo-router"
import { Accessibility, Bus } from "lucide-react-native"
import { Fragment } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import type { RouteStop } from "@/api/types"
import { useT } from "@/i18n/useT"
import { colorOr } from "@/lib/color"
import { useTheme } from "@/theme/theme"
import { Text } from "@/ui/Text"
import type { PlacedVehicle } from "./geometry"

export function RouteStopsTimeline({
	networkId,
	stops,
	color,
	placed,
	nearestIndex,
	onPressVehicle,
	onLayoutNearest,
}: {
	networkId: string
	stops: readonly RouteStop[]
	color: string | null
	placed: readonly PlacedVehicle[]
	nearestIndex: number | null
	onPressVehicle?: (id: string) => void
	onLayoutNearest?: (y: number) => void
}) {
	const { t } = useT()
	const theme = useTheme()
	const line = colorOr(color, theme.colors.accent)
	const byIndex = new Map<number, PlacedVehicle[]>()
	for (const p of placed) byIndex.set(p.index, [...(byIndex.get(p.index) ?? []), p])

	return (
		<View>
			{stops.map((s, i) => {
				const here = byIndex.get(i) ?? []
				const between = here.filter((p) => !p.atStop)
				const at = here.filter((p) => p.atStop)
				const nearest = i === nearestIndex
				return (
					<Fragment key={`${s.id}-${s.seq}`}>
						{between.map((p) => (
							<VehicleChip key={p.vehicle.id} p={p} line={line} label={t("route.a11yVehicleBetween")} onPress={onPressVehicle} />
						))}
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={nearest ? `${s.name}, ${t("route.youAreNear")}` : s.name}
							onPress={() => router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId, stopId: s.id } })}
							onLayout={nearest ? (e) => onLayoutNearest?.(e.nativeEvent.layout.y) : undefined}
							style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.colors.surfaceMuted }]}
						>
							<View style={styles.rail}>
								<View style={[styles.segment, { backgroundColor: i === 0 ? "transparent" : line }]} />
								<View
									style={[
										styles.dot,
										{ borderColor: line, backgroundColor: nearest ? line : theme.colors.surface },
										(i === 0 || i === stops.length - 1) && styles.terminus,
									]}
								/>
								<View style={[styles.segment, { backgroundColor: i === stops.length - 1 ? "transparent" : line }]} />
							</View>
							<View style={styles.label}>
								<Text variant={nearest || i === 0 || i === stops.length - 1 ? "bodyStrong" : "body"} numberOfLines={2}>
									{s.name}
								</Text>
								{nearest ? (
									<Text variant="caption" color="eyebrow">
										{t("route.youAreNear")}
									</Text>
								) : null}
								{at.map((p) => (
									<VehicleChip key={p.vehicle.id} p={p} line={line} inline label={t("route.atStop", { stop: s.name })} onPress={onPressVehicle} />
								))}
							</View>
						</Pressable>
					</Fragment>
				)
			})}
		</View>
	)
}

function VehicleChip({ p, line, label, inline, onPress }: { p: PlacedVehicle; line: string; label: string; inline?: boolean; onPress?: (id: string) => void }) {
	const theme = useTheme()
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={() => onPress?.(p.vehicle.id)}
			style={[styles.vehicle, inline && styles.vehicleInline]}
		>
			{inline ? null : <View style={[styles.vehicleRail, { backgroundColor: line }]} />}
			<View style={[styles.vehicleBadge, { backgroundColor: line, opacity: p.vehicle.stale ? 0.5 : 1 }]}>
				<Bus size={14} color={theme.colors.bg} />
				{p.vehicle.accessible ? <Accessibility size={12} color={theme.colors.bg} /> : null}
			</View>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: "row", alignItems: "stretch", minHeight: 48, paddingRight: 16 },
	rail: { width: 48, alignItems: "center" },
	segment: { width: 4, flex: 1 },
	dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
	terminus: { width: 18, height: 18, borderRadius: 9 },
	label: { flex: 1, justifyContent: "center", paddingVertical: 8, gap: 2 },
	vehicle: { flexDirection: "row", alignItems: "center", height: 28 },
	vehicleInline: { height: 26 },
	vehicleRail: { position: "absolute", left: 22, width: 4, top: 0, bottom: 0 },
	vehicleBadge: { marginLeft: 12, flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, height: 24, borderRadius: 12 },
})
