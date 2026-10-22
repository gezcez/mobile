// Search (plan 5.4): routes and stops from the packs, fully offline; mode chips; recents.

import { useLocalSearchParams } from "expo-router"
import { FlashList } from "@shopify/flash-list"
import { Search, X } from "lucide-react-native"
import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native"
import type { Mode } from "@/api/types"
import { useCurrentCityId, useCurrentNetworks } from "@/features/network/hooks"
import { useRecentSearches, recentKey } from "@/features/search/recentSearches"
import { RouteRow, StopRow } from "@/features/search/rows"
import { useSearch, type RouteHit, type StopHit } from "@/features/search/useSearch"
import { useT } from "@/i18n/useT"
import { useLocationStore } from "@/lib/location"
import { distanceM } from "@/features/city/resolveCity"
import { useTheme } from "@/theme/theme"
import { Button } from "@/ui/Button"
import { Chip } from "@/ui/Chip"
import { Divider } from "@/ui/ListRow"
import { Screen } from "@/ui/Screen"
import { SectionHeader } from "@/ui/SectionHeader"
import { SegmentedControl } from "@/ui/SegmentedControl"
import { SkeletonRows } from "@/ui/Skeleton"
import { EmptyState, ErrorState } from "@/ui/States"
import { Text } from "@/ui/Text"

type Tab = "routes" | "stops"

export default function SearchScreen() {
	const { focus } = useLocalSearchParams<{ focus?: string }>()
	const { t } = useT()
	const theme = useTheme()
	const [query, setQuery] = useState("")
	const [tab, setTab] = useState<Tab>("routes")
	const [modes, setModes] = useState<Mode[]>([])
	const cityId = useCurrentCityId()
	const { networks } = useCurrentNetworks()
	const fix = useLocationStore((s) => s.fix)
	const near = useMemo(() => (fix ? { lat: fix.lat, lon: fix.lon } : null), [fix])
	const s = useSearch(query, networks, { cityId, modes, near })
	const recents = useRecentSearches((st) => st.items)
	const push = useRecentSearches((st) => st.push)
	const multi = networks.length > 1
	const netName = (id: string) => (multi ? (networks.find((n) => n.id === id)?.name ?? null) : null)

	const onRoute = (r: RouteHit) => push({ kind: "route", ...r })
	const onStop = (st: StopHit) => push({ kind: "stop", networkId: st.networkId, id: st.id, name: st.name, code: st.code })

	const header = (
		<View style={styles.top}>
			<View style={[styles.field, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderStrong }]}>
				<Search size={18} color={theme.colors.inkMuted} />
				<TextInput
					testID="search-input"
					value={query}
					onChangeText={setQuery}
					placeholder={t("search.placeholder")}
					placeholderTextColor={theme.colors.inkSubtle}
					selectionColor={theme.colors.accent}
					autoFocus={focus === "1"}
					autoCorrect={false}
					autoCapitalize="none"
					returnKeyType="search"
					accessibilityLabel={t("search.placeholder")}
					style={[styles.input, theme.typography.body, { color: theme.colors.ink }]}
				/>
				{query ? (
					<Pressable accessibilityRole="button" accessibilityLabel={t("common:actions.clear")} hitSlop={12} onPress={() => setQuery("")}>
						<X size={18} color={theme.colors.inkMuted} />
					</Pressable>
				) : null}
			</View>
			<SegmentedControl
				options={[
					{ value: "routes", label: t("search.routes") },
					{ value: "stops", label: t("search.stops") },
				]}
				value={tab}
				onChange={setTab}
			/>
			{tab === "routes" && s.modes.length > 1 ? (
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
					<Chip label={t("search.allModes")} selected={modes.length === 0} onPress={() => setModes([])} />
					{s.modes.map((m) => (
						<Chip
							key={m}
							label={t(`common:modes.${m}`)}
							selected={modes.includes(m)}
							onPress={() => setModes(modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m])}
						/>
					))}
				</ScrollView>
			) : null}
			{s.usingServer && s.q ? (
				<Text variant="caption" color="inkSubtle">
					{t("search.serverSearch")}
				</Text>
			) : null}
		</View>
	)

	let body
	if (!s.q) {
		body = recents.length ? (
			<ScrollView keyboardShouldPersistTaps="handled">
				<SectionHeader
					eyebrow={t("search.recent")}
					action={<Button label={t("search.clearRecent")} variant="ghost" size="sm" onPress={() => useRecentSearches.getState().clear()} />}
				/>
				{recents.map((r, i) => (
					<View key={recentKey(r)}>
						{i > 0 ? <Divider inset={16} /> : null}
						{r.kind === "route" ? (
							<RouteRow route={r} recent networkName={netName(r.networkId)} onOpen={() => push(r)} />
						) : (
							<StopRow stop={r} recent networkName={netName(r.networkId)} onOpen={() => push(r)} />
						)}
					</View>
				))}
			</ScrollView>
		) : (
			<EmptyState icon={<Search size={28} color={theme.colors.accent} />} title={t("search.empty")} />
		)
	} else if (s.loading && s.routes.length === 0 && s.stops.length === 0) {
		body = <SkeletonRows count={6} />
	} else if (s.failed) {
		body = <ErrorState error={s.error} />
	} else if (tab === "routes") {
		body = (
			<FlashList
				data={s.routes}
				keyExtractor={(r) => `${r.networkId}:${r.id}`}
				keyboardShouldPersistTaps="handled"
				ItemSeparatorComponent={() => <Divider inset={16} />}
				renderItem={({ item }) => <RouteRow route={item} networkName={netName(item.networkId)} onOpen={() => onRoute(item)} />}
				ListEmptyComponent={<EmptyState title={t("search.noRoutes", { q: s.q })} body={t("search.hintOtherNetworks")} />}
			/>
		)
	} else {
		body = (
			<FlashList
				data={s.stops}
				keyExtractor={(st) => `${st.networkId}:${st.id}`}
				keyboardShouldPersistTaps="handled"
				ItemSeparatorComponent={() => <Divider inset={16} />}
				renderItem={({ item }) => (
					<StopRow
						stop={item}
						networkName={netName(item.networkId)}
						distanceM={near ? distanceM(near.lat, near.lon, item.lat, item.lon) : null}
						onOpen={() => onStop(item)}
					/>
				)}
				ListEmptyComponent={<EmptyState title={t("search.noStops", { q: s.q })} body={t("search.hintOtherNetworks")} />}
			/>
		)
	}

	return (
		<Screen title={t("tabs.search")} scroll={false}>
			{header}
			<View style={styles.body}>{body}</View>
		</Screen>
	)
}

const styles = StyleSheet.create({
	top: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
	field: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, minHeight: 48 },
	input: { flex: 1, paddingVertical: 10 },
	chips: { gap: 8 },
	body: { flex: 1 },
})
