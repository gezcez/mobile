// City sheet (plan 3.2): switch city in one tap, turn networks of the current city on or off, and
// the auto-switch suggestion toggle. `?cityId=` (from gezcez://city/<slug>) preselects a city.

import { router, useLocalSearchParams } from "expo-router"
import { useEffect } from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { CityPicker } from "@/features/city/CityPicker"
import { prefetchCity } from "@/features/city/prefetch"
import { useCityStore } from "@/features/city/useCityStore"
import { useCities, useCurrentCity, useCurrentNetworks } from "@/features/network/hooks"
import { NetworkBadge } from "@/features/network/NetworkBadge"
import { pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { useLocationStore } from "@/lib/location"
import { Banner } from "@/ui/Banner"
import { Button } from "@/ui/Button"
import { Card } from "@/ui/Card"
import { Divider } from "@/ui/ListRow"
import { SectionHeader } from "@/ui/SectionHeader"
import { Heading, Text } from "@/ui/Text"
import { toast } from "@/ui/Toast"
import { ToggleRow } from "@/ui/Toggle"

export default function CitySheet() {
	const { cityId: linked } = useLocalSearchParams<{ cityId?: string }>()
	const { t } = useT()
	const cities = useCities()
	const current = useCurrentCity().data
	const { all, networks } = useCurrentNetworks()
	const disabled = useCityStore((s) => s.disabledNetworkIds)
	const autoSwitch = useCityStore((s) => s.autoSwitch)
	const fix = useLocationStore((s) => s.fix)
	const linkedCity = linked && linked !== current?.id ? cities.data?.find((c) => c.id === linked) : null

	const switchTo = (id: string) => {
		if (id !== current?.id) {
			useCityStore.getState().setCity(id)
			void prefetchCity(id).catch(() => undefined)
		}
		router.back()
	}

	useEffect(() => {
		if (linked && cities.data && !cities.data.some((c) => c.id === linked)) toast(t("errors:NOT_FOUND"))
	}, [linked, cities.data, t])

	return (
		<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
			<Heading level={3}>{t("city.title")}</Heading>
			{linkedCity ? (
				<Banner
					tone="navy"
					title={t("city.suggest", { city: pickName(linkedCity.name) })}
					action={<Button label={t("city.switch")} variant="accent" size="sm" onPress={() => switchTo(linkedCity.id)} />}
				/>
			) : null}

			{all.length > 1 ? (
				<>
					<SectionHeader eyebrow={current ? pickName(current.name) : undefined} title={t("city.networks")} />
					<Text variant="caption" color="inkMuted" style={styles.hint}>
						{t("city.networksHint")}
					</Text>
					<Card padded={false}>
						{all.map((n, i) => {
							const on = !disabled.includes(n.id)
							return (
								<View key={n.id}>
									{i > 0 ? <Divider inset={16} /> : null}
									<View style={styles.network}>
										<ToggleRow
											label={n.name}
											description={n.operatorName ?? undefined}
											value={on}
											onChange={(v) => {
												if (!v && networks.length <= 1) {
													toast(t("city.atLeastOne"))
													return
												}
												useCityStore.getState().setNetworkEnabled(n.id, v)
											}}
										/>
										{n.status !== "active" ? <NetworkBadge name={t(`network.status.${n.status}`)} /> : null}
									</View>
								</View>
							)
						})}
					</Card>
				</>
			) : null}

			<SectionHeader title={t("city.current")} />
			{cities.data ? <CityPicker cities={cities.data} selectedId={current?.id ?? null} fix={fix} onSelect={(c) => switchTo(c.id)} /> : null}

			<Card padded={false}>
				<ToggleRow
					label={t("settings.autoSwitch")}
					description={t("settings.autoSwitchBody")}
					value={autoSwitch}
					onChange={(v) => useCityStore.getState().setAutoSwitch(v)}
				/>
			</Card>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	content: { padding: 16, gap: 8, paddingBottom: 48 },
	hint: { paddingHorizontal: 4, paddingBottom: 8 },
	network: { paddingBottom: 8, paddingHorizontal: 0, gap: 4 },
})
