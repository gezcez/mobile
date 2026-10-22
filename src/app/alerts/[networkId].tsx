// Service alerts (plan 5.15): title, affected routes as badges, period and body.

import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { Info, OctagonAlert, TriangleAlert } from "lucide-react-native"
import { useMemo } from "react"
import { RefreshControl, StyleSheet, View } from "react-native"
import { alertsQuery } from "@/api/queries/transit"
import { useNetwork } from "@/features/network/hooks"
import { useT } from "@/i18n/useT"
import { openInApp } from "@/lib/links"
import { dateIn, toMs } from "@/lib/time"
import { usePackIndexes } from "@/pack/packStore"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { RouteBadge } from "@/ui/RouteBadge"
import { Screen } from "@/ui/Screen"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState, ErrorState } from "@/ui/States"
import { Text } from "@/ui/Text"

export default function AlertsScreen() {
	const { networkId } = useLocalSearchParams<{ networkId: string }>()
	const { t } = useT()
	const theme = useTheme()
	const network = useNetwork(networkId).data
	const alerts = useQuery(alertsQuery(networkId))
	const nets = useMemo(() => (network ? [network] : []), [network])
	const { indexes } = usePackIndexes(nets)
	const tz = network?.timezone ?? "Europe/Istanbul"
	const routeById = indexes[0]?.routeById

	return (
		<Screen
			back
			title={t("alerts.title")}
			eyebrow={network?.name}
			refreshControl={<RefreshControl refreshing={alerts.isRefetching} onRefresh={() => void alerts.refetch()} tintColor={theme.colors.accent} />}
		>
			{alerts.isLoading ? (
				<SkeletonRows count={4} />
			) : alerts.error && !alerts.data ? (
				<ErrorState error={alerts.error} onRetry={() => void alerts.refetch()} />
			) : !alerts.data?.length ? (
				<EmptyState icon={<Info size={28} color={theme.colors.accent} />} title={t("alerts.none")} />
			) : (
				<View style={styles.list}>
					{alerts.data.map((a) => {
						const Icon = a.severity === "severe" ? OctagonAlert : a.severity === "warning" ? TriangleAlert : Info
						return (
							<Card key={a.id} style={styles.card}>
								<View style={styles.title}>
									<Icon size={20} color={a.severity === "info" ? theme.colors.accent : a.severity === "severe" ? theme.colors.danger : theme.colors.cta} />
									<Text variant="heading" style={styles.flex}>
										{a.title}
									</Text>
								</View>
								{a.routeIds.length ? (
									<View style={styles.badges} accessibilityLabel={t("alerts.affects")}>
										{a.routeIds.map((id) => {
											const r = routeById?.get(id)
											return <RouteBadge key={id} shortName={r?.shortName ?? id} color={r?.color ?? null} textColor={r?.textColor} mode={r?.mode} size="sm" />
										})}
									</View>
								) : null}
								{a.activeTo ? (
									<Text variant="caption" color="inkMuted">
										{t("alerts.until", { date: dateIn(toMs(a.activeTo), tz) })}
									</Text>
								) : null}
								<Text>{a.body}</Text>
								{a.url ? <Button label={t("common:actions.open")} variant="secondary" size="sm" onPress={() => void openInApp(a.url!)} /> : null}
							</Card>
						)
					})}
				</View>
			)}
		</Screen>
	)
}

const styles = StyleSheet.create({
	list: { gap: 12, paddingHorizontal: 16, paddingTop: 8 },
	card: { gap: 8 },
	title: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
	flex: { flex: 1 },
	badges: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
})
