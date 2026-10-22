// City step (plan 5.1): the detected city as a card with Start, or the picker. Analytics consent
// line, then prefetch of the manifest and packs (cancellable) before entering the app.

import { useLocalSearchParams } from "expo-router"
import { MapPinned } from "lucide-react-native"
import { useEffect, useMemo, useRef, useState } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import type { City } from "@/api/types"
import { CityPicker } from "@/features/city/CityPicker"
import { prefetchCity } from "@/features/city/prefetch"
import { resolveCity } from "@/features/city/resolveCity"
import { useCityStore } from "@/features/city/useCityStore"
import { useCities } from "@/features/network/hooks"
import { usePrefsStore } from "@/features/settings/usePrefsStore"
import { pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { useLocationStore } from "@/lib/location"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState } from "@/ui/States"
import { Eyebrow, Heading, Text } from "@/ui/Text"
import { ToggleRow } from "@/ui/Toggle"

export default function CityStep() {
	const { pick } = useLocalSearchParams<{ pick?: string }>()
	const { t } = useT()
	const theme = useTheme()
	const cities = useCities()
	const fix = useLocationStore((s) => s.fix)
	const locating = useLocationStore((s) => s.locating)
	const analytics = usePrefsStore((s) => s.analytics)
	const setAnalytics = usePrefsStore((s) => s.setAnalytics)
	const [chosen, setChosen] = useState<City | null>(null)
	const [picking, setPicking] = useState(pick === "1")
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
	const abort = useRef<AbortController | null>(null)

	const detected = useMemo(() => (fix && cities.data ? resolveCity(cities.data, fix.lat, fix.lon) : null), [fix, cities.data])
	const city = chosen ?? (picking ? null : detected)
	const showPicker = picking || (!detected && !locating && !!cities.data)

	useEffect(() => () => abort.current?.abort(), [])

	const start = async () => {
		if (!city) return
		useCityStore.getState().setCity(city.id)
		useCityStore.getState().markResolved()
		const ctrl = new AbortController()
		abort.current = ctrl
		setProgress({ done: 0, total: 0 })
		try {
			await prefetchCity(city.id, (done, total) => setProgress({ done, total }), ctrl.signal)
		} catch {
			// fallbacks cover a failed prefetch
		}
		if (ctrl.signal.aborted) return
		// The root Stack.Protected guard moves to the tabs once onboarded flips.
		usePrefsStore.getState().setOnboarded(true)
	}

	const skipPrefetch = () => {
		abort.current?.abort()
		usePrefsStore.getState().setOnboarded(true)
	}

	if (cities.error && !cities.data)
		return (
			<SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
				<EmptyState
					title={t("onboarding.city.firstLaunchOffline")}
					action={<Button label={t("common:actions.retry")} onPress={() => void cities.refetch()} />}
				/>
			</SafeAreaView>
		)

	return (
		<SafeAreaView style={[styles.root, { backgroundColor: theme.colors.bg }]} edges={["top", "bottom"]}>
			<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				{cities.isLoading || (locating && !picking && !chosen) ? (
					<>
						<Heading level={1}>{t("onboarding.city.detecting")}</Heading>
						<SkeletonRows count={3} />
					</>
				) : null}

				{city && !showPicker ? (
					<Card tone="inverse" style={styles.detected}>
						<MapPinned size={28} color={theme.colors.cta} />
						<Text variant="title" style={{ color: theme.colors.inkInverse }}>
							{t("onboarding.city.detected", { city: pickName(city.name) })}
						</Text>
						<Text style={{ color: theme.colors.inkInverse, opacity: 0.8 }}>{t("onboarding.city.networks", { count: city.networks.length })}</Text>
					</Card>
				) : null}

				{showPicker && cities.data ? (
					<>
						<Heading level={1}>{t("onboarding.city.pick")}</Heading>
						{!picking && !detected ? <Text color="inkMuted">{t("onboarding.city.notFound")}</Text> : null}
						<CityPicker
							cities={cities.data}
							selectedId={chosen?.id ?? null}
							fix={fix}
							onSelect={(c) => {
								setChosen(c)
								setPicking(false)
							}}
						/>
					</>
				) : null}
			</ScrollView>

			<View style={[styles.bottom, { borderTopColor: theme.colors.border }]}>
				<ToggleRow label={t("onboarding.city.analytics")} description={t("onboarding.city.analyticsHint")} value={analytics} onChange={setAnalytics} />
				{progress && city ? (
					<View style={styles.progress} accessibilityLiveRegion="polite">
						<Eyebrow>{t("onboarding.city.prefetch", { city: pickName(city.name) })}</Eyebrow>
						<Text variant="caption" color="inkMuted" tabular>
							{progress.total ? `${progress.done} / ${progress.total}` : t("common:state.loading")}
						</Text>
						<Button label={t("common:actions.skip")} variant="ghost" size="sm" onPress={skipPrefetch} />
					</View>
				) : (
					<>
						<Button testID="onboarding-city-start" label={t("onboarding.city.start")} variant="accent" fullWidth disabled={!city} onPress={() => void start()} />
						{city && !showPicker ? (
							<Button label={t("onboarding.city.other")} variant="secondary" fullWidth onPress={() => setPicking(true)} />
						) : null}
					</>
				)}
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	content: { padding: 24, gap: 16 },
	detected: { gap: 10, padding: 24, borderRadius: 24 },
	bottom: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
	progress: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
})
