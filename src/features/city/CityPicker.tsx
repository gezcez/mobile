// CityPicker.tsx
// Searchable city list: by distance when a fix exists, else alphabetically (plan 3.2, step 2).

import { Check } from "lucide-react-native"
import { useMemo, useState } from "react"
import { StyleSheet, View } from "react-native"
import type { City } from "@/api/types"
import { currentLanguage, pickName } from "@/i18n"
import { useT } from "@/i18n/useT"
import { fold } from "@/pack/normalise"
import { useTheme } from "@/theme/theme"
import { Card } from "@/ui/Card"
import { Divider, ListRow } from "@/ui/ListRow"
import { EmptyState } from "@/ui/States"
import { TextField } from "@/ui/TextField"
import { sortCities } from "./resolveCity"

export function CityPicker({
	cities,
	selectedId,
	fix,
	onSelect,
}: {
	cities: readonly City[]
	selectedId: string | null
	fix?: { lat: number; lon: number } | null
	onSelect: (city: City) => void
}) {
	const { t } = useT()
	const theme = useTheme()
	const [q, setQ] = useState("")
	const list = useMemo(() => {
		const sorted = sortCities(cities, currentLanguage(), fix)
		const fq = fold(q)
		return fq ? sorted.filter((c) => fold(c.name.tr).includes(fq) || fold(c.name.en).includes(fq)) : sorted
	}, [cities, fix, q])
	return (
		<View style={styles.wrap}>
			{cities.length > 6 ? <TextField placeholder={t("onboarding.city.search")} value={q} onChangeText={setQ} autoCorrect={false} /> : null}
			<Card padded={false}>
				{list.length === 0 ? <EmptyState title={t("onboarding.city.noCities")} /> : null}
				{list.map((c, i) => (
					<View key={c.id}>
						{i > 0 ? <Divider inset={16} /> : null}
						<ListRow
							title={pickName(c.name)}
							subtitle={t("onboarding.city.networks", { count: c.networks.length })}
							trailing={c.id === selectedId ? <Check size={20} color={theme.colors.accent} /> : null}
							onPress={() => onSelect(c)}
						/>
					</View>
				))}
			</Card>
		</View>
	)
}

const styles = StyleSheet.create({ wrap: { gap: 12 } })
