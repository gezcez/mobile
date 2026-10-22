// CardsStrip.tsx
// Home's cards strip (plan 5.2): saved cards of the current city's networks with their last known
// balance; tapping opens the card. Renders nothing when cards are switched off or none are saved.

import { router } from "expo-router"
import { ScrollView, StyleSheet } from "react-native"
import { useT } from "@/i18n/useT"
import { SectionHeader } from "@/ui/SectionHeader"
import { CardTile } from "./CardTile"
import { useCardsAvailability } from "./useCardsAvailability"
import { useCardsStore } from "./useCardsStore"

export function CardsStrip() {
	const { t } = useT()
	const { visible, capable } = useCardsAvailability()
	const all = useCardsStore((s) => s.cards)
	if (!visible) return null
	const cards = all.filter((c) => capable.some((n) => n.id === c.networkId))
	if (cards.length === 0) return null
	return (
		<>
			<SectionHeader eyebrow={t("home.cards")} />
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
				{cards.map((c) => {
					const n = capable.find((x) => x.id === c.networkId)!
					return (
						<CardTile
							key={c.id}
							compact
							card={c}
							networkName={n.name}
							networkColor={n.color}
							timeZone={n.timezone}
							onPress={() => router.push({ pathname: "/card/[cardId]", params: { cardId: c.id } })}
						/>
					)
				})}
			</ScrollView>
		</>
	)
}

const styles = StyleSheet.create({
	row: { gap: 12, paddingHorizontal: 16 },
})
