// rows.tsx
// Result rows shared by Search, recents and Home: a route (badge + long name) and a stop (name,
// code, distance) with a network badge when several networks are on.

import { router } from "expo-router"
import { Clock, MapPin } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import type { Mode } from "@/api/types"
import { NetworkBadge } from "@/features/network/NetworkBadge"
import { useT } from "@/i18n/useT"
import { formatDistance, walkMinutes } from "@/lib/format"
import { useTheme } from "@/theme/theme"
import { ListRow } from "@/ui/ListRow"
import { RouteBadge } from "@/ui/RouteBadge"

export function RouteRow({
	route,
	networkName,
	recent,
	onOpen,
}: {
	route: { id: string; networkId: string; shortName: string; longName: string; mode: Mode; color: string | null; textColor: string | null }
	networkName?: string | null
	recent?: boolean
	onOpen?: () => void
}) {
	const theme = useTheme()
	return (
		<ListRow
			title={route.longName || route.shortName}
			leading={
				<View style={styles.lead}>
					{recent ? <Clock size={14} color={theme.colors.iconSubtle} /> : null}
					<RouteBadge shortName={route.shortName} color={route.color} textColor={route.textColor} mode={route.mode} />
				</View>
			}
			trailing={networkName ? <NetworkBadge name={networkName} /> : null}
			accessibilityLabel={`${route.shortName}, ${route.longName}`}
			onPress={() => {
				onOpen?.()
				router.push({ pathname: "/route/[networkId]/[routeId]", params: { networkId: route.networkId, routeId: route.id } })
			}}
		/>
	)
}

export function StopRow({
	stop,
	distanceM,
	networkName,
	recent,
	onOpen,
}: {
	stop: { id: string; networkId: string; name: string; code: string | null }
	distanceM?: number | null
	networkName?: string | null
	recent?: boolean
	onOpen?: () => void
}) {
	const { t, i18n } = useT()
	const theme = useTheme()
	const parts: string[] = []
	if (stop.code) parts.push(t("stop.code", { code: stop.code }))
	if (distanceM != null) {
		const d = formatDistance(distanceM, i18n.language)
		parts.push(t("home.walk", { distance: t(`common:distance.${d.unit}`, { value: d.value }), minutes: walkMinutes(distanceM) }))
	}
	return (
		<ListRow
			title={stop.name}
			subtitle={parts.join(" · ") || null}
			leading={recent ? <Clock size={18} color={theme.colors.iconSubtle} /> : <MapPin size={18} color={theme.colors.accent} />}
			trailing={networkName ? <NetworkBadge name={networkName} /> : null}
			onPress={() => {
				onOpen?.()
				router.push({ pathname: "/stop/[networkId]/[stopId]", params: { networkId: stop.networkId, stopId: stop.id } })
			}}
		/>
	)
}

const styles = StyleSheet.create({ lead: { flexDirection: "row", alignItems: "center", gap: 6 } })
