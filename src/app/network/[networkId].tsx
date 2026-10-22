// Network info (plan 5.14): status, data source and licence, freshness, what works here, and the
// operator privacy table: the www privacy pillar inside the app.

import { router, useLocalSearchParams } from "expo-router"
import { Check, ExternalLink, Minus } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import type { Capabilities } from "@/api/types"
import { capabilityOn, useNetwork } from "@/features/network/hooks"
import { NetworkStatusBanner } from "@/features/network/StatusBanners"
import { pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { openInApp } from "@/lib/links"
import { toMs } from "@/lib/time"
import { useAgoText } from "@/lib/useAgoText"
import { useNow } from "@/lib/useNow"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"
import { SkeletonRows } from "@/ui/Skeleton"
import { ErrorState } from "@/ui/States"
import { Text } from "@/ui/Text"

const FEATURES: { key: keyof Capabilities; label: "realtimeVehicles" | "realtimeDepartures" | "timetables" | "alerts" | "card" }[] = [
	{ key: "realtimeVehicles", label: "realtimeVehicles" },
	{ key: "realtimeDepartures", label: "realtimeDepartures" },
	{ key: "timetables", label: "timetables" },
	{ key: "alerts", label: "alerts" },
	{ key: "card", label: "card" },
]

export default function NetworkInfoScreen() {
	const { networkId } = useLocalSearchParams<{ networkId: string }>()
	const { t } = useT()
	const theme = useTheme()
	const now = useNow(60_000)
	const agoText = useAgoText()
	const q = useNetwork(networkId)
	const n = q.data

	if (!n)
		return (
			<Screen back title={t("network.title")}>
				{q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <SkeletonRows count={6} />}
			</Screen>
		)

	return (
		<Screen back title={n.name} eyebrow={t("network.title")}>
			<View style={styles.status}>
				<View style={[styles.dot, { backgroundColor: n.status === "active" ? theme.colors.success : n.status === "degraded" ? theme.colors.cta : theme.colors.danger }]} />
				<Text variant="bodyStrong">{t(`network.status.${n.status}`)}</Text>
			</View>
			<NetworkStatusBanner network={n} />

			<SectionHeader title={t("network.dataSource")} />
			<Card style={styles.card}>
				{n.operatorName ? (
					<Text>
						<Text variant="bodyStrong">{t("network.operator")}</Text>
						{`: ${n.operatorName}`}
					</Text>
				) : null}
				<Text>{n.attribution.text}</Text>
				{n.attribution.licence ? (
					<Text variant="caption" color="inkMuted">
						{n.attribution.licence}
					</Text>
				) : null}
				{n.freshness.staticSyncedAt ? (
					<Text variant="caption" color="inkMuted">
						{t("network.lastUpdate", { ago: agoText(toMs(n.freshness.staticSyncedAt), now) })}
					</Text>
				) : null}
				{n.attribution.url ? (
					<Button
						label={t("common:actions.open")}
						variant="secondary"
						size="sm"
						icon={<ExternalLink size={16} color={theme.colors.ink} />}
						onPress={() => void openInApp(n.attribution.url!)}
					/>
				) : null}
			</Card>

			<SectionHeader title={t("network.features")} />
			<Card padded={false} style={styles.card}>
				{FEATURES.map((f, i) => {
					const on = capabilityOn(n, f.key)
					return (
						<View key={f.key}>
							{i > 0 ? <Divider inset={16} /> : null}
							<ListRow
								title={t(`network.featureNames.${f.label}`)}
								subtitle={on ? t("network.available") : t("network.unavailable")}
								trailing={on ? <Check size={20} color={theme.colors.success} /> : <Minus size={20} color={theme.colors.inkSubtle} />}
							/>
						</View>
					)
				})}
			</Card>
			{capabilityOn(n, "alerts") ? (
				<View style={styles.card}>
					<Button
						label={t("network.alerts")}
						variant="secondary"
						onPress={() => router.push({ pathname: "/alerts/[networkId]", params: { networkId: n.id } })}
					/>
				</View>
			) : null}

			{n.privacy.providers.map((p) => (
				<View key={p.name}>
					<SectionHeader eyebrow={t("privacy.operators")} title={t("network.operatorPrivacy", { operator: p.name })} />
					<Card padded={false} style={styles.card}>
						{p.pulledData.map((d, i) => (
							<View key={d.key}>
								{i > 0 ? <Divider inset={16} /> : null}
								<ListRow title={pickName(d.label)} subtitle={d.canOptOut ? t("network.canOptOut") : t("network.cannotOptOut")} />
							</View>
						))}
					</Card>
					{p.optOutUrl ? (
						<View style={styles.card}>
							<Button label={t("network.optOut")} variant="secondary" onPress={() => void openInApp(p.optOutUrl!)} />
						</View>
					) : null}
				</View>
			))}
		</Screen>
	)
}

const styles = StyleSheet.create({
	status: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 4 },
	dot: { width: 10, height: 10, borderRadius: 5 },
	card: { marginHorizontal: 16, gap: 8, marginTop: 4 },
})
