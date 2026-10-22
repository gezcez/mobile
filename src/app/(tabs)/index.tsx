// Home (plan 5.2): city chip and alerts bell; announcement, city suggestion and network banners;
// saved stops with next departures; nearby stops from the pack with the location states.

import { useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { Bell, ChevronDown, Map as MapIcon, MapPin, Search } from "lucide-react-native"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAlertCount } from "@/features/alerts/useAlertCount"
import { useCitySuggestion } from "@/features/city/useCitySuggestion"
import { SavedStopsStrip, useSavedStops } from "@/features/favourites/SavedStopsStrip"
import { NearbyRow } from "@/features/nearby/NearbyRow"
import { useNearby } from "@/features/nearby/useNearby"
import { useAppConfig, useCurrentCity, useCurrentNetworks } from "@/features/network/hooks"
import { NetworkStatusBanner, OfflineBanner } from "@/features/network/StatusBanners"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { getFix, refreshPermission, requestPermission, useLocationStore } from "@/lib/location"
import { useNow } from "@/lib/useNow"
import { useTheme } from "@/theme/theme"
import { Banner } from "@/ui/Banner"
import { Button, IconButton } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Divider } from "@/ui/ListRow"
import { SectionHeader } from "@/ui/SectionHeader"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState } from "@/ui/States"
import { Text } from "@/ui/Text"

const DEFAULT_TZ = "Europe/Istanbul"

export default function HomeScreen() {
	const { t } = useT()
	const theme = useTheme()
	const qc = useQueryClient()
	const now = useNow()
	const city = useCurrentCity().data
	const { networks, all } = useCurrentNetworks()
	const tz = city?.timezone ?? networks[0]?.timezone ?? DEFAULT_TZ
	const config = useAppConfig().data
	const dismissed = usePrefsStore((s) => s.dismissedAnnouncement)
	const permission = useLocationStore((s) => s.permission)
	const canAskAgain = useLocationStore((s) => s.canAskAgain)
	const fix = useLocationStore((s) => s.fix)
	const locating = useLocationStore((s) => s.locating)
	const nearby = useNearby(networks, fix)
	const networkIds = useMemo(() => all.map((n) => n.id), [all])
	const saved = useSavedStops(networkIds)
	const alerts = useAlertCount(networks)
	const suggestion = useCitySuggestion()
	const [refreshing, setRefreshing] = useState(false)
	const multi = networks.length > 1

	useEffect(() => {
		void refreshPermission().then((p) => (p === "granted" ? getFix() : null))
	}, [])

	const refresh = useCallback(async () => {
		setRefreshing(true)
		await Promise.allSettled([getFix(), qc.invalidateQueries({ predicate: (q) => q.queryKey.includes("departures") })])
		setRefreshing(false)
	}, [qc])

	const announcement = config?.announcement && config.announcement.id !== dismissed ? config.announcement : null

	return (
		<SafeAreaView edges={["top"]} style={[styles.root, { backgroundColor: theme.colors.bg }]}>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t("home.changeCity", { city: city ? pickName(city.name) : "" })}
					onPress={() => router.push("/city")}
					style={[styles.cityChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
				>
					<MapPin size={16} color={theme.colors.accent} />
					<Text variant="bodyStrong" numberOfLines={1}>
						{city ? pickName(city.name) : t("home.chooseCity")}
					</Text>
					<ChevronDown size={16} color={theme.colors.inkMuted} />
				</Pressable>
				{alerts.firstNetworkId ? (
					<View>
						<IconButton
							label={t("home.alerts", { count: alerts.count })}
							icon={<Bell size={22} color={theme.colors.ink} />}
							onPress={() => router.push({ pathname: "/alerts/[networkId]", params: { networkId: alerts.firstNetworkId! } })}
						/>
						{alerts.count > 0 ? (
							<View style={[styles.count, { backgroundColor: theme.colors.cta }]} pointerEvents="none">
								<Text variant="caption" style={{ color: theme.colors.onCta, fontSize: 11 }}>
									{String(alerts.count)}
								</Text>
							</View>
						) : null}
					</View>
				) : null}
			</View>

			<ScrollView
				contentContainerStyle={styles.content}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={theme.colors.accent} />}
			>
				<View style={styles.banners}>
					{suggestion.city ? (
						<Banner
							tone="navy"
							title={t("city.suggest", { city: pickName(suggestion.city.name) })}
							onDismiss={suggestion.dismiss}
							action={<Button label={t("city.switch")} variant="accent" size="sm" onPress={suggestion.accept} />}
						/>
					) : null}
					{announcement ? (
						<Banner
							tone={announcement.level === "warning" ? "warning" : "info"}
							title={pickName(announcement.title)}
							body={pickName(announcement.body)}
							onDismiss={() => usePrefsStore.getState().dismissAnnouncement(announcement.id)}
						/>
					) : null}
				</View>
				{networks.map((n) => (
					<NetworkStatusBanner key={n.id} network={n} />
				))}
				<OfflineBanner />

				{saved.length ? (
					<>
						<SectionHeader eyebrow={t("home.saved")} />
						<SavedStopsStrip stops={saved} nowMs={now} timeZone={tz} />
					</>
				) : null}

				<SectionHeader eyebrow={t("home.nearby")} />
				{permission !== "granted" ? (
					<Card style={styles.card}>
						<Text variant="heading">{t("home.noLocationTitle")}</Text>
						<Text color="inkMuted">{t("home.noLocationBody")}</Text>
						<View style={styles.actions}>
							{canAskAgain ? (
								<Button
									label={t("home.allowLocation")}
									size="sm"
									onPress={() => void requestPermission().then((p) => (p === "granted" ? getFix() : null))}
								/>
							) : (
								<Button label={t("home.openSettings")} size="sm" onPress={() => void Linking.openSettings()} />
							)}
							<Button
								label={t("home.searchStops")}
								variant="secondary"
								size="sm"
								icon={<Search size={16} color={theme.colors.ink} />}
								onPress={() => router.push({ pathname: "/search", params: { focus: "1" } })}
							/>
						</View>
					</Card>
				) : nearby.state === "loading" || (nearby.state === "no-fix" && locating) ? (
					<Card padded={false} style={styles.card}>
						<Text variant="caption" color="inkMuted" style={styles.loadingLine}>
							{t("home.packLoading", { city: city ? pickName(city.name) : "" })}
						</Text>
						<SkeletonRows count={4} />
					</Card>
				) : nearby.state === "ready" ? (
					<Card padded={false} style={styles.card}>
						{nearby.items.map((item, i) => (
							<View key={`${item.stop.networkId}:${item.stop.id}`}>
								{i > 0 ? <Divider inset={16} /> : null}
								<NearbyRow
									item={item}
									nowMs={now}
									timeZone={tz}
									withDepartures={i < 3}
									networkName={multi ? networks.find((n) => n.id === item.stop.networkId)?.name : null}
								/>
							</View>
						))}
					</Card>
				) : (
					<Card style={styles.card}>
						<EmptyState
							title={t("home.noStopsNearby")}
							action={<Button label={t("home.openMap")} variant="secondary" size="sm" icon={<MapIcon size={16} color={theme.colors.ink} />} onPress={() => router.push("/map")} />}
						/>
					</Card>
				)}
			</ScrollView>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 },
	cityChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 44, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, flexShrink: 1 },
	count: { position: "absolute", top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
	content: { paddingBottom: 40 },
	banners: { gap: 8, paddingHorizontal: 16, paddingTop: 8 },
	card: { marginHorizontal: 16, gap: 8 },
	actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
	loadingLine: { paddingHorizontal: 16, paddingTop: 12 },
})
